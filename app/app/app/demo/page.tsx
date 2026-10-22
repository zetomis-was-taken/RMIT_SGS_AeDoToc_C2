'use client'
import { ArrowRight, Check, Play, RotateCcw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useApp } from '@/components/app-context'
import { Button } from '@/components/ui/button'
import { PageTitle, Panel } from '@/components/bits'
import { api } from '@/lib/client'

interface Step { id: string; who: string; persona: string; go: string; title: string; do: string; expect: string; say: string; auto?: string }
const ACTS: { act: string; time: string; blurb: string; steps: Step[] }[] = [
  { act: 'Three attacks fail', time: '~50 s', blurb: 'Open with the problem: the people with the most access are the threat.', steps: [
    { id: 'a1', who: 'Officer An', persona: 'officer_an', go: '/app/cases/C-1002', title: 'An opens a case that is not his', do: 'Open C-1002, press “Open anyway”.', expect: 'Black violation card: OUT_OF_SCOPE. The attempt appears in the audit log.', say: '“An is an officer, but C-1002 belongs to Binh. A role check would let him in. Here the policy says no.”', auto: 'out-of-scope' },
    { id: 'a2', who: 'Admin Dung', persona: 'admin_dung', go: '/app/policy', title: 'The admin grants himself access', do: 'Press “Propose assignment” (to Myself), then “Approve my own”.', expect: 'The change stays pending. Self-approval is blocked: SELF_APPROVAL_BLOCKED.', say: '“Dung runs the system. He can propose, but he cannot approve his own change, and two supervisors would have to.”', auto: 'admin-escalation' },
    { id: 'a3', who: 'DBA', persona: 'admin_dung', go: '/app/lab', title: 'The DBA reads the database', do: 'Run the “DBA reads the database directly” scenario.', expect: 'Only ciphertext: enc:v1:… for every sensitive column.', say: '“Even with the database in hand, the DBA reads nothing. The fields are encrypted.”', auto: 'dba' },
  ] },
  { act: 'The legitimate flow', time: '~70 s', blurb: 'Show that it still works, with the citizen in the loop.', steps: [
    { id: 'b1', who: 'Officer An', persona: 'officer_an', go: '/app/cases/C-1001', title: 'An asks to open C-1001', do: 'Press “Request access”.', expect: 'A consent request is created. “Open record” is still refused: LOCKED_NO_CONSENT.', say: '“An is assigned, but assignment is not permission. He asks.”' },
    { id: 'b2', who: 'Supervisor Chi', persona: 'supervisor_chi', go: '/app/requests', title: 'Chi approves', do: 'Approve request #1.', expect: 'Status stays pending: one of two approvals.', say: '“The supervisor agrees. That alone is not enough.”' },
    { id: 'b3', who: 'Citizen Hoa', persona: 'cz_hoa', go: '/app/requests', title: 'Hoa, the citizen, approves', do: 'Approve request #1.', expect: 'Status becomes granted, with a 15-minute window.', say: '“The citizen is part of the approval. It is her data.”' },
    { id: 'b4', who: 'Officer An', persona: 'officer_an', go: '/app/cases/C-1001', title: 'An opens the record', do: 'Press “Open record”.', expect: 'Name, ID, income, address appear. Health stays withheld.', say: '“Now it opens, only the fields this purpose needs.”' },
    { id: 'b5', who: 'Agency B', persona: 'agencyb_lan', go: '/app/cases/C-1001', title: 'Agency B asks one question', do: 'Request eligibility, approve as Chi and Hoa, then “Get result”.', expect: '“Income eligible: yes”. Never the file.', say: '“The second agency learns one fact, not the whole file.”', auto: 'happy-path' },
  ] },
  { act: 'Prove it', time: '~20 s', blurb: 'Close on accountability.', steps: [
    { id: 'c1', who: 'Supervisor Chi', persona: 'supervisor_chi', go: '/app/audit', title: 'The log keeps score', do: 'Filter to “Denied”, then press “Verify chain”.', expect: 'Every denied attempt is listed. “Chain intact”.', say: '“Every attempt is recorded, and the record cannot be quietly edited.”' },
  ] },
]

