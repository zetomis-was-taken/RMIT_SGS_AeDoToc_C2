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
    { id: 'a1', who: 'Officer An', persona: 'officer_an', go: '/app/cases/C-1002', title: 'An opens a case that is not his', do: 'Open C-1002, press “Open anyway”.', expect: 'Red violation card: OUT_OF_SCOPE. The attempt appears in the audit log.', say: '“An is an officer, but C-1002 belongs to Binh. A role check would let him in. Here the policy says no.”', auto: 'out-of-scope' },
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
    setDone(d => ({ ...d, [s.id]: true }))
    setBusy(null)
    await refresh()
  }
  const reset = async () => {
    if (!window.confirm('Reset all demo data and start over?')) return
    await api('reset', {})
    setDone({})
    notify({ kind: 'success', title: 'Demo reset', message: 'Start again from the top.' })
    await refresh()
  }

  return (
    <>
      <PageTitle
        title="Guided 2-Minute Demonstration"
        action={
          <Button variant="outline" onClick={reset}>
            <RotateCcw className="size-4" />Reset &amp; restart demo
          </Button>
        }
      >
        A two-minute rehearsal walkthrough engineered for video presentation and judge evaluation. Each step automatically switches to the corresponding actor and navigates to the target screen. “Run automatically” plays it directly on the live policy engine.
      </PageTitle>

      {/* Progress track */}
      <div className="mb-8 flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="h-3 flex-1 rounded-full bg-gray-100 p-0.5 border border-gray-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-600 via-[#2727e6] to-[#3b5bf5] shadow-[0_0_10px_rgba(39,39,230,0.35)] transition-all duration-300"
            style={{ width: `${(n / total) * 100}%` }}
          />
        </div>
        <span className="num text-[13px] font-bold text-blue-700 rounded-full bg-blue-50 border border-blue-200 px-3 py-0.5">
          {n}/{total} steps completed
        </span>
      </div>

      <div className="flex flex-col gap-10">
        {ACTS.map((a, ai) => (
          <section key={a.act} className="flex flex-col gap-4">
            <div className="flex flex-wrap items-baseline gap-x-4">
              <h2 className="t-title text-[28px] text-gray-900 tracking-tight flex items-center gap-2">
                <span className="size-2 rounded-full bg-[#2727e6] shadow-[0_0_8px_rgba(39,39,230,0.5)]" />
                {ai + 1}. {a.act}
              </h2>
              <span className="t-nav text-xs font-semibold text-gray-500">{a.time} · {a.blurb}</span>
            </div>

            <div className="flex flex-col gap-3.5">
              {a.steps.map(s => (
                <Panel key={s.id} className={done[s.id] ? 'opacity-55' : ''}>
                  <div className="grid gap-5 p-6 md:grid-cols-[1.3fr_1.1fr_auto] md:items-start">
                    <div>
                      <div className="text-[10px] font-bold tracking-[0.1em] text-[#2727e6] uppercase">{s.who}</div>
                      <div className="text-[19px] font-bold tracking-tight text-gray-900 mt-0.5">{s.title}</div>
                      <p className="mt-2 text-[13px] text-gray-700"><b>Action:</b> {s.do}</p>
                      <p className="text-[13px] text-gray-500 mt-0.5"><b className="text-gray-900">Expected result:</b> {s.expect}</p>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-[13px] text-gray-700">
                      <span className="block text-[10px] font-bold tracking-[0.1em] text-[#2727e6] uppercase mb-1">Speaker voiceover script</span>
                      <p className="italic leading-relaxed">{s.say}</p>
                    </div>

                    <div className="flex flex-wrap gap-2 md:flex-col md:min-w-[170px]">
                      <Button onClick={() => go(s)}>
                        Act as {s.who.split(' ')[0]} <ArrowRight className="size-3.5" />
                      </Button>
                      {s.auto && (
                        <Button variant="outline" disabled={busy === s.id} onClick={() => auto(s)}>
                          <Play className="size-3.5" />Run on engine
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => setDone(d => ({ ...d, [s.id]: !d[s.id] }))}>
                        <Check className="size-3.5" />{done[s.id] ? 'Mark uncompleted' : 'Mark completed'}
                      </Button>
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
