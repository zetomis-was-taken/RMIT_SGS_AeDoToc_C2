'use client'
import { ArrowLeft, Eye, KeyRound, Lock, LockOpen, ShieldOff } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { useApp } from '@/components/app-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Empty, Panel, Status, Violation, Vote } from '@/components/bits'
import { accessOf } from '@/lib/case-access'
import { CODE_TITLE, ago, api, money, timeLeft, type R } from '@/lib/client'

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>()
  const { me, cases, reqs, log, now, act, notify, refresh, booted } = useApp()
  const [record, setRecord] = useState<R | null>(null)
  const [elig, setElig] = useState<R | null>(null)
  const [denial, setDenial] = useState<{ code: string; message: string } | null>(null)
  if (!me) return null
  const c = cases.find(x => x.id === id)
  if (!c) return (
    <div className="pt-6"><Link href="/app/cases" className="t-nav inline-flex items-center gap-1 underline underline-offset-4"><ArrowLeft className="size-4" />All cases</Link>
      <Panel className="mt-6"><Empty loading={!booted}>{booted ? `No case ${id} is visible to you.` : 'Loading case…'}</Empty></Panel></div>
  )
  const access = accessOf(me, c, reqs, now)
  const mine = c.assignedTo.includes(me.id)
  const myReqs = reqs.filter(r => r.case_id === c.id)
  const ids = new Set([c.id, ...myReqs.map(r => String(r.id))])
  const timeline = log.filter(l => ids.has(l.target)).slice(0, 12)
  const grant = c.grants[0]

  const attempt = async (kind: 'record' | 'eligibility') => {
    setDenial(null)
    const r = await api(`${kind}?caseId=${c.id}`)
    if (r.ok) { kind === 'record' ? setRecord(r.data) : setElig(r.data); notify({ kind: 'success', title: 'Access granted', message: `Consent quorum verified for ${c.id}` }) }
    else { setDenial({ code: r.data.code, message: r.data.error }); notify({ kind: 'violation', title: 'Access denied', message: r.data.error, code: r.data.code }) }
    await refresh()
  }

  // one sentence telling this person what happens next
  const next = (() => {
    const pend = myReqs.find(r => r.status === 'pending')
    if (me.role === 'officer') {
      if (!mine) return 'This case is assigned to someone else. You can see it exists, nothing more.'
      if (grant) return `Unlocked for ${timeLeft(grant.expires_at - now)}. Open the record before the window closes.`
      if (pend) return 'Waiting for the supervisor and the citizen. Nothing opens until both approve.'
      return 'Locked. Request access: the supervisor and the citizen must both approve before you can read anything.'
    }
    if (me.role === 'agency_b') return grant ? 'Approved. You can fetch the yes/no answer.' : pend ? 'Waiting for the supervisor and the citizen.' : 'You may ask one question: is the income eligible? You will never receive the file.'
    if (me.role === 'citizen') return pend ? 'Someone is asking to use your record. You decide below.' : 'Nothing is requested right now. You can read your own record at any time.'
    if (me.role === 'supervisor') return pend ? 'A request is waiting for your vote. The citizen must agree as well.' : 'Supervisors approve access but never read records.'
    return 'Admins manage the system, not the data. Try to open the record to see what the server says.'
  })()

  const fields: [string, string | null][] = [
    ['Full name', record?.name ?? null], ['National ID', record?.national_id ?? null],
    ['Monthly income', record ? money(record.income) : null], ['Address', record?.address ?? null],
  ]

  return (
    <div className="pt-6">
      <Link href="/app/cases" className="t-nav inline-flex items-center gap-1 underline underline-offset-4"><ArrowLeft className="size-4" />All cases</Link>
      <div className="mt-4 mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="t-title">{c.id}</h1>
          <p className="mt-2 text-ash">{c.title.replace(' application', '')} · citizen <span className="mono">{c.citizen_id}</span> · assigned to {c.assignedTo.join(', ') || '—'}</p>
        </div>
        <Badge variant={access.variant} className="px-2.5 py-1 text-[13px]">{access.key === 'open' ? <LockOpen /> : access.key === 'out' ? <ShieldOff /> : <Lock />}{access.label}</Badge>
      </div>

      <div className="mb-4 rounded-[8px] bg-ink p-5 text-white">
        <div className="text-[11px] font-bold tracking-[0.1em] text-white/50 uppercase">What happens next</div>
        <p className="mt-1 max-w-[70ch] text-[18px] leading-[1.35] font-semibold tracking-[-0.02em]">{next}</p>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-4">
          <Panel title="Record" action={<span className="text-[12px] text-ash">AES-256-GCM per field</span>}>
            <dl className="text-[14px]">
              {fields.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[150px_1fr] items-center gap-3 border-b border-rule px-5 py-3">
                  <dt className="text-ash">{k}</dt>
                  <dd className={v ? 'font-semibold' : 'mono text-ash'}>{v ?? <span className="inline-flex items-center gap-1.5"><Lock className="size-3" />encrypted at rest</span>}</dd>
                </div>
              ))}
              <div className="grid grid-cols-[150px_1fr] items-center gap-3 px-5 py-3"><dt className="text-ash">Health</dt><dd className="text-ash">withheld: not needed for a housing subsidy</dd></div>
            </dl>
            <div className="flex flex-col gap-3 border-t border-rule p-5">
              {elig && <div className="rounded-[8px] bg-canvas p-4"><div className="text-[11px] font-bold tracking-[0.1em] text-ash uppercase">Agency B receives</div><div className="t-title mt-1">Income eligible: {elig.income_eligible ? 'yes' : 'no'}</div><div className="mt-1 text-[13px] text-ash">That is the whole answer. The file stays closed.</div></div>}
              {denial && <Violation code={denial.code} title={CODE_TITLE[denial.code] ?? 'Access denied'}>{denial.message}</Violation>}
              <div className="flex flex-wrap gap-2">
                {me.role === 'officer' && mine && <>
                  <Button onClick={() => act('request-access', { caseId: c.id, kind: 'full_view', purpose: 'Process housing subsidy' }, { title: 'Consent requested', message: 'Sent to the supervisor and the citizen' })}><KeyRound />Request access</Button>
                  <Button variant="outline" onClick={() => attempt('record')}><Eye />Open record</Button>
                </>}
                {me.role === 'officer' && !mine && <Button variant="destructive" onClick={() => attempt('record')}><ShieldOff />Open anyway (not assigned)</Button>}
                {me.role === 'agency_b' && <>
                  <Button onClick={() => act('request-access', { caseId: c.id, kind: 'eligibility_check', purpose: 'Verify income eligibility' }, { title: 'Consent requested', message: 'Sent to the supervisor and the citizen' })}><KeyRound />Request eligibility check</Button>
                  <Button variant="outline" onClick={() => attempt('eligibility')}><Eye />Get result</Button>
                  <Button variant="destructive" onClick={() => attempt('record')}><ShieldOff />Try the full record</Button>
                </>}
                {me.role === 'citizen' && <Button variant="outline" onClick={() => attempt('record')}><Eye />Read my record</Button>}
                {(me.role === 'supervisor' || me.role === 'admin') && <Button variant="destructive" onClick={() => attempt('record')}><ShieldOff />Try to open the record</Button>}
              </div>
            </div>
          </Panel>

          <Panel title="Timeline for this case">
            {timeline.length === 0 ? <Empty>Nothing has happened on this case yet.</Empty> : (
              <ol className="p-5">
                {timeline.map((l, i) => (
                  <li key={l.id} className="relative flex gap-3 pb-4 last:pb-0">
                    {i < timeline.length - 1 && <span className="absolute top-4 bottom-0 left-[5px] w-px bg-rule" aria-hidden />}
                    <span className={`relative mt-1.5 size-[11px] shrink-0 rounded-full border-2 border-ink ${l.decision === 'DENY' ? 'bg-black' : l.decision === 'ALLOW' ? 'bg-white' : 'bg-canvas'}`} />
                    <div className="min-w-0 flex-1 text-[13px]"><div><b>{l.actor}</b> · {l.action.replaceAll('_', ' ')}</div><div className="text-ash">{l.detail}</div></div>
                    <div className="flex shrink-0 flex-col items-end gap-1"><Status s={l.decision} /><span className="text-[11px] text-ash">{ago(l.at)}</span></div>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>

        <Panel title="Consent on this case">
          {myReqs.length === 0 ? <Empty>No consent requests yet.</Empty> : myReqs.map(r => {
            const v = (role: string) => r.votes.find((x: R) => x.voter_role === role)?.decision
            const canVote = r.status === 'pending' && (me.role === 'supervisor' || (me.role === 'citizen' && me.citizenId === r.citizen_id)) && !r.votes.some((x: R) => x.voter === me.id)
            return (
              <div key={r.id} className="border-b border-rule p-5 last:border-b-0">
                <div className="flex items-center justify-between gap-2"><div className="font-bold tracking-[-0.01em]"><span className="mono">#{r.id}</span> {r.kind === 'full_view' ? 'Full view' : 'Eligibility'}</div><Status s={r.status} /></div>
                <div className="mt-1 text-[12px] text-ash">by {r.requester} · {r.purpose}</div>
                <div className="mt-3 flex items-center gap-4 rounded-[4px] bg-canvas px-3 py-2"><Vote role="Supervisor" v={v('supervisor')} /><span className="text-rule">+</span><Vote role="Citizen" v={v('citizen')} /><span className="ml-auto text-[12px] text-ash">both required</span></div>
                {canVote && <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => act('vote-access', { id: r.id, decision: 'approve' }, { title: 'Vote recorded', message: `You approved request #${r.id}` })}>Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => act('vote-access', { id: r.id, decision: 'deny' }, { title: 'Request denied', message: `You denied request #${r.id}` })}>Deny</Button>
                </div>}
                {r.status === 'pending' && r.requester === me.id && <div className="mt-3"><Button size="sm" variant="destructive" onClick={() => act('vote-access', { id: r.id, decision: 'approve' })}><ShieldOff />Approve my own request</Button></div>}
              </div>
            )
          })}
        </Panel>
      </div>
    </div>
  )
}
