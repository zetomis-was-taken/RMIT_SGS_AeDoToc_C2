import { ArrowRight, ArrowUpRight, Check, X } from 'lucide-react'
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
  ['Refusal you can see', 'Out-of-scope attempts return a code, show a black card and land in the log. Hiding a button is not the protection.', '/app/lab'],
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
    <div className="bg-canvas">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-[8px] focus:bg-ink focus:px-4 focus:py-2 focus:text-white">Skip to content</a>
      <header className="mx-auto flex max-w-[1400px] items-center justify-between gap-6 px-5 pt-5 md:px-10">
        <Link href="/" className="text-[18px] leading-none font-bold tracking-[-0.04em]">Consent Quorum</Link>
        <nav className="t-nav hidden items-center gap-6 md:flex" aria-label="Page sections">
          {[["#problem", "Problem"], ["#how", "How it works"], ["#features", "Features"], ["#roles", "Roles"], ["#limits", "Limits"]].map(([h, l]) => <a key={h} href={h} className="underline-offset-4 hover:underline">{l}</a>)}
        </nav>
        <Link href="/app" className="rounded-[8px] bg-ink px-5 py-2.5 text-[15px] font-semibold tracking-[-0.03em] text-white hover:shadow-lift">Open the console</Link>
      </header>

      {/* hero: oversized statement left, vault overlapping centre-right, compact copy lower right */}
      <section id="main" className="mx-auto grid max-w-[1400px] gap-8 px-5 pt-14 pb-24 md:px-10 lg:grid-cols-12 lg:pt-20">
        <h1 className="t-hero relative z-10 lg:col-span-7 lg:col-start-1 lg:row-start-1">
          No one opens a citizen&rsquo;s record <span className="text-ash">alone.</span>
        </h1>
        <div className="lg:col-span-5 lg:col-start-8 lg:row-span-2 lg:row-start-1"><HeroVault /></div>
        <div className="flex max-w-[520px] flex-col gap-5 self-end lg:col-span-5 lg:col-start-1 lg:row-start-2">
          <p className="t-sub">Agencies refuse to share records because sharing means trusting another agency&rsquo;s admins. Here a record opens only when the assigned officer, a supervisor <em className="not-italic font-semibold">and the citizen</em> approve.</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/app/demo" className="inline-flex items-center gap-2 rounded-[8px] bg-ink px-6 py-3 text-[16px] font-semibold tracking-[-0.04em] text-white hover:shadow-lift">Watch it refuse <ArrowRight className="size-4" /></Link>
            <a href="#how" className="inline-flex items-center gap-2 rounded-[8px] bg-white px-6 py-3 text-[16px] font-semibold tracking-[-0.04em] text-graphite hover:shadow-lift">How it works</a>
          </div>
        </div>
      </section>

      {/* problem: black band */}
      <section id="problem" className="bg-black text-white">
        <div className="mx-auto max-w-[1400px] px-5 py-24 md:px-10">
          <h2 className="t-section max-w-[16ch]">The people with the most access are the threat.</h2>
          <p className="t-sub mt-6 max-w-[60ch] text-white/65">Three failures, all ordinary, all with valid logins. Login plus a role check stops none of them.</p>
          <div className="mt-14 divide-y divide-white/15 border-y border-white/15">
            {FAILS.map(f => (
              <div key={f.who} className="grid gap-4 py-8 md:grid-cols-[1.1fr_1fr] md:gap-16">
                <p className="text-[clamp(24px,3vw,40px)] leading-[1.08] font-semibold tracking-[-0.04em]"><span className="text-white/50">{f.who}</span> {f.what}</p>
                <p className="flex items-start gap-3 self-center text-[16px] text-white/65"><X className="mt-1 size-4 shrink-0 text-white" />{f.why}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* how it works */}
      <section id="how" className="mx-auto max-w-[1400px] px-5 py-28 md:px-10">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-20">
          <div>
            <h2 className="t-section">Every opening needs three people.</h2>
            <p className="t-sub mt-6 max-w-[40ch] text-graphite">Five steps, in this order. Each one is enforced by the server, not by what the interface chooses to show.</p>
          </div>
          <ol className="flex flex-col">
            {STEPS.map((s, i) => (
              <li key={s.t} className="grid grid-cols-[56px_1fr] gap-4 border-t border-ink/20 py-6 first:border-t-0 first:pt-0">
                <span className="num text-[44px] leading-none font-bold tracking-[-0.06em] text-ash">{i + 1}</span>
                <div><div className="text-[24px] font-bold tracking-[-0.04em]">{s.t}</div><p className="mt-1 max-w-[52ch] text-[16px] text-graphite">{s.d}</p></div>
              </li>
            ))}
          </ol>
        </div>
        <div className="mt-16 rounded-[8px] bg-ink p-8 text-white md:p-12">
          <div className="text-[11px] font-bold tracking-[0.1em] text-white/50 uppercase">Meanwhile, on the policy side</div>
          <p className="mt-3 max-w-[30ch] text-[clamp(26px,3.4vw,44px)] leading-[1.08] font-semibold tracking-[-0.04em]">An admin proposes. Two supervisors decide. The admin never gets a vote.</p>
        </div>
      </section>

      {/* features: a typographic list, not a card grid */}
      <section id="features" className="mx-auto max-w-[1400px] px-5 pb-28 md:px-10">
        <h2 className="t-section max-w-[18ch]">What the prototype actually does.</h2>
        <div className="mt-14 grid gap-x-16 md:grid-cols-2">
          {FEATURES.map(([t, d, href]) => (
            <Link key={t} href={href} className="group grid grid-cols-[1fr_auto] gap-4 border-t border-ink/25 py-7">
              <div><h3 className="text-[26px] leading-[1.1] font-bold tracking-[-0.04em]">{t}</h3><p className="mt-2 max-w-[46ch] text-[16px] text-graphite">{d}</p></div>
              <ArrowUpRight className="mt-1 size-6 shrink-0 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
            </Link>
          ))}
        </div>
      </section>

      {/* roles: black showcase */}
      <section id="roles" className="mx-auto max-w-[1400px] px-5 pb-28 md:px-10">
        <div className="hatch-dark overflow-hidden rounded-[8px] bg-black text-white">
          <div className="grid gap-10 p-8 md:p-14 lg:grid-cols-[1fr_1.4fr]">
            <div><h2 className="t-section">Five people. Five different consoles.</h2><p className="t-sub mt-6 max-w-[34ch] text-white/65">Sign in as each one. The menu, the data and the buttons change, and the server refuses what the interface does not offer.</p>
              <Link href="/app" className="mt-8 inline-flex items-center gap-2 rounded-[8px] bg-white px-6 py-3 text-[16px] font-semibold tracking-[-0.04em] text-graphite hover:shadow-lift">Choose a role <ArrowRight className="size-4" /></Link></div>
            <dl className="divide-y divide-white/15 border-y border-white/15">
              {ROLES.map(([r, d]) => (<div key={r} className="grid gap-1 py-5 sm:grid-cols-[170px_1fr] sm:gap-6"><dt className="text-[18px] font-bold tracking-[-0.03em]">{r}</dt><dd className="text-[15px] text-white/70">{d}</dd></div>))}
            </dl>
          </div>
        </div>
      </section>

      {/* demo preview: overlapping real screenshots, mismatched sizes */}
      <section className="mx-auto max-w-[1400px] px-5 pb-32 md:px-10">
        <h2 className="t-section max-w-[16ch]">This is the real console.</h2>
        <div className="relative mt-12 h-[420px] sm:h-[560px] lg:h-[720px]">
          <img src="/shots/overview.png" alt="Supervisor overview: actions waiting, decision chart, role matrix" width={1440} height={900} loading="lazy" decoding="async" className="absolute top-0 left-0 w-[62%] rounded-[8px] object-cover object-top" style={{ height: '70%' }} />
          <img src="/shots/denied.png" alt="A black violation card after an out-of-scope attempt" width={1440} height={900} loading="lazy" decoding="async" className="absolute top-[22%] right-0 w-[52%] rounded-[4px] object-cover object-top" style={{ height: '62%' }} />
          <img src="/shots/audit.png" alt="Audit log with denied attempts and chain verification" width={1440} height={900} loading="lazy" decoding="async" className="absolute bottom-0 left-[8%] w-[44%] rounded-[4px] object-cover object-top" style={{ height: '44%' }} />
        </div>
        <p className="mt-4 text-[13px] text-ash">Screenshots of the running prototype with synthetic data.</p>
      </section>

      <section id="limits" className="mx-auto max-w-[1400px] px-5 pb-28 md:px-10">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <h2 className="t-section">What it does not claim.</h2>
          <ul className="flex flex-col text-[17px]">
            {[
              'Synthetic citizens and demo identities. Nothing here is real personal data.',
              'Field encryption keys currently come from the server environment. A single operator of the app host could still reach them; moving key custody to TideCloak is the intended fix and is not finished.',
              'An authorised person can still photograph a record they were allowed to open. The audit log records the access, not what happens next.',
              'Prototype scale: one database, one server, no production hardening.',
            ].map(t => <li key={t} className="flex gap-3 border-t border-ink/25 py-4"><Check className="mt-1.5 size-4 shrink-0" />{t}</li>)}
          </ul>
        </div>
      </section>

      {/* final CTA */}
      <section className="bg-ink text-white">
        <div className="mx-auto flex max-w-[1400px] flex-col items-start gap-8 px-5 py-28 md:px-10">
          <h2 className="t-hero max-w-[12ch]">See it refuse.</h2>
          <p className="t-sub max-w-[46ch] text-white/65">The guided demo plays three attacks, then the legitimate flow with the citizen in the loop. About two minutes, repeatable.</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/app/demo" className="inline-flex items-center gap-2 rounded-[8px] bg-white px-7 py-3.5 text-[16px] font-semibold tracking-[-0.04em] text-graphite hover:shadow-lift">Start the guided demo <ArrowRight className="size-4" /></Link>
            <Link href="/app" className="inline-flex items-center rounded-[8px] border border-white/40 px-7 py-3.5 text-[16px] font-semibold tracking-[-0.04em] hover:bg-white/10">Open the console</Link>
          </div>
        </div>
      </section>

      <footer className="mx-auto grid max-w-[1400px] gap-8 px-5 py-14 md:grid-cols-4 md:px-10">
        <div className="text-[18px] font-bold tracking-[-0.04em]">Consent Quorum</div>
        <div className="t-nav flex flex-col gap-1.5"><span className="font-bold">Console</span><Link href="/app">Overview</Link><Link href="/app/cases">Cases</Link><Link href="/app/audit">Audit log</Link></div>
        <div className="t-nav flex flex-col gap-1.5"><span className="font-bold">Prove it</span><Link href="/app/demo">Guided demo</Link><Link href="/app/lab">Security lab</Link></div>
        <p className="t-legal text-ash">Built for the RMIT SGS Hackathon 2026, TideCloak challenge. Prototype with synthetic data.</p>
      </footer>
    </div>
  )
}
