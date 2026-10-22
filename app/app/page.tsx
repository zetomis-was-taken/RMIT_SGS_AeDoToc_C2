import { ArrowRight, ArrowUpRight, Check, ShieldAlert, Sparkles, X } from 'lucide-react'
import Link from 'next/link'
import { HeroVault } from '@/components/landing/hero-vault'

const FAILS = [
  { who: 'An, an officer', what: 'opens a case that belongs to someone else.', why: 'A role check asks "is this person an officer?". The answer is yes, so the file opens.' },
  { who: 'Dung, an admin', what: 'adds himself to the policy that limits him.', why: 'The person who runs the system can also edit its rules, and approve his own edit.' },
  { who: 'Tuan, a DBA', what: 'runs SELECT * on the citizens table.', why: 'Access to the machine is treated as access to the data inside it.' },
]

const STEPS = [
  { t: 'Officer asks', d: 'Only the officer assigned to the case can ask, and must state a purpose.' },
  { t: 'Supervisor approves', d: 'A second person with authority agrees. Alone, this opens nothing.' },
  { t: 'Citizen consents', d: 'The record belongs to the citizen, so their approval is part of the quorum.' },
  { t: 'Time-boxed grant', d: 'Both approvals open a 15-minute window, for that purpose only.' },
  { t: 'Only what is needed', d: 'Name, ID, income and address open. Health stays withheld. Agency B gets a yes or no.' },
]

const FEATURES = [
  ['Consent quorum', 'A record opens only with a supervisor and the citizen, checked on the server for every read.', '/app/cases'],
  ['Purpose-bound sharing', 'A second agency can ask whether income is eligible. It receives a yes or no, never the file.', '/app/cases'],
  ['Encrypted fields', 'Name, ID, income and address are AES-256-GCM ciphertext in the database. A DBA reads noise.', '/app/lab'],
  ['Policy that guards itself', 'Assignments change only after two supervisors approve. Admins propose, and cannot approve their own change.', '/app/policy'],
  ['Hash-chained audit', 'Every attempt, allowed or refused, is chained to the last. Edit one row and verification fails.', '/app/audit'],
  ['Refusal you can see', 'Out-of-scope attempts return a code, show a red violation card and land in the log. Hiding a button is not the protection.', '/app/lab'],
] as const