export default function Demo() {
  const { me, login, refresh, notify } = useApp()
  const router = useRouter()
  const [done, setDone] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState<string | null>(null)
  if (!me) return null
  const total = ACTS.reduce((n, a) => n + a.steps.length, 0)
  const n = Object.values(done).filter(Boolean).length

  const go = async (s: Step) => { await login(s.persona); router.push(s.go) }
  const auto = async (s: Step) => {
    if (!s.auto) return
    setBusy(s.id)
    const r = await api('lab', { id: s.auto })
    notify(r.ok ? { kind: 'success', title: 'Ran on the live engine', message: `${r.data.title}: ${r.data.verdict}` } : { kind: 'info', title: 'Could not run', message: r.data.error ?? 'error' })
    setDone(d => ({ ...d, [s.id]: true })); setBusy(null); await refresh()
  }
  const reset = async () => { if (!window.confirm('Reset all demo data and start over?')) return; await api('reset', {}); setDone({}); notify({ kind: 'success', title: 'Demo reset', message: 'Start again from the top.' }); await refresh() }

  return (
    <>
      <PageTitle title="Guided demo" action={<Button variant="outline" onClick={reset}><RotateCcw />Reset &amp; start over</Button>}>
        A two-minute walk through the idea, repeatable. Each step switches to the right person and opens the right page. “Run automatically” plays it on the live engine instead.
      </PageTitle>
      <div className="mb-6 flex items-center gap-4"><div className="h-2 flex-1 rounded-[2px] bg-white"><div className="h-full rounded-[2px] bg-ink transition-[width] duration-300" style={{ width: `${(n / total) * 100}%` }} /></div><span className="num text-[13px] font-semibold">{n}/{total} steps</span></div>

      <div className="flex flex-col gap-8">
        {ACTS.map((a, ai) => (
          <section key={a.act}>
            <div className="mb-3 flex flex-wrap items-baseline gap-x-4"><h2 className="t-title text-[30px]">{ai + 1}. {a.act}</h2><span className="t-nav text-ash">{a.time} · {a.blurb}</span></div>
            <div className="flex flex-col gap-3">
              {a.steps.map(s => (
                <Panel key={s.id} className={done[s.id] ? 'opacity-60' : ''}>
                  <div className="grid gap-4 p-5 md:grid-cols-[1.3fr_1fr_auto] md:items-start">
                    <div>
                      <div className="text-[11px] font-bold tracking-[0.1em] text-ash uppercase">{s.who}</div>
                      <div className="text-[18px] font-bold tracking-[-0.03em]">{s.title}</div>
                      <p className="mt-1 text-[13px]"><b>Do:</b> {s.do}</p>
                      <p className="text-[13px] text-ash"><b className="text-ink">Expect:</b> {s.expect}</p>
                    </div>
                    <p className="rounded-[8px] bg-canvas p-3 text-[13px] text-graphite"><span className="block text-[11px] font-bold tracking-[0.1em] text-ash uppercase">Say</span>{s.say}</p>
                    <div className="flex flex-wrap gap-2 md:flex-col">
                      <Button onClick={() => go(s)}>Go as {s.who.split(' ')[0]}<ArrowRight /></Button>
                      {s.auto && <Button variant="outline" disabled={busy === s.id} onClick={() => auto(s)}><Play />Run automatically</Button>}
                      <Button variant="ghost" size="sm" onClick={() => setDone(d => ({ ...d, [s.id]: !d[s.id] }))}><Check />{done[s.id] ? 'Undo' : 'Mark done'}</Button>
                    </div>
                  </div>
                </Panel>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  )
}
