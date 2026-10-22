'use client'
import { ArrowRight, Check, X } from 'lucide-react'
import { useApp } from '../app-context'
import { Button } from '../ui/button'
import { Empty, PageTitle, Panel, Status } from '../bits'
import { ROLE_BLURB, ROLE_LABEL, ago, describeChange, timeLeft } from '@/lib/client'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'

const MATRIX: [string, string, string, string, string][] = [
  ['Assigned officer', 'After consent', 'After consent', 'After consent', 'Withheld'],
  ['Supervisor', 'No access', 'No access', 'No access', 'No access'],
  ['Citizen (owner)', 'Consents', 'Consents', 'Consents', 'Consents'],
  ['Agency B', 'No access', 'Result only', 'No access', 'No access'],
  ['System admin', 'No access', 'No access', 'No access', 'No access'],
  ['DBA / infrastructure', 'Ciphertext', 'Ciphertext', 'Ciphertext', 'Ciphertext'],
]

export function Overview() {
  const { me, cases, reqs, changes, log, now, act, setView, setAuditFilter, selectCase } = useApp()
  if (!me) return null
  const role = me.role
  const pendingReqs = reqs.filter(r => r.status === 'pending')
  const pendingChanges = changes.filter(c => c.status === 'pending')
  const grants = cases.flatMap(c => c.grants.map((g: any) => ({ ...g, caseId: c.id }))).filter((g: any) => g.expires_at > now)
  const denied = log.filter(l => l.decision === 'DENY')

  // what is waiting on THIS person
  const todo: { key: string; text: string; sub: string; actions: React.ReactNode }[] = []
  if (role === 'supervisor' || role === 'citizen') {
    for (const r of pendingReqs) {
      if (r.votes.some((v: any) => v.voter === me.id)) continue
      todo.push({
        key: `r${r.id}`, text: `${r.requester} asks to ${r.kind === 'full_view' ? 'open the record of' : 'check eligibility for'} ${r.case_id}`, sub: r.purpose,
        actions: <>
          <Button size="sm" onClick={() => act('vote-access', { id: r.id, decision: 'approve' }, { title: 'Vote recorded', message: `You approved request #${r.id}` })}><Check />Approve</Button>
          <Button size="sm" variant="destructive" onClick={() => act('vote-access', { id: r.id, decision: 'deny' }, { title: 'Request denied', message: `You denied request #${r.id}` })}><X />Deny</Button>
        </>,
      })
    }
  }
  if (role === 'supervisor') {
    for (const c of pendingChanges) {
      if (c.votes.some((v: any) => v.voter === me.id)) continue
      todo.push({
        key: `c${c.id}`, text: `${c.requester} proposes: ${describeChange(c)}`, sub: `Policy change #${c.id} · needs ${c.quorum} supervisors`,
        actions: <>
          <Button size="sm" onClick={() => act('vote-change', { id: c.id, decision: 'approve' }, { title: 'Vote recorded', message: `You approved change #${c.id}` })}><Check />Approve</Button>
          <Button size="sm" variant="destructive" onClick={() => act('vote-change', { id: c.id, decision: 'deny' }, { title: 'Change rejected', message: `You rejected change #${c.id}` })}><X />Reject</Button>
        </>,
      })
    }
  }
  if (role === 'officer' || role === 'agency_b') {
    for (const g of grants) todo.push({
      key: `g${g.caseId}${g.kind}`, text: `${g.caseId} is unlocked for you`, sub: `${g.kind === 'full_view' ? 'Full view' : 'Eligibility result'} · expires in ${timeLeft(g.expires_at - now)}`,
      actions: <Button size="sm" onClick={() => { selectCase(g.caseId); setView('cases') }}>Open <ArrowRight /></Button>,
    })
    for (const r of pendingReqs) todo.push({
      key: `w${r.id}`, text: `Waiting on approvals for ${r.case_id}`, sub: `Request #${r.id} · supervisor and citizen must both approve`, actions: <Status s="pending" />,
    })
  }
  if (role === 'admin') {
    for (const c of pendingChanges) todo.push({
      key: `a${c.id}`, text: `Your change #${c.id} is blocked until ${c.quorum} supervisors approve`, sub: describeChange(c), actions: <Status s="pending" />,
    })
  }

  const stats: [string, number, string][] = [
    ['Cases in index', cases.length, 'metadata only'],
    ['Consents pending', pendingReqs.length, 'across requests'],
    ['Active grants', grants.length, 'for you, 15-minute window'],
    ['Denied attempts', denied.length, 'in the audit log'],
  ]

  return (
    <>
      <PageTitle title={`Hello, ${me.name.split(' ')[0]}`}>{ROLE_LABEL[role]}. {ROLE_BLURB[role]}</PageTitle>

      <div className="mb-6 grid grid-cols-2 border border-line md:grid-cols-4">
        {stats.map(([label, n, hint], i) => (
          <div key={label} className={`p-4 ${i % 2 ? 'border-l border-line' : ''} ${i > 1 ? 'border-t border-line md:border-t-0' : ''} ${i > 0 ? 'md:border-l' : ''}`}>
            <div className="text-[12px] text-soft">{label}</div>
            <div className="num text-[28px] leading-tight font-medium text-iris">{n}</div>
            <div className="text-[12px] text-soft">{hint}</div>
          </div>
        ))}
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[3fr_2fr]">
        <Panel title="Needs your action">
          {todo.length === 0 ? <Empty>Nothing is waiting on you.</Empty> : todo.map(t => (
            <div key={t.key} className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
              <div className="min-w-[220px] flex-1">
                <div className="text-[14px] font-medium">{t.text}</div>
                <div className="text-[12px] text-soft">{t.sub}</div>
              </div>
              <div className="flex gap-2">{t.actions}</div>
            </div>
          ))}
        </Panel>

        <Panel title="Recent activity" action={<Button variant="ghost" size="xs" onClick={() => { setAuditFilter('all'); setView('audit') }}>All <ArrowRight /></Button>}>
          {log.filter(l => l.action !== 'login').length === 0 ? <Empty>No activity yet.</Empty> : log.filter(l => l.action !== 'login').slice(0, 7).map(l => (
            <div key={l.id} className="flex items-start gap-3 border-b border-line px-4 py-2.5 text-[13px] last:border-b-0">
              <div className="min-w-0 flex-1">
                <div className="truncate"><span className="font-medium">{l.actor}</span> · {l.action.replaceAll('_', ' ')} {l.target !== '-' && <span className="mono">{l.target}</span>}</div>
                <div className="truncate text-[12px] text-soft">{l.detail || '—'}</div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1"><Status s={l.decision} /><span className="text-[11px] text-soft">{ago(l.at)}</span></div>
            </div>
          ))}
        </Panel>
      </div>

      <Panel className="mt-6" title="Who can see what" action={<span className="text-[12px] text-soft">Enforced server-side, not by hiding buttons</span>}>
        <Table>
          <TableHeader><TableRow>{['Role', 'Name', 'Income', 'National ID', 'Health'].map(h => <TableHead key={h} className="text-soft">{h}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {MATRIX.map(([role, ...cells]) => (
              <TableRow key={role}>
                <TableCell className="font-medium">{role}</TableCell>
                {cells.map((c, i) => (
                  <TableCell key={i} className={c === 'No access' ? 'text-soft' : c === 'Ciphertext' ? 'text-danger' : c === 'Result only' ? 'text-warn' : 'text-ok'}>{c}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>
    </>
  )
}
