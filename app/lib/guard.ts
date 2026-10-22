import { audit, db } from './db'
import { decryptField, sha } from './crypto'
import type { User } from './auth'
import { USERS } from './auth'

const GRANT_MS = 15 * 60 * 1000
type Row = Record<string, any>
const all = (sql: string, ...a: any[]) => db().prepare(sql).all(...a) as Row[]
const one = (sql: string, ...a: any[]) => db().prepare(sql).get(...a) as Row | undefined
const run = (sql: string, ...a: any[]) => db().prepare(sql).run(...a)

const CODES: [RegExp, string][] = [
  [/not assigned|out of scope/i, 'OUT_OF_SCOPE'],
  [/needs supervisor and citizen/i, 'LOCKED_NO_CONSENT'],
  [/own request|you requested/i, 'SELF_APPROVAL_BLOCKED'],
  [/only .*(approve|vote)|only supervisors/i, 'NOT_AN_APPROVER'],
  [/only admins/i, 'ADMIN_ONLY'],
  [/only (the assigned officer|agency b)|may not (read|view)|take no part/i, 'ROLE_NOT_ALLOWED'],
  [/no such/i, 'NOT_FOUND'],
  [/already/i, 'ALREADY_RESOLVED'],
]
export class Denied extends Error {
  status: number
  code: string
  constructor(msg: string, status = 403) {
    super(msg)
    this.status = status
    this.code = CODES.find(([re]) => re.test(msg))?.[1] ?? 'FORBIDDEN'
  }
}

const isAssigned = (caseId: string, userId: string) =>
  !!one('SELECT 1 AS x FROM assignments WHERE case_id=? AND user_id=?', caseId, userId)

const supervisors = () => USERS.filter(u => u.role === 'supervisor')

// ---------- cases (metadata only; never sensitive fields) ----------
export function listCases(u: User) {
  const cases = all('SELECT * FROM cases ORDER BY id')
  return cases
    .map((c): Row => {
      const g = all(
        "SELECT kind, expires_at FROM access_requests WHERE case_id=? AND requester=? AND status='granted' AND expires_at>?",
        c.id, u.id, Date.now(),
      )
      return {
        ...c,
        assignedTo: all('SELECT user_id FROM assignments WHERE case_id=?', c.id).map(r => r.user_id),
        grants: g,
      }
    })
    // metadata is not sensitive: everyone sees the case index; a citizen only sees their own
    .filter(c => (u.role === 'citizen' ? c.citizen_id === u.citizenId : true))
}

// ---------- access requests (consent quorum) ----------
export function requestAccess(u: User, caseId: string, kind: 'full_view' | 'eligibility_check', purpose: string) {
  const c = one('SELECT * FROM cases WHERE id=?', caseId)
  if (!c) throw new Denied('No such case', 404)
  if (kind === 'full_view') {
    if (u.role !== 'officer') {
      audit(u.id, 'request_access', caseId, 'DENY', 'only assigned officers may request full view')
      throw new Denied('Only the assigned officer can request a full view')
    }
    if (!isAssigned(caseId, u.id)) {
      audit(u.id, 'request_access', caseId, 'DENY', 'not assigned to this case (out of scope)')
      throw new Denied('You are not assigned to this case')
    }
  } else if (u.role !== 'agency_b') {
    audit(u.id, 'request_eligibility', caseId, 'DENY', 'only Agency B may request an eligibility check')
    throw new Denied('Only Agency B can request an eligibility check')
  }
  const r = run(
    'INSERT INTO access_requests (case_id,requester,kind,purpose,status,created_at) VALUES (?,?,?,?,?,?)',
    caseId, u.id, kind, purpose, 'pending', Date.now(),
  )
  audit(u.id, `request_${kind}`, caseId, 'PENDING', purpose)
  return Number(r.lastInsertRowid)
}

