import { timeLeft, type R } from './client'

export function accessOf(me: { id: string; role: string }, c: R, reqs: R[], now: number) {
  const mine = c.assignedTo.includes(me.id)
  const waiting = reqs.some(r => r.case_id === c.id && r.requester === me.id && r.status === 'pending')
  if (me.role === 'officer') {
    if (!mine) return { label: 'Out of scope', key: 'out', variant: 'danger' as const }
    const g = c.grants.find((x: R) => x.kind === 'full_view')
    if (g) return { label: `Unlocked · ${timeLeft(g.expires_at - now)}`, key: 'open', variant: 'ok' as const }
    return waiting ? { label: 'Awaiting consent', key: 'wait', variant: 'warn' as const } : { label: 'Locked', key: 'locked', variant: 'outline' as const }
  }
  if (me.role === 'agency_b') {
    const g = c.grants.find((x: R) => x.kind === 'eligibility_check')
    if (g) return { label: `Result ready · ${timeLeft(g.expires_at - now)}`, key: 'open', variant: 'ok' as const }
    return waiting ? { label: 'Awaiting consent', key: 'wait', variant: 'warn' as const } : { label: 'Result only', key: 'locked', variant: 'info' as const }
  }
  if (me.role === 'citizen') return { label: 'Your record', key: 'own', variant: 'ok' as const }
  return { label: 'No record access', key: 'none', variant: 'outline' as const }
}
