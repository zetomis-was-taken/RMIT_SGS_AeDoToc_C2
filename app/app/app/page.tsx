'use client'
import { ArrowRight, Check, Sparkles, X } from 'lucide-react'
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
      todo.push({
        key: `r${r.id}`,
        text: `${r.requester} asks to ${r.kind === 'full_view' ? 'open the record of' : 'check eligibility for'} ${r.case_id}`,
        sub: r.purpose,
        actions: (
          <div className="flex gap-2">
            <Button size="sm" variant="default" onClick={() => act('vote-access', { id: r.id, decision: 'approve' }, { title: 'Vote recorded', message: `You approved request #${r.id}` })}><Check />Approve</Button>
            <Button size="sm" variant="destructive" onClick={() => act('vote-access', { id: r.id, decision: 'deny' }, { title: 'Request denied', message: `You denied request #${r.id}` })}><X />Deny</Button>
          </div>
        )
      })
    }
  }
  if (role === 'supervisor') {
    for (const c of pendingChanges) {
      if (c.votes.some((v: any) => v.voter === me.id)) continue
      todo.push({
        key: `c${c.id}`,
        text: `${c.requester} proposes: ${describeChange(c)}`,
        sub: `Policy change #${c.id} · needs ${c.quorum} supervisors`,
        actions: (
          <div className="flex gap-2">
            <Button size="sm" variant="default" onClick={() => act('vote-change', { id: c.id, decision: 'approve' }, { title: 'Vote recorded', message: `You approved change #${c.id}` })}><Check />Approve</Button>
            <Button size="sm" variant="destructive" onClick={() => act('vote-change', { id: c.id, decision: 'deny' }, { title: 'Change rejected', message: `You rejected change #${c.id}` })}><X />Reject</Button>
          </div>
        )
      })
    }
  }
  if (role === 'officer' || role === 'agency_b') {
    for (const g of grants) {
      todo.push({
        key: `g${g.caseId}${g.kind}`,
        text: `${g.caseId} is unlocked for you`,
        sub: `${g.kind === 'full_view' ? 'Full view' : 'Eligibility result'} · closes in ${timeLeft(g.expires_at - now)}`,
        actions: (
          <Link href={`/app/cases/${g.caseId}`} className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/40 bg-gradient-to-r from-[#2727e6] to-[#3b5bf5] px-4 py-1.5 text-[13px] font-semibold text-white shadow-[0_0_15px_rgba(39,39,230,0.4)] hover:shadow-[0_0_25px_rgba(39,39,230,0.6)]">
            Open <ArrowRight className="size-3.5" />
          </Link>
        )
      })
    }
    for (const r of pendingReqs) {
      todo.push({
        key: `w${r.id}`,
        text: `Waiting on approvals for ${r.case_id}`,
        sub: `Request #${r.id} · supervisor and citizen must both approve`,
        actions: <Status s="pending" />
      })
    }
  }
  if (role === 'admin') {
    for (const c of pendingChanges) {
      todo.push({
        key: `a${c.id}`,
        text: `Your change #${c.id} is blocked until ${c.quorum} supervisors approve`,
        sub: describeChange(c),
        actions: <Status s="pending" />
      })
    }
  }

  const by = (k: string) => log.filter(l => l.decision === k).length
  const bars: [string, number, string][] = [
    ['Allowed', by('ALLOW'), 'from-blue-600 to-[#3b5bf5]'],
    ['Denied', by('DENY'), 'from-rose-600 to-rose-400'],
    ['Pending', by('PENDING'), 'from-amber-600 to-amber-400'],
    ['Info', by('INFO'), 'from-cyan-600 to-cyan-400']
  ]
  const max = Math.max(1, ...bars.map(b => b[1]))
  const reqBy = (k: string) => reqs.filter(r => r.status === k).length
  const feed = log.filter(l => l.action !== 'login').slice(0, 8)

  return (
    <>
      <PageTitle title={`${hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'}, ${me.name.split(' ')[0]}.`}>
        <span className="font-semibold text-gray-900">{ROLE_LABEL[role]}</span> — {ROLE_BLURB[role]}
      </PageTitle>

      <div className="grid items-start gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Needs your action" action={<span className="num text-[12px] font-bold text-blue-700 rounded-full bg-blue-50 border border-blue-200 px-3 py-0.5">{todo.length} open</span>}>
          {todo.length === 0 ? (
            <div className="px-6 py-16 text-center text-[14px] text-gray-500">
              <Sparkles className="size-6 text-[#2727e6] mx-auto mb-2 opacity-60" />
              Nothing is waiting on you. All quorum approvals are settled.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {todo.map(t => (
                <div key={t.key} className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-gray-50">
                  <div className="min-w-[240px] flex-1">
                    <div className="text-[15px] font-semibold tracking-tight text-gray-900">{t.text}</div>
                    <div className="text-[13px] text-gray-500 mt-0.5">{t.sub}</div>
                  </div>
                  <div>{t.actions}</div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <div className="grid grid-cols-2 gap-3.5">
          {([
            ['Cases in index', cases.length, 'Total registered records', 'border-blue-200'],
            ['Pending consent', pendingReqs.length, 'Awaiting quorum vote', 'border-amber-200'],
            ['Active grants', grants.length, '15-min session active', 'border-emerald-200'],
            ['Denied attempts', denied, 'Logged in audit chain', 'border-rose-200']
          ] as const).map(([l, n, h, borderCol]) => (
            <div
              key={l}
              className={`group relative overflow-hidden rounded-2xl border ${borderCol} bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-md`}
            >
              <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{l}</div>
              <div className="num text-[42px] leading-none font-bold tracking-tight text-gray-900 mt-2 group-hover:text-[#2727e6] transition-colors">{n}</div>
              <div className="mt-2 text-[12px] text-gray-500">{h}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-2">
        <Panel title="Decisions in your log">
          <div className="flex flex-col gap-4 p-6">
            {bars.map(([l, n, grad]) => (
              <div key={l} className="grid grid-cols-[80px_1fr_36px] items-center gap-3 text-[13px]">
                <span className="font-semibold text-gray-700">{l}</span>
                <div className="h-3 rounded-full bg-gray-100 overflow-hidden p-0.5 border border-gray-200">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${grad} transition-[width] duration-500`}
                    style={{ width: `${Math.max(4, (n / max) * 100)}%` }}
                  />
                </div>
                <span className="num text-right font-bold text-gray-900">{n}</span>
              </div>
            ))}
            {role !== 'admin' && (
              <div className="mt-2 border-t border-gray-100 pt-5">
                <div className="mb-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Consent requests by outcome</div>
                <div className="flex h-9 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 text-[12px] font-semibold text-white">
                  {([['granted', 'bg-emerald-600/70'], ['pending', 'bg-blue-600/70'], ['denied', 'bg-rose-600/70']] as const).map(([k, c]) => reqBy(k) > 0 && (
                    <div key={k} className={`${c} flex items-center justify-center tracking-wide`} style={{ flex: reqBy(k) }}>
                      {k} ({reqBy(k)})
                    </div>
                  ))}
                  {reqs.length === 0 && <div className="flex flex-1 items-center justify-center text-gray-400 text-xs">No requests yet</div>}
                </div>
              </div>
            )}
          </div>
        </Panel>

        <Panel
          title="Recent activity"
          action={
            <Link href="/app/audit" className="t-nav inline-flex items-center gap-1.5 text-xs text-[#2727e6] hover:text-[#1a1db8] transition-colors">
              Full log <ArrowRight className="size-3.5" />
            </Link>
          }
        >
          {feed.length === 0 ? (
            <Empty>No activity yet. Try opening a case.</Empty>
          ) : (
            <ol className="p-6 divide-y divide-gray-100">
              {feed.map((l) => (
                <li key={l.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span className={`size-2.5 shrink-0 rounded-full ${
                    l.decision === 'DENY' 
                      ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' 
                      : l.decision === 'ALLOW' 
                      ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' 
                      : 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]'
                  }`} />
                  <div className="min-w-0 flex-1 text-[13px]">
                    <div className="truncate text-gray-900 font-medium">
                      <b className="text-gray-900">{l.actor}</b> · {l.action.replaceAll('_', ' ')} <span className="mono text-[#2727e6] font-mono text-xs">{l.target !== '-' ? l.target : ''}</span>
                    </div>
                    <div className="truncate text-gray-500 text-xs">{l.detail || '—'}</div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Status s={l.decision} />
                    <span className="text-[11px] text-gray-500">{ago(l.at)}</span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>

      <Panel className="mt-5" title="Access Matrix — Who can see what" action={<span className="hidden text-[12px] text-gray-500 sm:inline">Cryptographically enforced on the server.</span>}>
        <Table>
          <TableHeader>
            <TableRow>
              {['Role', 'Full Name', 'Monthly Income', 'National ID', 'Medical & Health'].map(h => (
                <TableHead key={h}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {MATRIX.map(([r, ...cells]) => {
              const isCurrentRole = r === role
              return (
                <TableRow
                  key={r}
                  className={isCurrentRole ? 'bg-blue-50 border-blue-200 hover:bg-blue-100/70' : ''}
                >
                  <TableCell className="font-semibold text-gray-900">
                    <span className="flex items-center gap-2">
                      {MATRIX_LABEL[r]}
                      {isCurrentRole && (
                        <span className="rounded-full bg-blue-100 border border-blue-300 px-2 py-0.5 text-[10px] font-bold tracking-wider text-blue-700 uppercase">
                          YOU
                        </span>
                      )}
                    </span>
                  </TableCell>
                  {cells.map((c, i) => (
                    <TableCell
                      key={i}
                      className={
                        c === 'No access'
                          ? 'text-gray-400'
                          : c === 'Ciphertext'
                          ? 'font-mono text-xs text-[#2727e6] bg-blue-50 rounded'
                          : 'font-semibold text-gray-700'
                      }
                    >
                      {c}
                    </TableCell>
                  ))}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Panel>
    </>
  )
}
