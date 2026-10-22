import { USERS, userById, type User } from './auth'
import { db } from './db'
import { Denied, proposeChange, readRecord, requestAccess, voteAccess, voteChange, eligibility } from './guard'

export type Outcome = 'blocked' | 'allowed' | 'pending'
export interface Step { label: string; outcome: Outcome; message: string; code?: string }
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
    if (e instanceof Denied) return { label, outcome: 'blocked', message: e.message, code: e.code }
    throw e
  }
}

// Each scenario runs the real policy engine against the live demo database as a specific persona.
export async function runScenario(id: string): Promise<Scenario> {
  switch (id) {
    case 'out-of-scope': {
      const steps = [await step('Officer An opens C-1002 (assigned to Binh)', () => readRecord(U('officer_an'), 'C-1002'))]
      return { id, title: 'Officer opens a file outside their assignment', actor: 'An · Officer', threat: 'Insider snooping on a record that is not theirs.',
        rbac: 'A role check ("is an officer") passes, so the record is returned.', steps, verdict: steps[0].outcome === 'blocked' ? 'protected' : 'exposed' }
    }
    case 'no-consent': {
      const steps = [await step('Officer An opens their own case C-1003 with no approvals', () => readRecord(U('officer_an'), 'C-1003'))]
      return { id, title: 'Assigned officer skips the citizen', actor: 'An · Officer', threat: 'Assignment alone is treated as permission to read.',
        rbac: 'Assignment is the only gate, so the record opens without the citizen knowing.', steps, verdict: steps[0].outcome === 'blocked' ? 'protected' : 'exposed' }
    }
    case 'self-approve': {
      const an = U('officer_an')
      let rid = 0
      const a = await step('Officer An requests access to C-1003', () => { rid = requestAccess(an, 'C-1003', 'full_view', 'Lab: self-approval test'); return `request #${rid} created` }, 'pending')
      const b = await step('Officer An approves their own request', () => voteAccess(an, rid, 'approve'))
      return { id, title: 'Requester approves their own request', actor: 'An · Officer', threat: 'One person acting as both asker and approver.',
        rbac: 'A single "can_approve" flag lets the same account close the loop.', steps: [a, b], verdict: b.outcome === 'blocked' ? 'protected' : 'exposed' }
    }
    case 'admin-escalation': {
      const admin = U('admin_dung')
      let cid = 0
      const a = await step('Admin Dung proposes: assign Dung to C-1001', () => { cid = proposeChange(admin, 'assign', { caseId: 'C-1001', userId: admin.id }); return `change #${cid} created, not applied` }, 'pending')
      const b = await step('Admin Dung approves their own change', () => voteChange(admin, cid, 'approve'))
      const c = await step('Admin Dung opens C-1001 directly', () => readRecord(admin, 'C-1001'))
      return { id, title: 'Admin grants themselves access', actor: 'Dung · Admin', threat: 'Privileged account rewrites the policy that limits it.',
        rbac: 'The admin edits the assignments table and reads the record in one step.', steps: [a, b, c],
        verdict: b.outcome === 'blocked' && c.outcome === 'blocked' ? 'protected' : 'exposed' }
    }
    case 'agency-overreach': {
      const lan = U('agencyb_lan')
      const a = await step('Agency B tries to read the full record of C-1001', () => readRecord(lan, 'C-1001'))
      const b = await step('Agency B asks for eligibility without approvals', () => eligibility(lan, 'C-1001'))
      return { id, title: 'Second agency asks for more than it needs', actor: 'Lan · Agency B', threat: 'Data shared for one purpose gets reused for another.',
        rbac: 'A shared API key returns the whole file to any partner agency.', steps: [a, b],
        verdict: a.outcome === 'blocked' && b.outcome === 'blocked' ? 'protected' : 'exposed' }
    }
    case 'dba': {
      const rows = db().prepare('SELECT id, full_name_enc, income_enc FROM citizens LIMIT 1').all() as Record<string, string>[]
      const r = rows[0]
      const steps: Step[] = [{ label: 'DBA runs SELECT * FROM citizens', outcome: 'blocked',
        message: `${r.id} | ${r.full_name_enc.slice(0, 36)}… | ${r.income_enc.slice(0, 28)}…`, code: 'CIPHERTEXT_ONLY' }]
      return { id, title: 'DBA reads the database directly', actor: 'Tuan · DBA', threat: 'Infrastructure access is treated as data access.',
        rbac: 'Plaintext columns: the DBA reads every name, ID and income.', steps, verdict: 'protected' }
    }
  }
  throw new Denied('No such scenario', 404)
}

export const SCENARIOS = ['out-of-scope', 'no-consent', 'self-approve', 'admin-escalation', 'agency-overreach', 'dba']
export const PERSONAS = USERS
