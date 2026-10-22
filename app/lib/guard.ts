import { addPolicy, audit, db } from './db'
import { sha } from './crypto'
import { callerOf, isRealmAdmin, type User } from './auth'
import { dirUser, iga, tideUserKey } from './tide-sim/directory'
import { OrkError, decryptFields, evaluateEligibility, evaluateRelationship, issueConsent, verifyPolicy, type Policy } from './tide-sim/ork'

const GRANT_MS = 15 * 60 * 1000
type Row = Record<string, any>
const all = (sql: string, ...a: any[]) => db().prepare(sql).all(...a) as Row[]
const one = (sql: string, ...a: any[]) => db().prepare(sql).get(...a) as Row | undefined
const run = (sql: string, ...a: any[]) => db().prepare(sql).run(...a)

const CODES: [RegExp, string][] = [
  [/not assigned|out of scope/i, 'OUT_OF_SCOPE'],
  [/lacks the _tide_decryptor/i, 'ROLE_MISSING'],
  [/needs supervisor and citizen/i, 'LOCKED_NO_CONSENT'],
  [/own request|you requested/i, 'SELF_APPROVAL_BLOCKED'],
  [/already signed/i, 'FOUR_EYES'],
  [/tide-realm-admin|only .*(approve|vote)|only supervisors/i, 'NOT_AN_APPROVER'],
  [/only admins/i, 'ADMIN_ONLY'],
  [/only (the assigned officer|agency b)|may not (read|view)|take no part/i, 'ROLE_NOT_ALLOWED'],
  [/no such/i, 'NOT_FOUND'],
  [/already/i, 'ALREADY_RESOLVED'],
]
export class Denied extends Error {
  status: number
  code: string
  /** what TideCloak / the ORKs said, shown next to our own wording */
  tide?: string
  constructor(msg: string, status = 403, opts: { code?: string; tide?: string } = {}) {
    super(msg)
    this.status = status
    this.code = opts.code ?? CODES.find(([re]) => re.test(msg))?.[1] ?? 'FORBIDDEN'
    this.tide = opts.tide
  }
}

/** The ORK network says no (contract) or cannot be reached (threshold). Neither is retried. */
function fromOrk(e: unknown): never {
  if (e instanceof OrkError) {
    if (e.code === 'THRESHOLD_FAILURE') throw new Denied('The Tide network could not reach enough ORKs, so nothing can be decrypted right now', 503, { code: 'THRESHOLD_FAILURE', tide: e.message })
    throw new Denied('The ORK network refused this request', 403, { code: 'CONTRACT_REFUSED', tide: e.message })
  }
  throw e
}

const policyRows = (caseId: string) => all('SELECT * FROM policies WHERE case_id=? ORDER BY id', caseId)
/** The signed policy that names this caller for this case, and the ORK contract's verdict on it. */
function relationshipFor(u: User, caseId: string) {
  const policies = policyRows(caseId).map(r => JSON.parse(r.policy_json) as Policy)
  const mine = policies.find(p => p.params.subjectType === 'User' && p.params.subjectId === u.tideuserkey) ?? policies.find(p => p.params.subjectType !== 'User')
  return { policy: mine, err: evaluateRelationship(mine, callerOf(u), caseId, 'decrypt') }
}
const assignedNames = (caseId: string) =>
  policyRows(caseId).filter(r => r.subject_type === 'User' && dirUser(r.subject_name)?.role === 'officer').map(r => r.subject_name as string)

// ---------- cases (metadata only; never sensitive fields) ----------
export function listCases(u: User) {
  return all('SELECT * FROM cases ORDER BY id')
    .map((c): Row => ({
      ...c,
      assignedTo: assignedNames(c.id),
      grants: all("SELECT kind, expires_at FROM access_requests WHERE case_id=? AND requester=? AND status='granted' AND expires_at>?", c.id, u.id, Date.now()),
    }))
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
    const rel = relationshipFor(u, caseId)
    if (rel.err) {
      audit(u.id, 'request_access', caseId, 'DENY', `not assigned (out of scope). ORK contract: ${rel.err}`)
      throw new Denied('You are not assigned to this case', 403, { tide: rel.err })
    }
  } else if (u.role !== 'agency_b') {
    audit(u.id, 'request_eligibility', caseId, 'DENY', 'only Agency B may request an eligibility check')
    throw new Denied('Only Agency B can request an eligibility check')
  }
  const r = run('INSERT INTO access_requests (case_id,requester,kind,purpose,status,created_at) VALUES (?,?,?,?,?,?)', caseId, u.id, kind, purpose, 'pending', Date.now())
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
  const yes = (role: string) => votes.find(v => v.voter_role === role && v.decision === 'approve')
  if (yes('citizen') && yes('supervisor')) {
    const exp = Date.now() + GRANT_MS
    // the ORK network signs the outcome: this attestation, not our database row, is what ConsentQuorum:1 checks at decrypt time
    const attestation = issueConsent({
      case: r.case_id, kind: r.kind, sub: tideUserKey(r.requester), iat: Date.now(), exp,
      approvals: votes.filter(v => v.decision === 'approve').map(v => ({ role: v.voter_role, key: tideUserKey(v.voter) })),
    })
    run("UPDATE access_requests SET status='granted', expires_at=?, attestation=? WHERE id=?", exp, attestation, requestId)
    audit('system', 'resolve_access', String(requestId), 'ALLOW', 'quorum reached: supervisor + citizen. ORKs signed a 15 min consent attestation')
    return 'granted'
  }
  return 'pending'
}