const ROLES = [
  ['Case officer', 'Requests access to cases assigned to them. Reads a record only inside an approved window.'],
  ['Supervisor', 'Approves access and policy changes. Never reads records.'],
  ['Citizen', 'Approves or denies access to their own record. Reads it at any time.'],
  ['Agency B officer', 'Asks one question. Receives one answer.'],
  ['System admin', 'Proposes policy changes. Cannot approve them and cannot read records.'],
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#f0f2f8] text-gray-900 selection:bg-[#2727e6] selection:text-white">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-full focus:bg-gray-900 focus:px-5 focus:py-2.5 focus:text-white font-bold shadow-2xl">
        Skip to content
      </a>

      {/* Floating Glass Header */}
      <header className="sticky top-4 z-40 mx-auto max-w-[1400px] px-4 md:px-10">
        <div className="flex items-center justify-between gap-6 rounded-full border border-gray-200 bg-white/80 px-6 py-3 backdrop-blur-xl shadow-[0_8px_30px_rgba(17,24,39,0.08)]">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="size-3 rounded-full bg-[#2727e6] shadow-[0_0_12px_rgba(39,39,230,0.5)] group-hover:scale-125 transition-transform" />
            <span className="text-[18px] leading-none font-bold tracking-tight text-gray-900">Consent Quorum</span>
          </Link>
          <nav className="t-nav hidden items-center gap-7 md:flex text-[14px] text-gray-600" aria-label="Page sections">
            {[["#problem", "Problem"], ["#how", "How it works"], ["#features", "Features"], ["#roles", "Roles"], ["#limits", "Limits"]].map(([h, l]) => (
              <a key={h} href={h} className="transition-colors hover:text-gray-900">
                {l}
              </a>
            ))}
          </nav>
          <Link
            href="/app"
            className="rounded-full border border-blue-500/25 bg-gradient-to-r from-[#2727e6] to-[#3b5bf5] px-5 py-2 text-[14px] font-semibold text-white shadow-[0_2px_12px_rgba(39,39,230,0.28)] hover:shadow-[0_4px_20px_rgba(39,39,230,0.45)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
          >
            Open the console
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section id="main" className="relative mx-auto grid max-w-[1400px] gap-10 px-5 pt-16 pb-28 md:px-10 lg:grid-cols-12 lg:pt-24 items-center">
        {/* Background ambient lighting */}
        <div className="pointer-events-none absolute -top-24 left-1/4 -z-10 size-96 rounded-full bg-[#2727e6]/10 blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 right-10 -z-10 size-80 rounded-full bg-blue-500/[0.07] blur-3xl" />

        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-[11px] font-semibold tracking-wider text-blue-700 uppercase w-fit">
            <Sparkles className="size-3.5 text-[#2727e6]" />
            Tide UNLOCKED 2026 · Zero-Trust Citizen Vault
          </div>

          <h1 className="t-hero text-gray-900 tracking-tight">
            No one opens a citizen&rsquo;s record{' '}
            <span className="bg-gradient-to-r from-[#2727e6] via-[#3b5bf5] to-[#0ea5e9] bg-clip-text text-transparent">
              alone.
            </span>
          </h1>

          <p className="t-sub max-w-[540px] text-gray-600 text-[18px] leading-relaxed">
            Agencies refuse to share records because sharing means trusting another agency&rsquo;s admins. Here a record opens only when the assigned officer, a supervisor <em className="not-italic font-bold text-gray-900">and the citizen</em> approve.
          </p>

          <div className="flex flex-wrap items-center gap-3.5 pt-2">
            <Link
              href="/app/demo"
              className="inline-flex items-center gap-2 rounded-full border border-blue-500/25 bg-gradient-to-r from-[#2727e6] via-[#334ceb] to-[#3b5bf5] px-7 py-3.5 text-[15px] font-semibold text-white shadow-[0_2px_14px_rgba(39,39,230,0.3)] hover:shadow-[0_6px_24px_rgba(39,39,230,0.45)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            >
              Watch it refuse <ArrowRight className="size-4" />
            </Link>
            <a
              href="#how"
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-6 py-3.5 text-[15px] font-semibold text-gray-800 shadow-sm hover:bg-gray-50 hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              How it works
            </a>
          </div>
        </div>

        <div className="lg:col-span-5">
          <HeroVault />
        </div>
      </section>

      {/* Problem Section: Light band with Failure Showcase */}
      <section id="problem" className="relative border-y border-gray-200 bg-white py-28 text-gray-900 overflow-hidden">
        {/* Ambient threat glow */}
        <div className="pointer-events-none absolute -top-20 right-1/4 size-80 rounded-full bg-rose-500/[0.05] blur-3xl" />

        <div className="mx-auto max-w-[1400px] px-5 md:px-10">
          <div className="flex items-center gap-2 text-rose-600 text-xs font-bold tracking-widest uppercase mb-3">
            <ShieldAlert className="size-4" /> The insider threat constraint
          </div>
          <h2 className="t-section max-w-[18ch] tracking-tight text-gray-900">
            The people with the most access are the threat.
          </h2>
          <p className="t-sub mt-4 max-w-[64ch] text-gray-600">
            Three failures, all ordinary, all with valid logins. Standard login plus a role check stops none of them.
          </p>

          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {FAILS.map((f, i) => (
              <div
                key={f.who}
                className="group relative flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-7 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-rose-300 hover:shadow-[0_10px_30px_rgba(244,63,94,0.12)]"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-500 uppercase tracking-wider font-bold mb-4">
                    <span>Attack Scenario 0{i + 1}</span>
                    <span className="flex size-6 items-center justify-center rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                      <X className="size-3.5" />
                    </span>
                  </div>
                  <h3 className="text-[20px] font-bold text-gray-900 leading-snug">
                    <span className="text-rose-600">{f.who}</span> {f.what}
                  </h3>
                </div>
                <div className="mt-6 pt-4 border-t border-gray-100 text-[13px] text-gray-600 leading-relaxed">
                  <span className="font-semibold text-gray-500 block mb-1">Why RBAC fails:</span>
                  {f.why}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how" className="mx-auto max-w-[1400px] px-5 py-32 md:px-10">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.6fr] lg:gap-20 items-start">
          <div className="sticky top-28">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1 text-[11px] font-semibold tracking-wider text-blue-700 uppercase mb-4">
              Cryptographic Consensus
            </div>
            <h2 className="t-section tracking-tight text-gray-900">Every opening needs three people.</h2>
            <p className="t-sub mt-5 max-w-[42ch] text-gray-600 leading-relaxed">
              Five steps, in this order. Each one is verified on the server using Tide zero-trust principles, never trusted to frontend client state.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {STEPS.map((s, i) => (
              <div
                key={s.t}
                className="flex items-start gap-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 hover:border-blue-300 hover:shadow-md"
              >
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 border border-blue-200 text-[#2727e6] font-mono text-[20px] font-bold">
                  0{i + 1}
                </div>
                <div>
                  <div className="text-[20px] font-bold tracking-tight text-gray-900">{s.t}</div>
                  <p className="mt-1 text-[15px] text-gray-600 leading-relaxed">{s.d}</p>
                </div>
              </div>
            ))}

            {/* Policy Side Card */}
            <div className="mt-6 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 via-[#eef1ff] to-white p-8 text-gray-900 shadow-sm">
              <div className="text-[11px] font-bold tracking-[0.1em] text-[#2727e6] uppercase">Meanwhile, on the policy side</div>
              <p className="mt-3 max-w-[34ch] text-[clamp(24px,3vw,38px)] leading-[1.12] font-semibold tracking-tight text-gray-900">
                An admin proposes. Two supervisors decide. The admin never gets a vote.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Showcase */}
      <section id="features" className="mx-auto max-w-[1400px] px-5 pb-32 md:px-10">
        <div className="mb-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1 text-[11px] font-semibold tracking-wider text-blue-700 uppercase mb-4">
            Core Capabilities
          </div>
          <h2 className="t-section max-w-[20ch] tracking-tight text-gray-900">What the prototype actually does.</h2>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {FEATURES.map(([t, d, href]) => (
            <Link
              key={t}
              href={href}
              className="group flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-7 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-[0_10px_35px_rgba(39,39,230,0.12)]"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-[22px] font-bold tracking-tight text-gray-900 group-hover:text-[#2727e6] transition-colors">{t}</h3>
                  <div className="flex size-9 items-center justify-center rounded-full bg-gray-50 border border-gray-200 text-gray-500 group-hover:bg-[#2727e6] group-hover:border-blue-400/50 group-hover:text-white transition-all duration-200">
                    <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                </div>
                <p className="mt-3 text-[15px] text-gray-600 leading-relaxed">{d}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Roles Section */}
      <section id="roles" className="mx-auto max-w-[1400px] px-5 pb-32 md:px-10">
        <div className="hatch overflow-hidden rounded-2xl border border-gray-200 bg-white text-gray-900 shadow-[0_16px_40px_rgba(17,24,39,0.08)]">
          <div className="grid gap-10 p-8 md:p-14 lg:grid-cols-[1fr_1.4fr] items-start">
            <div>
              <div className="text-[11px] font-bold tracking-[0.1em] text-[#2727e6] uppercase mb-3">Multi-party Access Model</div>
              <h2 className="t-section tracking-tight text-gray-900">Five people. Five different consoles.</h2>
              <p className="t-sub mt-4 max-w-[36ch] text-gray-600 leading-relaxed">
                Sign in as each one. The menu, the data and the buttons change, and the server refuses what the interface does not offer.
              </p>
              <Link
                href="/app"
                className="mt-8 inline-flex items-center gap-2 rounded-full border border-blue-500/25 bg-gradient-to-r from-[#2727e6] to-[#3b5bf5] px-7 py-3 text-[15px] font-bold text-white shadow-[0_2px_14px_rgba(39,39,230,0.3)] hover:shadow-[0_6px_24px_rgba(39,39,230,0.45)] hover:-translate-y-0.5 transition-all duration-200"
              >
                Choose a role <ArrowRight className="size-4" />
              </Link>
            </div>

            <dl className="divide-y divide-gray-200 border-y border-gray-200">
              {ROLES.map(([r, d]) => (
                <div key={r} className="grid gap-2 py-5 sm:grid-cols-[170px_1fr] sm:gap-6 items-baseline">
                  <dt className="text-[17px] font-bold tracking-tight text-gray-900 flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-[#2727e6]" />
                    {r}
                  </dt>
                  <dd className="text-[14px] text-gray-600 leading-relaxed">{d}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Real Console Screenshots Showcase */}
      <section className="mx-auto max-w-[1400px] px-5 pb-32 md:px-10">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1 text-[11px] font-semibold tracking-wider text-blue-700 uppercase mb-4">
            Live Interface Proof
          </div>
          <h2 className="t-section max-w-[16ch] tracking-tight text-gray-900">This is the real console.</h2>
        </div>

        <div className="relative mt-8 h-[440px] sm:h-[580px] lg:h-[720px] rounded-2xl border border-gray-200 bg-gradient-to-b from-white to-gray-100 p-3 shadow-[0_20px_50px_rgba(17,24,39,0.12)]">
          <img
            src="/shots/overview.png"
            alt="Supervisor overview: actions waiting, decision chart, role matrix"
            width={1440}
            height={900}
            loading="lazy"
            decoding="async"
            className="absolute top-4 left-4 w-[62%] rounded-xl object-cover object-top border border-gray-200 shadow-[0_15px_40px_rgba(17,24,39,0.18)]"
            style={{ height: '72%' }}
          />
          <img
            src="/shots/denied.png"
            alt="A violation card after an out-of-scope attempt"
            width={1440}
            height={900}
            loading="lazy"
            decoding="async"
            className="absolute top-[22%] right-4 w-[52%] rounded-xl object-cover object-top border border-rose-300 shadow-[0_15px_40px_rgba(244,63,94,0.18)]"
            style={{ height: '62%' }}
          />
          <img
            src="/shots/audit.png"
            alt="Audit log with denied attempts and chain verification"
            width={1440}
            height={900}
            loading="lazy"
            decoding="async"
            className="absolute bottom-4 left-[8%] w-[46%] rounded-xl object-cover object-top border border-gray-300 shadow-[0_15px_40px_rgba(17,24,39,0.18)]"
            style={{ height: '46%' }}
          />
        </div>
        <p className="mt-4 text-[13px] text-gray-500">Screenshots of the running prototype with synthetic citizen records.</p>
      </section>

      {/* Limits & Claims */}
      <section id="limits" className="mx-auto max-w-[1400px] px-5 pb-32 md:px-10">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 md:p-14 shadow-sm">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <div className="text-[11px] font-bold tracking-[0.1em] text-gray-500 uppercase mb-3">Honest Engineering</div>
              <h2 className="t-section tracking-tight text-gray-900">What it does not claim.</h2>
            </div>
            <ul className="flex flex-col text-[16px] space-y-4">
              {[
                'Synthetic citizens and demo identities. Nothing here is real personal data.',
                'TideCloak is simulated. No Tide server or ORK network runs behind this prototype: sign-in, tokens, roles, the ORK key shares and the contracts are reproduced locally with the shapes Tide documents, so the app can be switched to the real SDK. The simulation reassembles keys inside one process, which real Tide never does.',
                'An authorised person can still photograph a record they were allowed to open. The audit log records the access, not what happens next.',
                'Prototype scale: one database, one server, built for the hackathon proof-of-concept.',
              ].map(t => (
                <li key={t} className="flex items-start gap-3.5 border-t border-gray-100 pt-4 text-gray-600 leading-relaxed">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-50 border border-blue-200 text-[#2727e6] mt-0.5">
                    <Check className="size-3.5" />
                  </span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Final Heroic CTA */}
      <section className="relative border-t border-gray-200 bg-gradient-to-b from-white via-[#f3f5ff] to-[#e9edfb] py-32 text-gray-900 overflow-hidden">
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] rounded-full bg-[#2727e6]/10 blur-3xl" />

        <div className="relative mx-auto flex max-w-[1400px] flex-col items-start gap-8 px-5 md:px-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-[11px] font-semibold tracking-wider text-blue-700 uppercase">
            Interactive Testbed
          </div>
          <h2 className="t-hero max-w-[14ch] tracking-tight text-gray-900">
            See it refuse.
          </h2>
          <p className="t-sub max-w-[50ch] text-gray-600 text-[18px] leading-relaxed">
            The guided demo plays three attacks, then the legitimate flow with the citizen in the loop. About two minutes, repeatable.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <Link
              href="/app/demo"
              className="inline-flex items-center gap-2 rounded-full border border-blue-500/25 bg-gradient-to-r from-[#2727e6] via-[#334ceb] to-[#3b5bf5] px-8 py-4 text-[16px] font-semibold text-white shadow-[0_2px_16px_rgba(39,39,230,0.32)] hover:shadow-[0_8px_30px_rgba(39,39,230,0.45)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            >
              Start the guided demo <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/app"
              className="inline-flex items-center rounded-full border border-gray-200 bg-white px-8 py-4 text-[16px] font-semibold text-gray-800 shadow-sm hover:bg-gray-50 hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              Open the console
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto grid max-w-[1400px] gap-8 px-5 py-16 md:grid-cols-4 md:px-10 border-t border-gray-200 text-gray-500">
        <div>
          <div className="flex items-center gap-2 text-[18px] font-bold tracking-tight text-gray-900 mb-2">
            <span className="size-2.5 rounded-full bg-[#2727e6] shadow-[0_0_10px_rgba(39,39,230,0.5)]" />
            Consent Quorum
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            Zero-trust multi-party authorization for sensitive citizen data.
          </p>
        </div>
        <div className="t-nav flex flex-col gap-2">
          <span className="font-bold text-gray-900 text-[13px] uppercase tracking-wider">Console</span>
          <Link href="/app" className="hover:text-[#2727e6] transition-colors">Overview</Link>
          <Link href="/app/cases" className="hover:text-[#2727e6] transition-colors">Cases</Link>
          <Link href="/app/audit" className="hover:text-[#2727e6] transition-colors">Audit log</Link>
        </div>
        <div className="t-nav flex flex-col gap-2">
          <span className="font-bold text-gray-900 text-[13px] uppercase tracking-wider">Prove It</span>
          <Link href="/app/demo" className="hover:text-[#2727e6] transition-colors">Guided demo</Link>
          <Link href="/app/lab" className="hover:text-[#2727e6] transition-colors">Security lab</Link>
        </div>
        <p className="t-legal text-gray-500 leading-relaxed">
          Built for the RMIT SGS Hackathon 2026, TideCloak challenge. Prototype with synthetic data.
        </p>
      </footer>
    </div>
  )
}
