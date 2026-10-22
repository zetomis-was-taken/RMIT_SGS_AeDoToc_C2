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
  'quorum-commit': 'A policy change needs two different admins',
  'forged-token': 'Forged and stolen tokens',
  'ork-offline': 'The network tolerates one ORK down, not two',
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
    if (r.ok) setRes(s => ({ ...s, [id]: r.data }))
    else notify({ kind: 'info', title: 'Scenario failed', message: r.data.error ?? 'error' })
    setBusy(null)
    await refresh()
  }
  const runAll = async () => { for (const id of ids) await run(id) }
  const reset = async () => {
    if (!window.confirm('Reset all demo data? Requests, approvals and the audit log will be cleared.')) return
    const r = await api('reset', {})
    if (r.ok) {
      setRes({})
      notify({ kind: 'success', title: 'Demo data reset', message: 'Cases, requests and audit log restored.' })
    }
    await refresh()
  }

  return (
    <>
      <PageTitle
        title="Zero-Trust Security Lab"
        action={
          <div className="flex gap-2.5">
            <Button onClick={runAll} disabled={!!busy}>
              <Play className="size-4" />Run all scenarios
            </Button>
            <Button variant="outline" onClick={reset}>
              <RotateCcw className="size-4" />Reset demo data
            </Button>
          </div>
        }
      >
        Each scenario executes the real multi-party cryptographic policy engine against the database, impersonating the attacker. Beside each result: how an ordinary role-based backend (RBAC) would have catastrophically failed.
      </PageTitle>

      <div className="flex flex-col gap-4">
        {ids.map(id => {
          const r = res[id]
          return (
            <Panel
              key={id}
              title={TITLES[id] ?? id}
              action={
                <div className="flex items-center gap-3">
                  {r && (
                    r.verdict === 'protected' ? (
                      <Badge variant="ok">
                        <ShieldCheck className="size-3.5" />Quorum Protected
                      </Badge>
                    ) : (
                      <Badge variant="danger">
                        <ShieldX className="size-3.5" />Exposed Vulnerability
                      </Badge>
                    )
                  )}
                  <Button size="sm" variant="outline" disabled={busy === id} onClick={() => run(id)}>
                    <FlaskConical className="size-3.5" />{r ? 'Re-run' : 'Simulate'}
                  </Button>
                </div>
              }
            >
              {!r ? (
                <div className="px-6 py-5 text-[13px] text-gray-500">Scenario has not been executed yet. Click Simulate to test.</div>
              ) : (
                <div className="grid md:grid-cols-[3fr_2fr] divide-y md:divide-y-0 md:divide-x divide-gray-200">
                  <div className="p-6">
                    <div className="mb-4 text-[12px] text-gray-500 font-medium">
                      Simulated Actor: <b className="text-gray-900">{r.actor}</b> · Threat Vector: <span className="text-[#2727e6] font-mono text-xs">{r.threat}</span>
                    </div>
                    <ol className="flex flex-col gap-3.5">
                      {r.steps.map((s: R, i: number) => (
                        <li key={i} className="flex gap-3 text-[13px]">
                          <span className="mt-0.5 shrink-0">
                            {s.outcome === 'blocked' ? (
                              <span className="flex size-5 items-center justify-center rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                                <X className="size-3" />
                              </span>
                            ) : s.outcome === 'pending' ? (
                              <span className="flex size-5 items-center justify-center rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                                <Clock className="size-3" />
                              </span>
                            ) : (
                              <span className="flex size-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                                <Check className="size-3" />
                              </span>
                            )}
                          </span>
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900">{s.label}</div>
                            <div className={`break-words text-xs mt-1 ${
                              s.outcome === 'blocked'
                                ? 'inline-block rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 font-medium text-rose-700'
                                : 'text-gray-500'
                            }`}>
                              {s.outcome === 'blocked' ? `${CODE_TITLE[s.code] ?? 'Blocked'}: ` : ''}{s.message}
                            </div>
                            {s.tide && <div className="mono mt-1 text-gray-500">TideCloak: {s.tide}</div>}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="hatch bg-gray-50 p-6 text-[13px] text-gray-600">
                    <div className="mb-2 text-[10px] font-bold tracking-[0.1em] text-rose-600 uppercase">
                      What an ordinary role-based backend (RBAC) would do
                    </div>
                    <p className="leading-relaxed text-gray-600 font-medium">{r.rbac}</p>
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