export function listRequests(u: User) {
  if (u.role === 'admin') {
    audit(u.id, 'list_requests', '-', 'DENY', 'admins take no part in consent')
    throw new Denied('Admins take no part in consent decisions, so they cannot list consent requests')
  }
  return all('SELECT id,case_id,requester,kind,purpose,status,created_at,expires_at FROM access_requests ORDER BY id DESC')
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
  return one("SELECT * FROM access_requests WHERE case_id=? AND requester=? AND kind=? AND status='granted' AND expires_at>? ORDER BY id DESC", caseId, u.id, kind, Date.now())
}

// ---------- record reads: the ORKs decrypt, and only if the contracts agree ----------
const FIELDS = ['full_name_enc', 'national_id_enc', 'income_enc', 'address_enc'] as const
function shape(plain: Record<string, string>) {
  return { name: plain.full_name_enc, national_id: plain.national_id_enc, income: Number(plain.income_enc), address: plain.address_enc }
}
const cipherOf = (citizenId: string) => { const z = one('SELECT * FROM citizens WHERE id=?', citizenId)!; return Object.fromEntries(FIELDS.map(f => [f, z[f] as string])) }

export function readRecord(u: User, caseId: string) {
  const c = one('SELECT * FROM cases WHERE id=?', caseId)
  if (!c) throw new Denied('No such case', 404)
  if (u.role === 'citizen') {
    if (u.citizenId !== c.citizen_id) {
      audit(u.id, 'read_record', caseId, 'DENY', "citizen tried to read another citizen's record")
      throw new Denied('This record belongs to another citizen. You are not assigned to this case', 403, { tide: 'subjectId does not match.' })
    }
    const rel = relationshipFor(u, caseId)
    try {
      const plain = decryptFields(cipherOf(c.citizen_id), caseId, { caller: callerOf(u), policy: rel.policy })
      audit(u.id, 'read_own_record', caseId, 'ALLOW', 'owner reads their own record (RelationshipAttestation:1)')
      return shape(plain)
    } catch (e) { audit(u.id, 'read_own_record', caseId, 'DENY', (e as Error).message); return fromOrk(e) }
  }
  if (u.role !== 'officer') {
    audit(u.id, 'read_record', caseId, 'DENY', `role ${u.role} may not read records`)
    throw new Denied(`Your role (${u.role}) may not read citizen records`)
  }
  const rel = relationshipFor(u, caseId)
  if (!rel.policy || rel.err?.startsWith('subjectId') || rel.err?.startsWith('No relationship')) {
    audit(u.id, 'read_record', caseId, 'DENY', `out of scope: not assigned. ORK contract: ${rel.err}`)
    throw new Denied('You are not assigned to this case', 403, { tide: rel.err ?? undefined })
  }
  if (rel.err?.includes('_tide_decryptor')) {
    audit(u.id, 'read_record', caseId, 'DENY', `assigned, but ${rel.err}`)
    throw new Denied('Your account lacks the _tide_decryptor role, so the ORKs will not decrypt for you', 403, { tide: rel.err })
  }
  const grant = activeGrant(u, caseId, 'full_view')
  if (!grant) {
    audit(u.id, 'read_record', caseId, 'DENY', 'no active consent-quorum grant')
    throw new Denied('This record needs supervisor and citizen approval first', 403, { tide: 'Consent attestation missing.' })
  }
  try {
    const plain = decryptFields(cipherOf(c.citizen_id), caseId, { caller: callerOf(u), policy: rel.policy, consent: { attestation: grant.attestation, kind: 'full_view' } })
    audit(u.id, 'read_record', caseId, 'ALLOW', 'ORKs ran ConsentQuorum:1 + RelationshipAttestation:1. fields: name, national_id, income, address (health withheld)')
    return shape(plain)
  } catch (e) { audit(u.id, 'read_record', caseId, 'DENY', (e as Error).message); return fromOrk(e) }
}

// Purpose-bound share: Agency B learns one boolean, never the file. The ORKs evaluate it; the income is not released.
export function eligibility(u: User, caseId: string) {
  const c = one('SELECT * FROM cases WHERE id=?', caseId)
  if (!c) throw new Denied('No such case', 404)
  const grant = u.role === 'agency_b' ? activeGrant(u, caseId, 'eligibility_check') : undefined
  if (!grant) {
    audit(u.id, 'read_eligibility', caseId, 'DENY', 'no active grant')
    throw new Denied('This record needs supervisor and citizen approval first', 403, { tide: 'Consent attestation missing.' })
  }
  const limit = Number(one("SELECT value FROM settings WHERE key='income_threshold'")!.value)
  try {
    const eligible = evaluateEligibility(one('SELECT income_enc FROM citizens WHERE id=?', c.citizen_id)!.income_enc, caseId, limit, { caller: callerOf(u), consent: { attestation: grant.attestation, kind: 'eligibility_check' } })
    audit(u.id, 'read_eligibility', caseId, 'ALLOW', 'ORKs released only: income_eligible')
    return { income_eligible: eligible }
  } catch (e) { audit(u.id, 'read_eligibility', caseId, 'DENY', (e as Error).message); return fromOrk(e) }
}

