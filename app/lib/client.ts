export type U = { id: string; name: string; role: string; citizenId?: string }
export type R = Record<string, any>

export const api = async (action: string, body?: R) => {
  const r = await fetch(`/api/guard/${action}`, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : undefined)
  const j = await r.json().catch(() => ({}))
  return { ok: r.ok, status: r.status, data: j }
}

export const ROLE_LABEL: Record<string, string> = {
  officer: 'Case officer', supervisor: 'Supervisor', admin: 'System admin', citizen: 'Citizen', agency_b: 'Agency B officer',
}
export const ROLE_BLURB: Record<string, string> = {
  officer: 'Processes cases assigned to them. Needs supervisor and citizen consent to open a record.',
  supervisor: 'Co-approves record access and policy changes. Cannot read records.',
  citizen: 'Owns the record. Nothing about it opens without their approval.',
  admin: 'Runs the system. Can propose policy changes but cannot approve them or read records.',
  agency_b: 'Second agency. Receives a yes/no answer, never the file.',
}
export const CODE_TITLE: Record<string, string> = {
  OUT_OF_SCOPE: 'Out of scope',
  LOCKED_NO_CONSENT: 'Locked: consent missing',
  SELF_APPROVAL_BLOCKED: 'Self-approval blocked',
  NOT_AN_APPROVER: 'Not an approver',
  ADMIN_ONLY: 'Admin only',
  ROLE_NOT_ALLOWED: 'Role not allowed',
  ALREADY_RESOLVED: 'Already resolved',
  NOT_FOUND: 'Not found',
  FORBIDDEN: 'Forbidden',
  CIPHERTEXT_ONLY: 'Ciphertext only',
}
export const money = (n: number) => n.toLocaleString('en-US') + ' VND'
export const timeLeft = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
export const ago = (t: number) => {
  const s = Math.floor((Date.now() - t) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return new Date(t).toLocaleTimeString()
}
export const describeChange = (c: R) =>
  c.change === 'assign' ? `Assign ${c.payload.userId} to ${c.payload.caseId}` : `Set approvals required to ${c.payload.value}`
