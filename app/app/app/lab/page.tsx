'use client'
import { Check, Clock, FlaskConical, Play, RotateCcw, ShieldCheck, ShieldX, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useApp } from '@/components/app-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageTitle, Panel } from '@/components/bits'
import { api, CODE_TITLE, type R } from '@/lib/client'

const TITLES: Record<string, string> = {
  'out-of-scope': 'Officer opens a file outside their assignment',
  'no-consent': 'Assigned officer skips the citizen',
  'self-approve': 'Requester approves their own request',
  'admin-escalation': 'Admin grants themselves access',
  'agency-overreach': 'Second agency asks for more than it needs',
  dba: 'DBA reads the database directly',
  'happy-path': 'The legitimate flow, end to end',
}

export default function Lab() {
  const { me, refresh, notify } = useApp()
  const [ids, setIds] = useState<string[]>([])
  const [res, setRes] = useState<Record<string, R>>({})
  const [busy, setBusy] = useState<string | null>(null)
  useEffect(() => { api('scenarios').then(r => r.ok && setIds(r.data)) }, [me?.id])
  if (!me) return null

  const run = async (id: string) => {
    setBusy(id)
    const r = await api('lab', { id })
    if (r.ok) setRes(s => ({ ...s, [id]: r.data })); else notify({ kind: 'info', title: 'Scenario failed', message: r.data.error ?? 'error' })
    setBusy(null); await refresh()
  }
  const runAll = async () => { for (const id of ids) await run(id) }
  const reset = async () => { if (!window.confirm('Reset all demo data? Requests, approvals and the audit log will be cleared.')) return; const r = await api('reset', {}); if (r.ok) { setRes({}); notify({ kind: 'success', title: 'Demo data reset', message: 'Cases, requests and audit log restored.' }) } await refresh() }

  return (
    <>
      <PageTitle title="Security lab" action={<div className="flex gap-2"><Button onClick={runAll} disabled={!!busy}><Play />Run all</Button><Button variant="outline" onClick={reset}><RotateCcw />Reset demo data</Button></div>}>
        Each scenario runs the real policy engine against the demo database, as the attacker. Beside it: what an ordinary role-based backend would do.
      </PageTitle>
      <div className="flex flex-col gap-4">
        {ids.map(id => {
          const r = res[id]
          return (
            <Panel key={id} title={TITLES[id] ?? id} action={<div className="flex items-center gap-2">
              {r && (r.verdict === 'protected' ? <Badge variant="ok"><ShieldCheck />Protected</Badge> : <Badge variant="danger"><ShieldX />Exposed</Badge>)}
              <Button size="sm" variant="outline" disabled={busy === id} onClick={() => run(id)}><FlaskConical />{r ? 'Run again' : 'Run'}</Button></div>}>
              {!r ? <div className="px-5 py-4 text-[13px] text-ash">Not run yet.</div> : (
                <div className="grid md:grid-cols-[3fr_2fr]">
                  <div className="p-5">
                    <div className="mb-3 text-[12px] text-ash">{r.actor} · {r.threat}</div>
                    <ol className="flex flex-col gap-3">
                      {r.steps.map((s: R, i: number) => (
                        <li key={i} className="flex gap-3 text-[13px]">
                          <span className="mt-0.5">{s.outcome === 'blocked' ? <X className="size-4" /> : s.outcome === 'pending' ? <Clock className="size-4" /> : <Check className="size-4" />}</span>
                          <div className="min-w-0"><div className="font-semibold">{s.label}</div>
                            <div className={`break-words ${s.outcome === 'blocked' ? 'mt-0.5 inline-block rounded-[4px] bg-black px-1.5 py-0.5 font-medium text-white' : 'text-ash'}`}>{s.outcome === 'blocked' ? `${CODE_TITLE[s.code] ?? 'Blocked'}: ` : ''}{s.message}</div></div>
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div className="hatch bg-canvas p-5 text-[13px]"><div className="mb-1 text-[11px] font-bold tracking-[0.1em] text-ash uppercase">An ordinary role-based backend</div><p>{r.rbac}</p></div>
                </div>
              )}
            </Panel>
          )
        })}
      </div>
    </>
  )
}