// ---------- IGA change requests: an app admin can propose; only tide-realm-admin holders can approve ----------
export function proposeChange(u: User, change: 'assign' | 'set_quorum', payload: Record<string, any>) {
  if (u.role !== 'admin') {
    audit(u.id, 'propose_policy', change, 'DENY', 'not an admin')
    throw new Denied('Only admins can propose policy changes')
  }
  if (change !== 'assign') {
    audit(u.id, 'propose_policy', change, 'DENY', 'quorum is derived, not configurable')
    throw new Denied('The approval quorum is max(1, floor(0.7 x tide-realm-admin holders)). The app cannot set it', 400, { code: 'NOT_CONFIGURABLE' })
  }
  if (!one('SELECT 1 AS x FROM cases WHERE id=?', payload.caseId) || !dirUser(payload.userId)) throw new Denied('No such case or user', 404)
  const threshold = iga().threshold
  const r = run('INSERT INTO policy_changes (requester,change,entity_type,action_type,payload,status,threshold,created_at) VALUES (?,?,?,?,?,?,?,?)',
    u.id, 'assign', 'POLICY', 'CREATE_RELATIONSHIP_POLICY', JSON.stringify(payload), 'pending', threshold, Date.now())
  audit(u.id, 'propose_policy', change, 'PENDING', `${JSON.stringify(payload)}. draft change request, needs ${threshold} tide-realm-admin approvals`)
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
  if (!isRealmAdmin(u)) {
    audit(u.id, 'vote_policy', String(id), 'DENY', `missing client role realm-management/tide-realm-admin (has: ${u.role})`)
    throw new Denied('Only tide-realm-admin holders can approve change requests')
  }
  if (one('SELECT 1 AS x FROM policy_votes WHERE change_id=? AND voter=?', id, u.id)) {
    audit(u.id, 'vote_policy', String(id), 'DENY', 'four-eyes: this admin already signed')
    throw new Denied('You already signed this change request. One admin cannot count twice', 409)
  }
  run('INSERT INTO policy_votes VALUES (?,?,?,?)', id, u.id, decision, Date.now())
  audit(u.id, 'vote_policy', String(id), 'INFO', decision)
  const votes = all('SELECT * FROM policy_votes WHERE change_id=?', id)
  if (votes.some(v => v.decision === 'deny')) {
    run("UPDATE policy_changes SET status='rejected' WHERE id=?", id)
    audit('system', 'resolve_policy', String(id), 'DENY', 'rejected by an approver')
    return 'rejected'
  }
  const approvals = votes.filter(v => v.decision === 'approve')
  if (approvals.length >= ch.threshold) {
    const p = JSON.parse(ch.payload)
    // commit: the ORKs sign the relationship policy. Without the quorum there is nothing to sign.
    addPolicy(p.caseId, p.userId, ['_tide_decryptor'], `change-request #${id}`, approvals.map(v => v.voter))
    run("UPDATE policy_changes SET status='applied' WHERE id=?", id)
    audit('system', 'resolve_policy', String(id), 'ALLOW', `${approvals.length} of ${ch.threshold} approvals: ORKs signed the policy for ${p.userId} on ${p.caseId}`)
    return 'applied'
  }
  return 'pending'
}

export function listChanges(u: User) {
  if (u.role !== 'admin' && u.role !== 'supervisor') {
    audit(u.id, 'list_policy', '-', 'DENY', `role ${u.role} may not view policy changes`)
    throw new Denied(`Your role (${u.role}) may not view policy changes`)
  }
  return all('SELECT * FROM policy_changes ORDER BY id DESC').map(c => {
    const votes = all('SELECT voter,decision FROM policy_votes WHERE change_id=?', c.id)
    const approvals = votes.filter(v => v.decision === 'approve').length
    return { ...c, payload: JSON.parse(c.payload), votes, quorum: c.threshold, admins: iga().admins, readyToCommit: c.status === 'pending' && approvals >= c.threshold }
  })
}

/** Signed relationship policies. Supervisors and admins see all; everyone else only the ones that name them. */
export function listPolicies(u: User) {
  const sees = (r: Row) => u.role === 'supervisor' || u.role === 'admin' || r.subject_id === u.tideuserkey
  return all('SELECT * FROM policies ORDER BY id DESC').filter(sees).map(r => {
    const p = JSON.parse(r.policy_json) as Policy
    return { id: r.id, caseId: r.case_id, subject: r.subject_name, subjectKey: r.subject_id, roles: JSON.parse(r.roles), source: r.source, approvedBy: p.approvedBy, contract: p.contract, signatureValid: verifyPolicy(p), at: r.created_at }
  })
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