export function voteAccess(u: User, requestId: number, decision: 'approve' | 'deny') {
  const r = one('SELECT * FROM access_requests WHERE id=?', requestId)
  if (!r) throw new Denied('No such request', 404)
  if (r.status !== 'pending') throw new Denied(`Request already ${r.status}`, 409)
  const c = one('SELECT * FROM cases WHERE id=?', r.case_id)!
  const isOwner = u.role === 'citizen' && u.citizenId === c.citizen_id
  const isSup = u.role === 'supervisor'
  if (u.id === r.requester) {
    audit(u.id, 'vote_access', String(requestId), 'DENY', 'requester cannot approve own request')
    throw new Denied('You cannot approve your own request')
  }
  if (!isOwner && !isSup) {
    audit(u.id, 'vote_access', String(requestId), 'DENY', `role ${u.role} is not an approver`)
    throw new Denied('Only the supervisor or the citizen who owns the record can vote')
  }
  run('INSERT OR REPLACE INTO request_votes VALUES (?,?,?,?,?)', requestId, u.id, isOwner ? 'citizen' : 'supervisor', decision, Date.now())
  audit(u.id, 'vote_access', String(requestId), 'INFO', `${isOwner ? 'citizen' : 'supervisor'} ${decision}`)
  const votes = all('SELECT * FROM request_votes WHERE request_id=?', requestId)
  if (votes.some(v => v.decision === 'deny')) {
    run("UPDATE access_requests SET status='denied' WHERE id=?", requestId)
    audit('system', 'resolve_access', String(requestId), 'DENY', 'a required approver denied')
    return 'denied'
  }
  const citizenOk = votes.some(v => v.voter_role === 'citizen' && v.decision === 'approve')
  const supOk = votes.some(v => v.voter_role === 'supervisor' && v.decision === 'approve')
  if (citizenOk && supOk) {
    run("UPDATE access_requests SET status='granted', expires_at=? WHERE id=?", Date.now() + GRANT_MS, requestId)
    audit('system', 'resolve_access', String(requestId), 'ALLOW', 'quorum reached: supervisor + citizen (15 min grant)')
    return 'granted'
  }
  return 'pending'
}

export function listRequests(u: User) {
  if (u.role === 'admin') {
    audit(u.id, 'list_requests', '-', 'DENY', 'admins take no part in consent')
    throw new Denied('Admins take no part in consent decisions, so they cannot list consent requests')
  }
  const rows = all('SELECT * FROM access_requests ORDER BY id DESC')
  return rows
    .map((r): Row => {
      const c = one('SELECT * FROM cases WHERE id=?', r.case_id)!
      const votes = all('SELECT voter,voter_role,decision FROM request_votes WHERE request_id=?', r.id)
      const status = r.status === 'granted' && r.expires_at < Date.now() ? 'expired' : r.status
      return { ...r, status, citizen_id: c.citizen_id, votes }
    })
    .filter(r => {
      if (u.role === 'officer' || u.role === 'agency_b') return r.requester === u.id
      if (u.role === 'citizen') return r.citizen_id === u.citizenId
      return u.role === 'supervisor'
    })
}

function activeGrant(u: User, caseId: string, kind: string) {
  return one(
    "SELECT * FROM access_requests WHERE case_id=? AND requester=? AND kind=? AND status='granted' AND expires_at>? ORDER BY id DESC",
    caseId, u.id, kind, Date.now(),
  )
}

// ---------- record reads ----------
export function readRecord(u: User, caseId: string) {
  const c = one('SELECT * FROM cases WHERE id=?', caseId)
  if (!c) throw new Denied('No such case', 404)
  if (u.role === 'citizen' && u.citizenId === c.citizen_id) {
    const z = one('SELECT * FROM citizens WHERE id=?', c.citizen_id)!
    audit(u.id, 'read_own_record', caseId, 'ALLOW', 'owner reads their own record')
    return {
      name: decryptField(z.full_name_enc), national_id: decryptField(z.national_id_enc),
      income: Number(decryptField(z.income_enc)), address: decryptField(z.address_enc),
    }
  }
  if (u.role === 'citizen') {
    audit(u.id, 'read_record', caseId, 'DENY', 'citizen tried to read another citizen\'s record')
    throw new Denied('This record belongs to another citizen. You are not assigned to this case')
  }
  if (u.role !== 'officer') {
    audit(u.id, 'read_record', caseId, 'DENY', `role ${u.role} may not read records`)
    throw new Denied(`Your role (${u.role}) may not read citizen records`)
  }
  if (!isAssigned(caseId, u.id)) {
    audit(u.id, 'read_record', caseId, 'DENY', 'out of scope: not assigned')
    throw new Denied('You are not assigned to this case')
  }
  if (!activeGrant(u, caseId, 'full_view')) {
    audit(u.id, 'read_record', caseId, 'DENY', 'no active consent-quorum grant')
    throw new Denied('This record needs supervisor and citizen approval first')
  }
  const z = one('SELECT * FROM citizens WHERE id=?', c.citizen_id)!
  audit(u.id, 'read_record', caseId, 'ALLOW', 'fields: name, national_id, income, address (health withheld)')
  return {
    name: decryptField(z.full_name_enc),
    national_id: decryptField(z.national_id_enc),
    income: Number(decryptField(z.income_enc)),
    address: decryptField(z.address_enc),
  }
}

