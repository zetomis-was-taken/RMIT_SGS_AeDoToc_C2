import { createHash, createPrivateKey, generateKeyPairSync, randomBytes, sign as nodeSign } from 'node:crypto'
import { USERS, userById, type User } from './auth'
import { db } from './db'
import { Denied, eligibility, proposeChange, readRecord, requestAccess, voteAccess, voteChange } from './guard'
import { AuthError, tokenEndpoint, verifyDPoP, verifyTideJWT } from './tide-sim/jwt'
import { setOnline, singleShareAttack } from './tide-sim/ork'

export type Outcome = 'blocked' | 'allowed' | 'pending'
export interface Step { label: string; outcome: Outcome; message: string; code?: string; tide?: string }
export interface Scenario {
  id: string; title: string; actor: string; threat: string; rbac: string
  steps: Step[]; verdict: 'protected' | 'exposed'
}

const U = (id: string) => userById(id) as User
async function step(label: string, fn: () => unknown, okOutcome: Outcome = 'allowed'): Promise<Step> {
  try {
    const r = fn()
    return { label, outcome: okOutcome, message: typeof r === 'string' ? r : JSON.stringify(r) }
  } catch (e) {
    if (e instanceof Denied) return { label, outcome: 'blocked', message: e.message, code: e.code, tide: e.tide }
    if (e instanceof AuthError) return { label, outcome: 'blocked', message: e.message, code: e.code }
    throw e
  }
}
const blocked = (...s: Step[]) => s.every(x => x.outcome === 'blocked') ? 'protected' as const : 'exposed' as const

// helpers to play a client that holds a DPoP key
const b64u = (b: Buffer | string) => Buffer.from(b).toString('base64url')
function keypair() {
  const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' })
  const j = privateKey.export({ format: 'jwk' }) as { kty: string; crv: string; x: string; y: string; d: string }
  return { priv: createPrivateKey({ key: j, format: 'jwk' }), jwk: { kty: j.kty, crv: j.crv, x: j.x, y: j.y } }
}
function proof(k: ReturnType<typeof keypair>, method: string, url: string, token?: string, jti = randomBytes(8).toString('hex')) {
  const body = `${b64u(JSON.stringify({ typ: 'dpop+jwt', alg: 'ES256', jwk: k.jwk }))}.${b64u(JSON.stringify({ htm: method, htu: url, iat: Math.floor(Date.now() / 1000), jti, ...(token ? { ath: createHash('sha256').update(token).digest('base64url') } : {}) }))}`
  return `${body}.${b64u(nodeSign('sha256', Buffer.from(body), { key: k.priv, dsaEncoding: 'ieee-p1363' }))}`
}

