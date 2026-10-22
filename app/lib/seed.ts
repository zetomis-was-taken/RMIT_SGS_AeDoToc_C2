import type { DatabaseSync } from 'node:sqlite'
import { encryptField, sha } from './crypto'

// Demo seed data. Runs on first open and after "Reset demo data".
//
// It deliberately covers every state the UI can render:
//   cases        → assigned / doubly assigned / unassigned
//   requests     → pending (waiting on supervisor or citizen), granted & active,
//                  expired, denied
//   policy       → applied, rejected, pending (partially approved)
//   audit        → a valid hash chain with allows and denials
//   citizens     → income below, exactly at, and above the eligibility threshold

const MIN = 60_000
const HOUR = 60 * MIN

export function seed(d: DatabaseSync): void {
  const has = d.prepare('SELECT COUNT(*) AS n FROM citizens').get() as { n: number }
  if (has.n > 0) return

  const now = Date.now()

  // ---------- citizens (sensitive fields encrypted at rest) ----------
  // [id, name, national id, monthly income, address, health note]
  const people: [string, string, string, number, string, string][] = [
    ['cz-hoa', 'Nguyen Thi Hoa', '079190004711', 9_800_000, '12 Le Loi, Q1, TP.HCM', 'Hypertension'],
    ['cz-nam', 'Tran Van Nam', '079185009022', 31_000_000, '88 Hai Ba Trung, Q3, TP.HCM', 'None'],
    ['cz-lien', 'Pham Thi Lien', '079192001533', 14_500_000, '5 Nguyen Hue, Q1, TP.HCM', 'Diabetes'],
    ['cz-tuan', 'Le Minh Tuan', '079188007644', 15_000_000, '31 Vo Van Tan, Q3, TP.HCM', 'None'],
    ['cz-mai', 'Vo Thi Mai', '079194002855', 22_400_000, '204 Dien Bien Phu, Binh Thanh, TP.HCM', 'Asthma'],
    ['cz-son', 'Do Quang Son', '079187003966', 5_200_000, '9 Phan Xich Long, Phu Nhuan, TP.HCM', 'None'],
  ]
  const ic = d.prepare('INSERT INTO citizens VALUES (?,?,?,?,?,?)')
  for (const [id, name, nid, income, addr, health] of people)
    ic.run(id, encryptField(name), encryptField(nid), encryptField(String(income)), encryptField(addr), encryptField(health))

  // ---------- cases ----------
  const cases: [string, string, string, string, string][] = [
    ['C-1001', 'cz-hoa', 'housing_subsidy', 'Housing subsidy application #1001', 'open'],
    ['C-1002', 'cz-nam', 'housing_subsidy', 'Housing subsidy application #1002', 'open'],
    ['C-1003', 'cz-lien', 'housing_subsidy', 'Housing subsidy application #1003', 'open'],
    ['C-1004', 'cz-tuan', 'utility_relief', 'Utility relief application #1004', 'open'],
    ['C-1005', 'cz-mai', 'housing_subsidy', 'Housing subsidy application #1005', 'open'],
    ['C-1006', 'cz-son', 'utility_relief', 'Utility relief application #1006', 'open'],
  ]
  const cc = d.prepare('INSERT INTO cases VALUES (?,?,?,?,?)')
  for (const c of cases) cc.run(...c)

  // ---------- assignments (effective policy) ----------
  // C-1005 and C-1006 are deliberately unassigned, so the admin can propose a change.
  const assignments: [string, string][] = [
    ['C-1001', 'officer_an'],
    ['C-1002', 'officer_binh'],
    ['C-1003', 'officer_an'],
    ['C-1003', 'officer_binh'], // the applied policy change below
    ['C-1004', 'officer_binh'],
  ]
  const ac = d.prepare('INSERT INTO assignments VALUES (?,?)')
  for (const a of assignments) ac.run(...a)

  d.prepare('INSERT INTO settings VALUES (?,?)').run('policy_quorum', '2')
  d.prepare('INSERT INTO settings VALUES (?,?)').run('income_threshold', '15000000')

  // ---------- consent requests ----------
  // [id, case, requester, kind, purpose, status, created, expires]
  const requests: [number, string, string, string, string, string, number, number][] = [
    [1, 'C-1001', 'officer_an', 'full_view', 'Verify income for subsidy #1001', 'granted', now - 50 * MIN, now + 8 * MIN],
    [2, 'C-1003', 'officer_an', 'full_view', 'Cross-check dependants for subsidy #1003', 'pending', now - 25 * MIN, 0],
    [3, 'C-1002', 'officer_binh', 'full_view', 'Verify income for subsidy #1002', 'pending', now - 20 * MIN, 0],
    [4, 'C-1002', 'agencyb_lan', 'eligibility_check', 'Housing benefit eligibility (B)', 'granted', now - 35 * MIN, now + 12 * MIN],
    [5, 'C-1001', 'agencyb_lan', 'eligibility_check', 'Housing benefit eligibility (B)', 'granted', now - 3 * HOUR, now - 2 * HOUR],
    [6, 'C-1003', 'officer_binh', 'full_view', 'Duplicate application review', 'denied', now - 2 * HOUR, 0],
    [7, 'C-1004', 'officer_binh', 'full_view', 'Utility arrears verification', 'granted', now - 4 * HOUR, now - 3 * HOUR],
    [8, 'C-1004', 'agencyb_lan', 'eligibility_check', 'Utility relief eligibility (B)', 'pending', now - 10 * MIN, 0],
  ]
  const rc = d.prepare('INSERT INTO access_requests (id,case_id,requester,kind,purpose,status,created_at,expires_at) VALUES (?,?,?,?,?,?,?,?)')
  for (const r of requests) rc.run(...r)

  // [request id, voter, voter role, decision, at]
  const requestVotes: [number, string, string, string, number][] = [
    [1, 'supervisor_chi', 'supervisor', 'approve', now - 48 * MIN],
    [1, 'cz-hoa', 'citizen', 'approve', now - 47 * MIN],
    [2, 'supervisor_chi', 'supervisor', 'approve', now - 24 * MIN],
    [4, 'supervisor_chi', 'supervisor', 'approve', now - 34 * MIN],
    [4, 'cz-nam', 'citizen', 'approve', now - 33 * MIN],
    [5, 'supervisor_minh', 'supervisor', 'approve', now - 3 * HOUR],
    [5, 'cz-hoa', 'citizen', 'approve', now - 3 * HOUR],
    [6, 'supervisor_chi', 'supervisor', 'approve', now - 2 * HOUR],
    [6, 'cz-lien', 'citizen', 'deny', now - 2 * HOUR],
    [7, 'supervisor_minh', 'supervisor', 'approve', now - 4 * HOUR],
    [7, 'cz-tuan', 'citizen', 'approve', now - 4 * HOUR],
    [8, 'cz-tuan', 'citizen', 'approve', now - 9 * MIN],
  ]
  const rv = d.prepare('INSERT INTO request_votes VALUES (?,?,?,?,?)')
  for (const v of requestVotes) rv.run(...v)

  // ---------- policy changes ----------
  // [id, requester, change, payload, status, created]
  const changes: [number, string, string, object, string, number][] = [
    [1, 'admin_dung', 'assign', { caseId: 'C-1003', userId: 'officer_binh' }, 'applied', now - 3 * HOUR],
    [2, 'admin_dung', 'set_quorum', { value: 1 }, 'rejected', now - 2 * HOUR - 20 * MIN],
    [3, 'admin_dung', 'assign', { caseId: 'C-1005', userId: 'officer_an' }, 'pending', now - 15 * MIN],
  ]
  const pc = d.prepare('INSERT INTO policy_changes (id,requester,change,payload,status,created_at) VALUES (?,?,?,?,?,?)')
  for (const c of changes) pc.run(c[0], c[1], c[2], JSON.stringify(c[3]), c[4], c[5])

  const policyVotes: [number, string, string, number][] = [
    [1, 'supervisor_chi', 'approve', now - 2 * HOUR - 50 * MIN],
    [1, 'supervisor_minh', 'approve', now - 2 * HOUR - 40 * MIN],
    [2, 'supervisor_minh', 'deny', now - 2 * HOUR - 5 * MIN],
    [3, 'supervisor_chi', 'approve', now - 12 * MIN],
  ]
  const pv = d.prepare('INSERT INTO policy_votes VALUES (?,?,?,?)')
  for (const v of policyVotes) pv.run(...v)

  // ---------- audit log (hash chain) ----------
  // Written directly because seed() runs before db() caches the connection,
  // so calling audit() here would recurse into db().
  let prev = 'GENESIS'
  const addAudit = (at: number, actor: string, action: string, target: string, decision: string, detail: string) => {
    const hash = sha(`${prev}|${at}|${actor}|${action}|${target}|${decision}|${detail}`)
    d.prepare('INSERT INTO audit (at,actor,action,target,decision,detail,prev_hash,hash) VALUES (?,?,?,?,?,?,?,?)')
      .run(at, actor, action, target, decision, detail, prev, hash)
    prev = hash
  }

  addAudit(now - 4 * HOUR, 'officer_an', 'login', '-', 'INFO', 'demo persona')
  addAudit(now - 3 * HOUR - 5 * MIN, 'admin_dung', 'propose_policy', 'assign', 'PENDING',
    '{"caseId":"C-1003","userId":"officer_binh"}. blocked until quorum approves')
  addAudit(now - 2 * HOUR - 50 * MIN, 'supervisor_chi', 'vote_policy', '1', 'INFO', 'approve')
  addAudit(now - 2 * HOUR - 40 * MIN, 'supervisor_minh', 'vote_policy', '1', 'INFO', 'approve')
  addAudit(now - 2 * HOUR - 30 * MIN, 'system', 'resolve_policy', '1', 'ALLOW', 'quorum 2 reached: change applied')
  addAudit(now - 2 * HOUR - 20 * MIN, 'admin_dung', 'propose_policy', 'set_quorum', 'PENDING',
    '{"value":1}. blocked until quorum approves')
  addAudit(now - 2 * HOUR - 5 * MIN, 'supervisor_minh', 'vote_policy', '2', 'INFO', 'deny')
  addAudit(now - 2 * HOUR, 'system', 'resolve_policy', '2', 'DENY', 'rejected by an approver')
  addAudit(now - 1 * HOUR - 55 * MIN, 'officer_binh', 'request_full_view', 'C-1003', 'PENDING', 'Duplicate application review')
  addAudit(now - 1 * HOUR - 50 * MIN, 'supervisor_chi', 'vote_access', '6', 'INFO', 'supervisor approve')
  addAudit(now - 1 * HOUR - 45 * MIN, 'cz-lien', 'vote_access', '6', 'INFO', 'citizen deny')
  addAudit(now - 1 * HOUR - 44 * MIN, 'system', 'resolve_access', '6', 'DENY', 'a required approver denied')
  addAudit(now - 50 * MIN, 'officer_an', 'request_full_view', 'C-1001', 'PENDING', 'Verify income for subsidy #1001')
  addAudit(now - 48 * MIN, 'supervisor_chi', 'vote_access', '1', 'INFO', 'supervisor approve')
  addAudit(now - 47 * MIN, 'cz-hoa', 'vote_access', '1', 'INFO', 'citizen approve')
  addAudit(now - 46 * MIN, 'system', 'resolve_access', '1', 'ALLOW', 'quorum reached: supervisor + citizen (15 min grant)')
  addAudit(now - 45 * MIN, 'officer_an', 'read_record', 'C-1001', 'ALLOW', 'fields: name, national_id, income, address (health withheld)')
  addAudit(now - 35 * MIN, 'agencyb_lan', 'request_eligibility_check', 'C-1002', 'PENDING', 'Housing benefit eligibility (B)')
  addAudit(now - 34 * MIN, 'supervisor_chi', 'vote_access', '4', 'INFO', 'supervisor approve')
  addAudit(now - 33 * MIN, 'cz-nam', 'vote_access', '4', 'INFO', 'citizen approve')
  addAudit(now - 32 * MIN, 'system', 'resolve_access', '4', 'ALLOW', 'quorum reached: supervisor + citizen (15 min grant)')
  addAudit(now - 31 * MIN, 'agencyb_lan', 'read_eligibility', 'C-1002', 'ALLOW', 'returned only: income_eligible')
  addAudit(now - 30 * MIN, 'officer_binh', 'read_record', 'C-1002', 'DENY', 'no active consent-quorum grant')
  addAudit(now - 25 * MIN, 'officer_an', 'request_full_view', 'C-1003', 'PENDING', 'Cross-check dependants for subsidy #1003')
  addAudit(now - 24 * MIN, 'supervisor_chi', 'vote_access', '2', 'INFO', 'supervisor approve')
  addAudit(now - 20 * MIN, 'officer_binh', 'request_full_view', 'C-1002', 'PENDING', 'Verify income for subsidy #1002')
  addAudit(now - 15 * MIN, 'admin_dung', 'propose_policy', 'assign', 'PENDING',
    '{"caseId":"C-1005","userId":"officer_an"}. blocked until quorum approves')
  addAudit(now - 12 * MIN, 'supervisor_chi', 'vote_policy', '3', 'INFO', 'approve')
  addAudit(now - 10 * MIN, 'agencyb_lan', 'request_eligibility_check', 'C-1004', 'PENDING', 'Utility relief eligibility (B)')
  addAudit(now - 9 * MIN, 'cz-tuan', 'vote_access', '8', 'INFO', 'citizen approve')
}
