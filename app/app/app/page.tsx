'use client'
import { ArrowRight, Check, X } from 'lucide-react'
import Link from 'next/link'
import { useApp } from '@/components/app-context'
import { Button } from '@/components/ui/button'
import { Empty, PageTitle, Panel, Status } from '@/components/bits'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ROLE_BLURB, ROLE_LABEL, ago, describeChange, timeLeft } from '@/lib/client'

const MATRIX: [string, string, string, string, string][] = [
  ['officer', 'After consent', 'After consent', 'After consent', 'Withheld'],
  ['supervisor', 'No access', 'No access', 'No access', 'No access'],
  ['citizen', 'Own record', 'Own record', 'Own record', 'Own record'],
  ['agency_b', 'No access', 'Result only', 'No access', 'No access'],
  ['admin', 'No access', 'No access', 'No access', 'No access'],
  ['dba', 'Ciphertext', 'Ciphertext', 'Ciphertext', 'Ciphertext'],
]
const MATRIX_LABEL: Record<string, string> = { ...ROLE_LABEL, dba: 'DBA / infrastructure' }

export default function Overview() {
  const { me, cases, reqs, changes, log, now, act } = useApp()
  if (!me) return null
  const role = me.role
  const pendingReqs = reqs.filter(r => r.status === 'pending')
  const pendingChanges = changes.filter(c => c.status === 'pending')
  const grants = cases.flatMap(c => c.grants.map((g: any) => ({ ...g, caseId: c.id }))).filter((g: any) => g.expires_at > now)
  const denied = log.filter(l => l.decision === 'DENY').length
  const hour = new Date().getHours()

  const todo: { key: string; text: string; sub: string; actions: React.ReactNode }[] = []
  if (role === 'supervisor' || role === 'citizen') {
    for (const r of pendingReqs) {
      if (r.votes.some((v: any) => v.voter === me.id)) continue
      todo.push({ key: `r${r.id}`, text: `${r.requester} asks to ${r.kind === 'full_view' ? 'open the record of' : 'check eligibility for'} ${r.case_id}`, sub: r.purpose,
        actions: <>
          <Button size="sm" variant="inverse" onClick={() => act('vote-access', { id: r.id, decision: 'approve' }, { title: 'Vote recorded', message: `You approved request #${r.id}` })}><Check />Approve</Button>
          <Button size="sm" variant="destructive" className="border-white/50 bg-transparent text-white hover:bg-white/10 hover:text-white" onClick={() => act('vote-access', { id: r.id, decision: 'deny' }, { title: 'Request denied', message: `You denied request #${r.id}` })}><X />Deny</Button>
        </> })
    }
  }
  if (role === 'supervisor') {
    for (const c of pendingChanges) {
      if (c.votes.some((v: any) => v.voter === me.id)) continue
      todo.push({ key: `c${c.id}`, text: `${c.requester} proposes: ${describeChange(c)}`, sub: `Policy change #${c.id} · needs ${c.quorum} supervisors`,
        actions: <>
          <Button size="sm" variant="inverse" onClick={() => act('vote-change', { id: c.id, decision: 'approve' }, { title: 'Vote recorded', message: `You approved change #${c.id}` })}><Check />Approve</Button>
          <Button size="sm" variant="destructive" className="border-white/50 bg-transparent text-white hover:bg-white/10 hover:text-white" onClick={() => act('vote-change', { id: c.id, decision: 'deny' }, { title: 'Change rejected', message: `You rejected change #${c.id}` })}><X />Reject</Button>
        </> })
    }
  }
  if (role === 'officer' || role === 'agency_b') {
    for (const g of grants) todo.push({ key: `g${g.caseId}${g.kind}`, text: `${g.caseId} is unlocked for you`, sub: `${g.kind === 'full_view' ? 'Full view' : 'Eligibility result'} · closes in ${timeLeft(g.expires_at - now)}`,
      actions: <Link href={`/app/cases/${g.caseId}`} className="inline-flex items-center gap-1.5 rounded-[4px] bg-white px-3 py-1.5 text-[13px] font-semibold text-graphite hover:shadow-lift">Open <ArrowRight className="size-4" /></Link> })
    for (const r of pendingReqs) todo.push({ key: `w${r.id}`, text: `Waiting on approvals for ${r.case_id}`, sub: `Request #${r.id} · supervisor and citizen must both approve`, actions: <Status s="pending" /> })
  }
  if (role === 'admin') {
    for (const c of pendingChanges) todo.push({ key: `a${c.id}`, text: `Your change #${c.id} is blocked until ${c.quorum} supervisors approve`, sub: describeChange(c), actions: <Status s="pending" /> })
  }

  const by = (k: string) => log.filter(l => l.decision === k).length
  const bars: [string, number][] = [['Allowed', by('ALLOW')], ['Denied', by('DENY')], ['Pending', by('PENDING')], ['Info', by('INFO')]]
  const max = Math.max(1, ...bars.map(b => b[1]))
  const reqBy = (k: string) => reqs.filter(r => r.status === k).length
  const feed = log.filter(l => l.action !== 'login').slice(0, 8)

  return (
    <>
      <PageTitle title={`${hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'}, ${me.name.split(' ')[0]}.`}>
        {ROLE_LABEL[role]}. {ROLE_BLURB[role]}
      </PageTitle>

      <div className="grid items-start gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Panel dark title="Needs your action" action={<span className="num text-[13px] text-white/60">{todo.length} open</span>}>
          {todo.length === 0 ? <div className="px-5 py-14 text-center text-[14px] text-white/60">Nothing is waiting on you.</div> : todo.map(t => (
            <div key={t.key} className="flex flex-wrap items-center gap-3 border-b border-white/10 px-5 py-4 last:border-b-0">
              <div className="min-w-[220px] flex-1">
                <div className="text-[15px] font-semibold tracking-[-0.01em]">{t.text}</div>
                <div className="text-[13px] text-white/60">{t.sub}</div>
              </div>
              <div className="flex gap-2">{t.actions}</div>
            </div>
          ))}
        </Panel>

        <div className="grid grid-cols-2 gap-4">
          {([['Cases', cases.length, 'in the index'], ['Pending consent', pendingReqs.length, 'requests'], ['Open grants', grants.length, 'for you, 15 min'], ['Denied', denied, 'in your log']] as const).map(([l, n, h]) => (
            <div key={l} className="rounded-[8px] bg-white p-4">
              <div className="text-[12px] font-semibold text-ash">{l}</div>
              <div className="num text-[44px] leading-none font-bold tracking-[-0.05em]">{n}</div>
              <div className="mt-1 text-[12px] text-ash">{h}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
        <Panel title="Decisions in your log">
          <div className="flex flex-col gap-3 p-5">
            {bars.map(([l, n]) => (
              <div key={l} className="grid grid-cols-[72px_1fr_32px] items-center gap-3 text-[13px]">
                <span className="font-semibold">{l}</span>
                <div className="h-3 rounded-[2px] bg-canvas"><div className={`h-full rounded-[2px] transition-[width] duration-500 ${l === 'Denied' ? 'bg-black' : l === 'Allowed' ? 'bg-graphite' : 'bg-[#9a9a9a]'}`} style={{ width: `${(n / max) * 100}%` }} /></div>
                <span className="num text-right">{n}</span>
              </div>
            ))}
            {role !== 'admin' && (
              <div className="mt-2 border-t border-rule pt-4">
                <div className="mb-2 text-[12px] font-semibold text-ash">Consent requests by outcome</div>
                <div className="flex h-8 overflow-hidden rounded-[4px] bg-canvas text-[12px] font-semibold text-white">
                  {([['granted', 'bg-graphite'], ['pending', 'bg-[#9a9a9a]'], ['denied', 'bg-black']] as const).map(([k, c]) => reqBy(k) > 0 && <div key={k} className={`${c} flex items-center justify-center`} style={{ flex: reqBy(k) }}>{k} {reqBy(k)}</div>)}
                  {reqs.length === 0 && <div className="flex flex-1 items-center justify-center text-ash">no requests yet</div>}
                </div>
              </div>
            )}
          </div>
        </Panel>

        <Panel title="Recent activity" action={<Link href="/app/audit" className="t-nav inline-flex items-center gap-1 underline underline-offset-4">All <ArrowRight className="size-3.5" /></Link>}>
          {feed.length === 0 ? <Empty>No activity yet. Try opening a case.</Empty> : (
            <ol className="p-5">
              {feed.map((l, i) => (
                <li key={l.id} className="relative flex gap-3 pb-4 last:pb-0">
                  {i < feed.length - 1 && <span className="absolute top-4 bottom-0 left-[5px] w-px bg-rule" aria-hidden />}
                  <span className={`relative mt-1.5 size-[11px] shrink-0 rounded-full border-2 border-ink ${l.decision === 'DENY' ? 'bg-black' : l.decision === 'ALLOW' ? 'bg-white' : 'bg-canvas'}`} />
                  <div className="min-w-0 flex-1 text-[13px]">
                    <div className="truncate"><b>{l.actor}</b> · {l.action.replaceAll('_', ' ')} <span className="mono">{l.target !== '-' ? l.target : ''}</span></div>
                    <div className="truncate text-ash">{l.detail || '—'}</div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1"><Status s={l.decision} /><span className="text-[11px] text-ash">{ago(l.at)}</span></div>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>

      <Panel className="mt-4" title="Who can see what" action={<span className="hidden text-[12px] text-ash sm:inline">Enforced on the server. Your row is outlined.</span>}>
        <Table>
          <TableHeader><TableRow>{['Role', 'Name', 'Income', 'National ID', 'Health'].map(h => <TableHead key={h} className="text-ash">{h}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {MATRIX.map(([r, ...cells]) => (
              <TableRow key={r} className={r === role ? 'outline-2 -outline-offset-2 outline-ink' : ''}>
                <TableCell className="font-semibold">{MATRIX_LABEL[r]}{r === role && <span className="ml-2 text-[11px] font-bold text-ash">YOU</span>}</TableCell>
                {cells.map((c, i) => <TableCell key={i} className={c === 'No access' ? 'text-ash' : c === 'Ciphertext' ? 'font-mono text-[12px]' : 'font-semibold'}>{c}</TableCell>)}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>
    </>
  )
}