// Each scenario runs the real policy engine against the live demo database, as a specific attacker.
export async function runScenario(id: string): Promise<Scenario> {
  switch (id) {
    case 'out-of-scope': {
      const steps = [await step('Officer An opens C-1002 (assigned to Binh)', () => readRecord(U('officer_an'), 'C-1002'))]
      return { id, title: 'Officer opens a file outside their assignment', actor: 'An · Officer', threat: 'Insider snooping on a record that is not theirs.',
        rbac: 'A role check ("is an officer") passes, so the record is returned.', steps, verdict: blocked(steps[0]) }
    }
    case 'no-consent': {
      const steps = [await step('Officer An opens their own case C-1003 with no approvals', () => readRecord(U('officer_an'), 'C-1003'))]
      return { id, title: 'Assigned officer skips the citizen', actor: 'An · Officer', threat: 'Assignment alone is treated as permission to read.',
        rbac: 'Assignment is the only gate, so the record opens without the citizen knowing.', steps, verdict: blocked(steps[0]) }
    }
    case 'self-approve': {
      const an = U('officer_an')
      let rid = 0
      const a = await step('Officer An requests access to C-1003', () => { rid = requestAccess(an, 'C-1003', 'full_view', 'Lab: self-approval test'); return `request #${rid} created` }, 'pending')
      const b = await step('Officer An approves their own request', () => voteAccess(an, rid, 'approve'))
      return { id, title: 'Requester approves their own request', actor: 'An · Officer', threat: 'One person acting as both asker and approver.',
        rbac: 'A single "can_approve" flag lets the same account close the loop.', steps: [a, b], verdict: blocked(b) }
    }
    case 'admin-escalation': {
      const admin = U('admin_dung')
      let cid = 0
      const a = await step('Admin Dung proposes: assign Dung to C-1001', () => { cid = proposeChange(admin, 'assign', { caseId: 'C-1001', userId: admin.id }); return `change request #${cid} drafted, not applied` }, 'pending')
      const b = await step('Admin Dung approves their own change', () => voteChange(admin, cid, 'approve'))
      const c = await step('Admin Dung sets the quorum to 1', () => proposeChange(admin, 'set_quorum', { value: 1 }))
      const d = await step('Admin Dung opens C-1001 directly', () => readRecord(admin, 'C-1001'))
      return { id, title: 'Admin grants themselves access', actor: 'Dung · Admin', threat: 'Privileged account rewrites the policy that limits it.',
        rbac: 'The admin edits the assignments table, lowers the approval threshold and reads the record in one step.', steps: [a, b, c, d], verdict: blocked(b, c, d) }
    }
    case 'quorum-commit': {
      const admin = U('admin_dung')
      let cid = 0
      const a = await step('Admin Dung proposes: assign Binh to C-1003', () => { cid = proposeChange(admin, 'assign', { caseId: 'C-1003', userId: 'officer_binh' }); return `change request #${cid} drafted (needs 2 of 3 tide-realm-admin approvals)` }, 'pending')
      const b = await step('Supervisor Chi approves', () => voteChange(U('supervisor_chi'), cid, 'approve'), 'pending')
      const c = await step('Chi tries to approve a second time', () => voteChange(U('supervisor_chi'), cid, 'approve'))
      const d = await step('Supervisor Minh approves', () => `change request ${voteChange(U('supervisor_minh'), cid, 'approve')}: the ORKs signed the policy`)
      return { id, title: 'A policy change needs two different admins', actor: 'Dung, Chi, Minh', threat: 'One admin (or one admin plus a copy of themselves) rewriting who may read a record.',
        rbac: 'One admin updates the assignments table. Nobody else is asked.', steps: [a, b, c, d], verdict: c.outcome === 'blocked' && d.outcome === 'allowed' ? 'protected' : 'exposed' }
    }
    case 'agency-overreach': {
      const lan = U('agencyb_lan')
      const a = await step('Agency B tries to read the full record of C-1001', () => readRecord(lan, 'C-1001'))
      const b = await step('Agency B asks for eligibility without approvals', () => eligibility(lan, 'C-1001'))
      return { id, title: 'Second agency asks for more than it needs', actor: 'Lan · Agency B', threat: 'Data shared for one purpose gets reused for another.',
        rbac: 'A shared API key returns the whole file to any partner agency.', steps: [a, b], verdict: blocked(a, b) }
    }
    case 'forged-token': {
      const URL_ = 'https://app.local/api/guard/cases'
      const real = keypair(), thief = keypair()
      const t = tokenEndpoint({ grant_type: 'password', username: 'officer_an', password: 'demo' }, proof(real, 'POST', 'https://app.local/api/tide/token'), 'https://app.local/api/tide/token')
      const [h, p, s] = t.access_token.split('.')
      const claims = JSON.parse(Buffer.from(p, 'base64url').toString())
      claims.resource_access = { 'realm-management': { roles: ['tide-realm-admin'] } }
      const tp = b64u(JSON.stringify(claims))
      const a = await step('An adds tide-realm-admin to his own token and keeps the old signature', () => verifyTideJWT(`${h}.${tp}.${s}`))
      const attacker = keypair()
      const b = await step('An signs the edited token with a key he generated', () => verifyTideJWT(`${h}.${tp}.${b64u(nodeSign('sha256', Buffer.from(`${h}.${tp}`), { key: attacker.priv, dsaEncoding: 'ieee-p1363' }))}`))
      const ok = await step('An calls the API with his genuine token and a fresh proof', () => { const pr = proof(real, 'GET', URL_, t.access_token, 'jti-ok-' + randomBytes(4).toString('hex')); verifyDPoP(pr, 'GET', URL_, t.access_token, JSON.parse(Buffer.from(p, 'base64url').toString()).cnf.jkt); return 'accepted' })
      const c = await step('A thief copies the token and signs the proof with their own key', () => verifyDPoP(proof(thief, 'GET', URL_, t.access_token), 'GET', URL_, t.access_token, claims.cnf.jkt))
      const reuse = proof(real, 'GET', URL_, t.access_token, 'jti-fixed-' + randomBytes(4).toString('hex'))
      verifyDPoP(reuse, 'GET', URL_, t.access_token, claims.cnf.jkt)
      const d = await step('The same proof is sent a second time (replay)', () => verifyDPoP(reuse, 'GET', URL_, t.access_token, claims.cnf.jkt))
      return { id, title: 'Forged and stolen tokens', actor: 'An, then a thief', threat: 'Editing roles in the browser, or stealing a token from storage.',
        rbac: 'A bearer token or a session cookie: copy it and you are in. A role edited client-side is believed if the server trusts it.', steps: [a, b, ok, c, d], verdict: blocked(a, b, c, d) }
    }
    case 'dba': {
      const r = db().prepare('SELECT id, full_name_enc, income_enc FROM citizens LIMIT 1').all()[0] as Record<string, string>
      const atk = singleShareAttack(r.income_enc, 'C-1001')
      const steps: Step[] = [
        { label: 'DBA runs SELECT * FROM citizens', outcome: 'blocked', message: `${r.id} | ${r.full_name_enc.slice(0, 34)}… | ${r.income_enc.slice(0, 26)}…`, code: 'CIPHERTEXT_ONLY' },
        { label: 'DBA also steals one ORK’s key share and tries to decrypt', outcome: 'blocked', message: `share ${atk.shareHead}… is 1 of 3, and 2 are needed. Decryption ${atk.ok ? 'worked (!)' : 'fails'}.`, code: 'THRESHOLD_NOT_MET' },
      ]
      return { id, title: 'DBA reads the database directly', actor: 'Tuan · DBA', threat: 'Infrastructure access is treated as data access.',
        rbac: 'Plaintext columns, or one encryption key in an env var next to the app: the DBA reads every name, ID and income.', steps, verdict: atk.ok ? 'exposed' : 'protected' }
    }
    case 'ork-offline': {
      const binh = U('officer_binh')
      const steps: Step[] = []
      let rid = 0
      steps.push(await step('Binh requests access to C-1002', () => { rid = requestAccess(binh, 'C-1002', 'full_view', 'Lab: ORK outage test'); return `request #${rid} created` }, 'pending'))
      steps.push(await step('Supervisor Chi approves', () => voteAccess(U('supervisor_chi'), rid, 'approve'), 'pending'))
      steps.push(await step('Citizen Nam approves', () => voteAccess(U('cz_nam'), rid, 'approve')))
      try {
        setOnline(3, false)
        steps.push(await step('ORK 3 goes offline. Binh opens the record (2 of 3 ORKs answer)', () => { const r = readRecord(binh, 'C-1002'); return `opened: ${r.name}` }))
        setOnline(2, false)
        steps.push(await step('ORK 2 goes offline too. Binh tries again (1 of 3)', () => readRecord(binh, 'C-1002')))
      } finally { setOnline(2, true); setOnline(3, true) }
      steps.push(await step('All ORKs are back. Binh opens the record again', () => { const r = readRecord(binh, 'C-1002'); return `opened: ${r.name}` }))
      return { id, title: 'The network tolerates one ORK down, not two', actor: 'Binh · Officer', threat: 'Availability: one node failing, or being seized, must not stop work or break the guarantee.',
        rbac: 'One database or one key server: a single outage stops everyone, and a single compromise exposes everyone.', steps,
        verdict: steps[3].outcome === 'allowed' && steps[4].outcome === 'blocked' && steps[5].outcome === 'allowed' ? 'protected' : 'exposed' }
    }
    case 'happy-path': {
      const steps: Step[] = []
      let rid = 0
      steps.push(await step('Officer An requests access to C-1001', () => { rid = requestAccess(U('officer_an'), 'C-1001', 'full_view', 'Process housing subsidy'); return `request #${rid} created` }, 'pending'))
      steps.push(await step('Supervisor Chi approves', () => voteAccess(U('supervisor_chi'), rid, 'approve'), 'pending'))
      steps.push(await step('Citizen Hoa approves', () => voteAccess(U('cz_hoa'), rid, 'approve')))
      steps.push(await step('Officer An opens the record', () => { const r = readRecord(U('officer_an'), 'C-1001'); return `${r.name} · income ${r.income.toLocaleString('en-US')} VND` }))
      let eid = 0
      steps.push(await step('Agency B asks only: is C-1001 income eligible?', () => { eid = requestAccess(U('agencyb_lan'), 'C-1001', 'eligibility_check', 'Verify income eligibility'); return `request #${eid} created` }, 'pending'))
      steps.push(await step('Supervisor Chi approves', () => voteAccess(U('supervisor_chi'), eid, 'approve'), 'pending'))
      steps.push(await step('Citizen Hoa approves', () => voteAccess(U('cz_hoa'), eid, 'approve')))
      steps.push(await step('Agency B receives the answer', () => `Agency B sees only ${JSON.stringify(eligibility(U('agencyb_lan'), 'C-1001'))}`))
      return { id, title: 'The legitimate flow, end to end', actor: 'Five people', threat: 'None. This is how access is meant to work.',
        rbac: 'Works too, but nobody except the officer knows the file was opened, and Agency B would get the whole file.', steps, verdict: steps.every(x => x.outcome !== 'blocked') ? 'protected' : 'exposed' }
    }
  }
  throw new Denied('No such scenario', 404)
}

export const SCENARIOS = ['out-of-scope', 'no-consent', 'self-approve', 'admin-escalation', 'quorum-commit', 'agency-overreach', 'forged-token', 'dba', 'ork-offline', 'happy-path']
export const PERSONAS = USERS
