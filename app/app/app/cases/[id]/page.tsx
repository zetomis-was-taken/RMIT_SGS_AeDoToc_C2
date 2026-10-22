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
  const [denial, setDenial] = useState<{ code: string; message: string; tide?: string } | null>(null)
  if (!me) return null
  const c = cases.find(x => x.id === id)
  if (!c) return (
    <div className="pt-6">
      <Link href="/app/cases" className="t-nav inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#2727e6] transition-colors">
        <ArrowLeft className="size-3.5" /> Back to all cases
      </Link>
      <Panel className="mt-6">
        <Empty loading={!booted}>{booted ? `No case ${id} is visible to you.` : 'Loading case…'}</Empty>
      </Panel>
    </div>
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
    if (r.ok) {
      kind === 'record' ? setRecord(r.data) : setElig(r.data)
      notify({ kind: 'success', title: 'Access granted', message: `Consent quorum verified for ${c.id}` })
    } else {
      setDenial({ code: r.data.code, message: r.data.error, tide: r.data.tide })
      notify({ kind: 'violation', title: 'Access denied', message: r.data.error, code: r.data.code, tide: r.data.tide })
    }
    await refresh()
  }

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
    ['Full name', record?.name ?? null],
    ['National ID', record?.national_id ?? null],
    ['Monthly income', record ? money(record.income) : null],
    ['Address', record?.address ?? null],
  ]

  return (
    <div className="pt-6">
      <Link href="/app/cases" className="t-nav inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#2727e6] transition-colors">
        <ArrowLeft className="size-3.5" /> Back to all cases
      </Link>
      
      <div className="mt-4 mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="t-title text-[36px] font-bold text-gray-900 tracking-tight">{c.id}</h1>
          <p className="mt-2 text-gray-500 text-sm">
            {c.title.replace(' application', '')} · citizen <span className="mono font-mono text-[#2727e6] font-semibold">{c.citizen_id}</span> · assigned to {c.assignedTo.join(', ') || '—'}
          </p>
        </div>
        <Badge variant={access.variant} className="px-3.5 py-1 text-[13px]">
          {access.key === 'open' ? <LockOpen className="size-3.5" /> : access.key === 'out' ? <ShieldOff className="size-3.5" /> : <Lock className="size-3.5" />}
          {access.label}
        </Badge>
      </div>

      {/* Operational Next Step Banner */}
      <div className="mb-6 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 via-[#eef1ff] to-white p-6 text-gray-900 shadow-sm">
        <div className="text-[10px] font-bold tracking-[0.1em] text-[#2727e6] uppercase">Operational Next Step</div>
        <p className="mt-1.5 max-w-[70ch] text-[18px] leading-[1.35] font-semibold tracking-tight text-gray-900">{next}</p>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-5">
          <Panel title="Citizen Record Fields" action={<span className="text-[11px] font-mono text-[#2727e6] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">AES-256-GCM at rest</span>}>
            <dl className="text-[14px]">
              {fields.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[160px_1fr] items-center gap-3 border-b border-gray-100 px-6 py-4">
                  <dt className="text-gray-500 font-medium">{k}</dt>
                  <dd className={v ? 'font-semibold text-gray-900' : 'mono font-mono text-xs text-gray-500'}>
                    {v ?? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 border border-gray-200 px-2.5 py-0.5 text-gray-500">
                        <Lock className="size-3 text-[#2727e6]" />
                        Encrypted in database
                      </span>
                    )}
                  </dd>
                </div>
              ))}
              <div className="grid grid-cols-[160px_1fr] items-center gap-3 px-6 py-4">
                <dt className="text-gray-500 font-medium">Medical & Health</dt>
                <dd className="text-gray-400 text-xs italic">Withheld: out of purpose scope for housing subsidy</dd>
              </div>
            </dl>

            <div className="flex flex-col gap-4 border-t border-gray-100 p-6">
              {elig && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900 shadow-sm">
                  <div className="text-[11px] font-bold tracking-[0.1em] text-emerald-700 uppercase">Agency B Cross-Verification Result</div>
                  <div className="t-title mt-1.5 text-[26px] font-bold text-gray-900">
                    Income eligible: <span className="text-emerald-700 uppercase">{elig.income_eligible ? 'yes' : 'no'}</span>
                  </div>
                  <div className="mt-1 text-[13px] text-emerald-800/80">That is the whole answer. Raw citizen financial records were never shared or exposed.</div>
                </div>
              )}
              {denial && (
                <Violation code={denial.code} tide={denial.tide} title={CODE_TITLE[denial.code] ?? 'Access denied'}>
                  {denial.message}
                </Violation>
              )}
              <div className="flex flex-wrap gap-2.5 pt-1">
                {me.role === 'officer' && mine && (
                  <>
                    <Button onClick={() => act('request-access', { caseId: c.id, kind: 'full_view', purpose: 'Process housing subsidy' }, { title: 'Consent requested', message: 'Sent to the supervisor and the citizen' })}>
                      <KeyRound />Request access
                    </Button>
                    <Button variant="outline" onClick={() => attempt('record')}>
                      <Eye />Open record
                    </Button>
                  </>
                )}
                {me.role === 'officer' && !mine && (
                  <Button variant="destructive" onClick={() => attempt('record')}>
                    <ShieldOff />Open anyway (not assigned)
                  </Button>
                )}
                {me.role === 'agency_b' && (
                  <>
                    <Button onClick={() => act('request-access', { caseId: c.id, kind: 'eligibility_check', purpose: 'Verify income eligibility' }, { title: 'Consent requested', message: 'Sent to the supervisor and the citizen' })}>
                      <KeyRound />Request eligibility check
                    </Button>
                    <Button variant="outline" onClick={() => attempt('eligibility')}>
                      <Eye />Get result
                    </Button>
                    <Button variant="destructive" onClick={() => attempt('record')}>
                      <ShieldOff />Try the full record
                    </Button>
                  </>
                )}
                {me.role === 'citizen' && (
                  <Button variant="default" onClick={() => attempt('record')}>
                    <Eye />Read my record
                  </Button>
                )}
                {(me.role === 'supervisor' || me.role === 'admin') && (
                  <Button variant="destructive" onClick={() => attempt('record')}>
                    <ShieldOff />Try to open the record
                  </Button>
                )}
              </div>
            </div>
          </Panel>

          <Panel title="Audit Timeline for this Case">
            {timeline.length === 0 ? (
              <Empty>Nothing has happened on this case yet.</Empty>
            ) : (
              <ol className="p-6 divide-y divide-gray-100">
                {timeline.map((l) => (
                  <li key={l.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <span className={`size-2.5 shrink-0 rounded-full ${
                      l.decision === 'DENY' 
                        ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' 
                        : l.decision === 'ALLOW' 
                        ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' 
                        : 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]'
                    }`} />
                    <div className="min-w-0 flex-1 text-[13px]">
                      <div className="text-gray-900 font-medium">
                        <b className="text-gray-900">{l.actor}</b> · {l.action.replaceAll('_', ' ')}
                      </div>
                      <div className="text-gray-500 text-xs mt-0.5">{l.detail}</div>
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

        <Panel title="Consent Quorum on this Case">
          {myReqs.length === 0 ? (
            <Empty>No consent requests yet.</Empty>
          ) : (
            <div className="divide-y divide-gray-100">
              {myReqs.map(r => {
                const v = (role: string) => r.votes.find((x: R) => x.voter_role === role)?.decision
                const canVote = r.status === 'pending' && (me.role === 'supervisor' || (me.role === 'citizen' && me.citizenId === r.citizen_id)) && !r.votes.some((x: R) => x.voter === me.id)
                return (
                  <div key={r.id} className="p-6">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-bold tracking-tight text-gray-900 flex items-center gap-2">
                        <span className="mono font-mono text-xs text-[#2727e6]">#{r.id}</span>
                        {r.kind === 'full_view' ? 'Full View Request' : 'Eligibility Check'}
                      </div>
                      <Status s={r.status} />
                    </div>
                    <div className="mt-1 text-[12px] text-gray-500">by {r.requester} · {r.purpose}</div>
                    <div className="mt-3.5 flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5">
                      <Vote role="Supervisor" v={v('supervisor')} />
                      <span className="text-gray-300 font-bold">+</span>
                      <Vote role="Citizen" v={v('citizen')} />
                      <span className="ml-auto text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Both required</span>
                    </div>
                    {canVote && (
                      <div className="mt-4 flex gap-2">
                        <Button size="sm" onClick={() => act('vote-access', { id: r.id, decision: 'approve' }, { title: 'Vote recorded', message: `You approved request #${r.id}` })}>
                          Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => act('vote-access', { id: r.id, decision: 'deny' }, { title: 'Request denied', message: `You denied request #${r.id}` })}>
                          Deny
                        </Button>
                      </div>
                    )}
                    {r.status === 'pending' && r.requester === me.id && (
                      <div className="mt-4">
                        <Button size="sm" variant="destructive" onClick={() => act('vote-access', { id: r.id, decision: 'approve' })}>
                          <ShieldOff />Approve my own request
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}