// Purpose-bound share: Agency B learns one boolean, never the file.
export function eligibility(u: User, caseId: string) {
  const c = one('SELECT * FROM cases WHERE id=?', caseId)
  if (!c) throw new Denied('No such case', 404)
  if (u.role !== 'agency_b' || !activeGrant(u, caseId, 'eligibility_check')) {
    audit(u.id, 'read_eligibility', caseId, 'DENY', 'no active grant')
    throw new Denied('This record needs supervisor and citizen approval first')
  }
  const z = one('SELECT * FROM citizens WHERE id=?', c.citizen_id)!
  const limit = Number(one("SELECT value FROM settings WHERE key='income_threshold'")!.value)
  const eligible = Number(decryptField(z.income_enc)) <= limit
  audit(u.id, 'read_eligibility', caseId, 'ALLOW', 'returned only: income_eligible')
  return { income_eligible: eligible }
}

// ---------- policy changes (admin cannot self-escalate) ----------
export function proposeChange(u: User, change: 'assign' | 'set_quorum', payload: Record<string, any>) {
  if (u.role !== 'admin') {
    audit(u.id, 'propose_policy', change, 'DENY', 'not an admin')
    throw new Denied('Only admins can propose policy changes')
  }
  const r = run('INSERT INTO policy_changes (requester,change,payload,status,created_at) VALUES (?,?,?,?,?)',
    u.id, change, JSON.stringify(payload), 'pending', Date.now())
  audit(u.id, 'propose_policy', change, 'PENDING', `${JSON.stringify(payload)}. blocked until quorum approves`)
  return Number(r.lastInsertRowid)
}

export function voteChange(u: User, id: number, decision: 'approve' | 'deny') {
  const ch = one('SELECT * FROM policy_changes WHERE id=?', id)
  if (!ch) throw new Denied('No such change', 404)
  if (ch.status !== 'pending') throw new Denied(`Change already ${ch.status}`, 409)
  if (u.id === ch.requester) {
    audit(u.id, 'vote_policy', String(id), 'DENY', 'admin tried to approve own change')
    throw new Denied('You cannot approve a change you requested')
  }
  if (u.role !== 'supervisor') {
    audit(u.id, 'vote_policy', String(id), 'DENY', `role ${u.role} is not an approver`)
    throw new Denied('Only supervisors can approve policy changes')
  }
  run('INSERT OR REPLACE INTO policy_votes VALUES (?,?,?,?)', id, u.id, decision, Date.now())
  audit(u.id, 'vote_policy', String(id), 'INFO', decision)
  const votes = all('SELECT * FROM policy_votes WHERE change_id=?', id)
  if (votes.some(v => v.decision === 'deny')) {
    run("UPDATE policy_changes SET status='rejected' WHERE id=?", id)
    audit('system', 'resolve_policy', String(id), 'DENY', 'rejected by an approver')
    return 'rejected'
  }
  const need = Math.min(Number(one("SELECT value FROM settings WHERE key='policy_quorum'")!.value), supervisors().length)
  if (votes.filter(v => v.decision === 'approve').length >= need) {
    const p = JSON.parse(ch.payload)
    if (ch.change === 'assign') run('INSERT OR IGNORE INTO assignments VALUES (?,?)', p.caseId, p.userId)
    if (ch.change === 'set_quorum') run("UPDATE settings SET value=? WHERE key='policy_quorum'", String(p.value))
    run("UPDATE policy_changes SET status='applied' WHERE id=?", id)
    audit('system', 'resolve_policy', String(id), 'ALLOW', `quorum ${need} reached: change applied`)
    return 'applied'
  }
  return 'pending'
}

export function listChanges(u: User) {
  if (u.role !== 'admin' && u.role !== 'supervisor') {
    audit(u.id, 'list_policy', '-', 'DENY', `role ${u.role} may not view policy changes`)
    throw new Denied(`Your role (${u.role}) may not view policy changes`)
  }
  return all('SELECT * FROM policy_changes ORDER BY id DESC').map(c => ({
    ...c,
    payload: JSON.parse(c.payload),
    votes: all('SELECT voter,decision FROM policy_votes WHERE change_id=?', c.id),
    quorum: Number(one("SELECT value FROM settings WHERE key='policy_quorum'")!.value),
  }))
}

// supervisors and admins oversee everything; everyone else sees only their own actions
export const listAudit = (u: User, limit = 100) =>
  u.role === 'supervisor' || u.role === 'admin'
    ? all('SELECT * FROM audit ORDER BY id DESC LIMIT ?', limit)
    : all('SELECT * FROM audit WHERE actor=? ORDER BY id DESC LIMIT ?', u.id, limit)

// Recompute the hash chain: any edited/removed audit row breaks it.
export function verifyChain() {
  const rows = all('SELECT * FROM audit ORDER BY id ASC')
  let prev = 'GENESIS'
  for (const r of rows) {
    const h = sha(`${prev}|${r.at}|${r.actor}|${r.action}|${r.target}|${r.decision}|${r.detail}`)
    if (r.prev_hash !== prev || r.hash !== h) return { ok: false, entries: rows.length, brokenAt: r.id }
    prev = r.hash
  }
  return { ok: true, entries: rows.length, brokenAt: null }
}
