'use client'
import { Eye, KeyRound, Lock, LockOpen, ShieldOff, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useApp } from '../app-context'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Empty, PageTitle, Panel, Status, Violation, Vote } from '../bits'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { CODE_TITLE, api, money, timeLeft, type R } from '@/lib/client'

type Access = { label: string; variant: 'ok' | 'warn' | 'danger' | 'outline' | 'info'; key: string }

export function Cases() {
  const { me, cases, reqs, now, selectCase, selectedCase } = useApp()
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  if (!me) return null

  const accessOf = (c: R): Access => {
    const mine = c.assignedTo.includes(me.id)
    if (me.role === 'officer') {
      if (!mine) return { label: 'Out of scope', variant: 'danger', key: 'out' }
      const g = c.grants.find((x: R) => x.kind === 'full_view')
      if (g) return { label: `Unlocked · ${timeLeft(g.expires_at - now)}`, variant: 'ok', key: 'open' }
      if (reqs.some(r => r.case_id === c.id && r.requester === me.id && r.status === 'pending')) return { label: 'Awaiting consent', variant: 'warn', key: 'wait' }
      return { label: 'Locked', variant: 'outline', key: 'locked' }
    }
    if (me.role === 'agency_b') {
      const g = c.grants.find((x: R) => x.kind === 'eligibility_check')
      if (g) return { label: `Result ready · ${timeLeft(g.expires_at - now)}`, variant: 'ok', key: 'open' }
      if (reqs.some(r => r.case_id === c.id && r.requester === me.id && r.status === 'pending')) return { label: 'Awaiting consent', variant: 'warn', key: 'wait' }
      return { label: 'Result only', variant: 'info', key: 'locked' }
    }
    if (me.role === 'citizen') return { label: 'Your record', variant: 'info', key: 'own' }
    return { label: 'No record access', variant: 'outline', key: 'none' }
  }

  const rows = useMemo(() => cases.filter(c => {
    const a = accessOf(c).key
    if (filter === 'mine' && !c.assignedTo.includes(me.id)) return false
    if (filter === 'wait' && a !== 'wait') return false
    if (filter === 'open' && a !== 'open') return false
    if (q && !`${c.id} ${c.title} ${c.assignedTo.join(' ')}`.toLowerCase().includes(q.toLowerCase())) return false
    return true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [cases, filter, q, reqs, now, me])

  const sel = cases.find(c => c.id === selectedCase) ?? null
  const FILTERS: [string, string][] = me.role === 'officer' || me.role === 'agency_b'
    ? [['all', 'All cases'], ['mine', 'Assigned to me'], ['wait', 'Awaiting consent'], ['open', 'Unlocked']] : [['all', 'All cases']]

  return (
    <>
      <PageTitle title="Cases">The case index is visible to everyone. The sensitive fields behind each case are not.</PageTitle>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,1fr)]">
        <Panel
          title={`${rows.length} case${rows.length === 1 ? '' : 's'}`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              {FILTERS.map(([k, l]) => (
                <button key={k} onClick={() => setFilter(k)} aria-pressed={filter === k}
                  className={`rounded-full border px-3 py-0.5 text-[12px] font-medium ${filter === k ? 'border-iris bg-iris text-white' : 'border-line text-soft hover:bg-iris-50'}`}>{l}</button>
              ))}
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search id or officer" aria-label="Search cases"
                className="w-40 rounded-[12px] border border-line px-3 py-1 text-[12px] placeholder:text-soft/70" />
            </div>
          }>
          <Table>
            <TableHeader><TableRow>
              {['Case', 'Citizen ref', 'Assigned to', 'Your access'].map(h => <TableHead key={h} className="text-soft">{h}</TableHead>)}
            </TableRow></TableHeader>
            <TableBody>
              {rows.length === 0 && <TableRow><TableCell colSpan={4}><Empty>No cases match.</Empty></TableCell></TableRow>}
              {rows.map(c => {
                const a = accessOf(c)
                return (
                  <TableRow key={c.id} onClick={() => selectCase(c.id)} className={`cursor-pointer hover:bg-iris-50 ${selectedCase === c.id ? 'bg-iris-100' : ''}`} tabIndex={0}
                    onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && selectCase(c.id)}>
                    <TableCell><div className="font-medium">{c.id}</div><div className="text-[12px] text-soft">{c.title.replace(' application', '')}</div></TableCell>
                    <TableCell className="mono">{c.citizen_id}</TableCell>
                    <TableCell>{c.assignedTo.length ? c.assignedTo.join(', ') : <span className="text-soft">unassigned</span>}</TableCell>
                    <TableCell><Badge variant={a.variant}>{a.key === 'open' ? <LockOpen /> : a.key === 'out' ? <ShieldOff /> : <Lock />}{a.label}</Badge></TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Panel>

        {sel ? <Detail c={sel} access={accessOf(sel)} key={sel.id} /> : (
          <Panel><Empty>Select a case to see its fields, who may open them, and what happens when you try.</Empty></Panel>
        )}
      </div>
    </>
  )
}

function Detail({ c, access }: { c: R; access: Access }) {
  const { me, act, reqs, notify, refresh, selectCase } = useApp()
  const [record, setRecord] = useState<R | null>(null)
  const [elig, setElig] = useState<R | null>(null)
  const [denial, setDenial] = useState<{ code: string; message: string } | null>(null)
  const mine = c.assignedTo.includes(me!.id)
  const myReqs = reqs.filter(r => r.case_id === c.id)

  const attempt = async (kind: 'record' | 'eligibility') => {
    setDenial(null)
    const r = await api(`${kind}?caseId=${c.id}`)
    if (r.ok) { kind === 'record' ? setRecord(r.data) : setElig(r.data); notify({ kind: 'success', title: 'Access granted', message: `Consent quorum verified for ${c.id}` }) }
    else { setDenial({ code: r.data.code, message: r.data.error }); notify({ kind: 'violation', title: 'Access denied', message: r.data.error, code: r.data.code }) }
    await refresh()
  }
  const fields: [string, string | null, string][] = [
    ['Full name', record?.name ?? null, 'enc'], ['National ID', record?.national_id ?? null, 'enc'],
    ['Monthly income', record ? money(record.income) : null, 'enc'], ['Address', record?.address ?? null, 'enc'],
  ]
  return (
    <Panel title={`${c.id} · ${c.title.replace(' application', '')}`} action={<Button variant="ghost" size="icon-xs" onClick={() => selectCase(null)} aria-label="Close"><X /></Button>}>
      <div className="flex flex-col gap-4 p-4">
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <Badge variant={access.variant}>{access.label}</Badge>
          <span className="text-soft">assigned to {c.assignedTo.join(', ') || '—'}</span>
        </div>

        <dl className="border border-line text-[13px]">
          {fields.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[120px_1fr] gap-3 border-b border-line px-3 py-2 last:border-b-0">
              <dt className="text-soft">{k}</dt>
              <dd className={v ? 'font-medium' : 'mono text-soft'}>{v ?? <span className="inline-flex items-center gap-1.5"><Lock className="size-3" />encrypted at rest</span>}</dd>
            </div>
          ))}
          <div className="grid grid-cols-[120px_1fr] gap-3 px-3 py-2">
            <dt className="text-soft">Health</dt>
            <dd className="text-soft">withheld: not needed for a housing subsidy</dd>
          </div>
        </dl>

        {elig && <div className="border border-ok/40 bg-ok-bg p-3 text-[13px]"><span className="font-medium text-ok">Income eligible: {elig.income_eligible ? 'yes' : 'no'}</span><div className="text-soft">This is everything Agency B receives. The file stays closed.</div></div>}
        {denial && <Violation code={denial.code} title={CODE_TITLE[denial.code] ?? 'Access denied'}>{denial.message}</Violation>}

        <div className="flex flex-wrap gap-2">
          {me!.role === 'officer' && mine && <>
            <Button onClick={() => act('request-access', { caseId: c.id, kind: 'full_view', purpose: 'Process housing subsidy' }, { title: 'Consent requested', message: 'Sent to the supervisor and the citizen' })}><KeyRound />Request access</Button>
            <Button variant="outline" onClick={() => attempt('record')}><Eye />Open record</Button>
          </>}
          {me!.role === 'officer' && !mine && <Button variant="destructive" onClick={() => attempt('record')}><ShieldOff />Open anyway (not assigned)</Button>}
          {me!.role === 'agency_b' && <>
            <Button onClick={() => act('request-access', { caseId: c.id, kind: 'eligibility_check', purpose: 'Verify income eligibility' }, { title: 'Consent requested', message: 'Sent to the supervisor and the citizen' })}><KeyRound />Request eligibility check</Button>
            <Button variant="outline" onClick={() => attempt('eligibility')}><Eye />Get result</Button>
            <Button variant="destructive" onClick={() => attempt('record')}><ShieldOff />Try full record</Button>
          </>}
          {(me!.role === 'supervisor' || me!.role === 'admin') && <Button variant="destructive" onClick={() => attempt('record')}><ShieldOff />Try to open record</Button>}
        </div>

        {myReqs.length > 0 && (
          <div>
            <h3 className="mb-2 text-[13px] font-medium">Consent on this case</h3>
            {myReqs.map(r => {
              const v = (role: string) => r.votes.find((x: R) => x.voter_role === role)?.decision
              const canVote = r.status === 'pending' && ((me!.role === 'supervisor') || (me!.role === 'citizen' && me!.citizenId === r.citizen_id)) && !r.votes.some((x: R) => x.voter === me!.id)
              return (
                <div key={r.id} className="flex flex-wrap items-center gap-3 border-t border-line py-2 text-[13px]">
                  <span className="mono">#{r.id}</span>
                  <span className="flex-1">{r.kind === 'full_view' ? 'Full view' : 'Eligibility'} · by {r.requester}</span>
                  <Vote role="Supervisor" v={v('supervisor')} /><Vote role="Citizen" v={v('citizen')} />
                  <Status s={r.status} />
                  {canVote && <>
                    <Button size="sm" onClick={() => act('vote-access', { id: r.id, decision: 'approve' }, { title: 'Vote recorded', message: `You approved request #${r.id}` })}>Approve</Button>
                    <Button size="sm" variant="destructive" onClick={() => act('vote-access', { id: r.id, decision: 'deny' }, { title: 'Request denied', message: `You denied request #${r.id}` })}>Deny</Button>
                  </>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Panel>
  )
}
