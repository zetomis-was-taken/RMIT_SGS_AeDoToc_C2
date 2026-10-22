'use client'
import { Check, FlaskConical, Play, RotateCcw, ShieldCheck, ShieldX, X, Clock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useApp } from '../app-context'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { PageTitle, Panel } from '../bits'
import { api, CODE_TITLE, type R } from '@/lib/client'

const TITLES: Record<string, string> = {
  'out-of-scope': 'Officer opens a file outside their assignment',
  'no-consent': 'Assigned officer skips the citizen',
  'self-approve': 'Requester approves their own request',
  'admin-escalation': 'Admin grants themselves access',
  'agency-overreach': 'Second agency asks for more than it needs',
  dba: 'DBA reads the database directly',
}

export function Lab() {
  const { me, refresh, notify } = useApp()
  const [ids, setIds] = useState<string[]>([])
  const [res, setRes] = useState<Record<string, R>>({})
  const [busy, setBusy] = useState<string | null>(null)
  useEffect(() => { api('scenarios').then(r => r.ok && setIds(r.data)) }, [me?.id])
  if (!me) return null

  const run = async (id: string) => {
    setBusy(id)
    const r = await api('lab', { id })
    if (r.ok) setRes(s => ({ ...s, [id]: r.data }))
    else notify({ kind: 'info', title: 'Scenario failed', message: r.data.error ?? 'error' })
    setBusy(null)
    await refresh()
  }
  const runAll = async () => { for (const id of ids) await run(id) }
  const reset = async () => {
    const r = await api('reset', {})
    if (r.ok) { setRes({}); notify({ kind: 'success', title: 'Demo data reset', message: 'Cases, requests and audit log restored.' }) }
    await refresh()
  }

  return (
    <>
      <PageTitle title="Security lab">Each scenario runs the real policy engine against the demo database, as the attacker. Compare it with what an ordinary role-based backend would do.</PageTitle>
      <div className="mb-4 flex flex-wrap gap-2">
        <Button onClick={runAll} disabled={!!busy}><Play />Run all scenarios</Button>
        <Button variant="outline" onClick={reset}><RotateCcw />Reset demo data</Button>
      </div>

      <div className="flex flex-col gap-4">
        {ids.map(id => {
          const r = res[id]
          return (
            <Panel key={id} title={TITLES[id] ?? id}
              action={<div className="flex items-center gap-2">
                {r && (r.verdict === 'protected' ? <Badge variant="ok"><ShieldCheck />Protected</Badge> : <Badge variant="danger"><ShieldX />Exposed</Badge>)}
                <Button size="sm" variant="outline" disabled={busy === id} onClick={() => run(id)}><FlaskConical />{r ? 'Run again' : 'Run'}</Button>
              </div>}>
              {!r ? <div className="px-4 py-4 text-[13px] text-soft">Not run yet.</div> : (
                <div className="grid gap-0 md:grid-cols-[3fr_2fr]">
                  <div className="p-4">
                    <div className="mb-2 text-[12px] text-soft">{r.actor} · {r.threat}</div>
                    <ol className="flex flex-col gap-2">
                      {r.steps.map((s: R, i: number) => (
                        <li key={i} className="flex gap-3 text-[13px]">
                          <span className="mt-0.5">{s.outcome === 'blocked' ? <X className="size-4 text-danger" /> : s.outcome === 'pending' ? <Clock className="size-4 text-warn" /> : <Check className="size-4 text-ok" />}</span>
                          <div className="min-w-0">
                            <div className="font-medium">{s.label}</div>
                            <div className={`${s.outcome === 'blocked' ? 'text-danger' : 'text-soft'} break-words`}>
                              {s.outcome === 'blocked' ? `${CODE_TITLE[s.code] ?? 'Blocked'}: ` : ''}{s.message}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div className="border-t border-line bg-iris-50 p-4 text-[13px] md:border-t-0 md:border-l">
                    <div className="mb-1 text-[12px] font-medium text-soft">An ordinary role-based backend</div>
                    <p>{r.rbac}</p>
                  </div>
                </div>
              )}
            </Panel>
          )
        })}
      </div>
    </>
  )
}
