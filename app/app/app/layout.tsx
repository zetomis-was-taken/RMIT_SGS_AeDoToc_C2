'use client'
import { useState, type ReactNode } from 'react'
import { ArrowRight, Check, KeyRound, ShieldAlert, X } from 'lucide-react'
import { AppProvider, useApp } from '@/components/app-context'
import { Shell } from '@/components/shell'
import { PageTitle } from '@/components/bits'
import { Button } from '@/components/ui/button'
import { ROLE_BLURB, ROLE_CAN, ROLE_LABEL } from '@/lib/client'
import { SignInError } from '@/lib/tide-client'

type Votes = { ork: number; ok: boolean }[]

// The simulated TideCloak sign-in. Password is verified by the ORKs (2 of 3); the app server never sees a password hash.
function TideLogin({ username, name, onClose }: { username: string; name: string; onClose: () => void }) {
  const { signInAs } = useApp()
  const [pw, setPw] = useState('demo')
  const [phase, setPhase] = useState<'idle' | 'working' | 'done' | 'fail'>('idle')
  const [votes, setVotes] = useState<Votes>([])
  const [shown, setShown] = useState(0)
  const [msg, setMsg] = useState('')

  const go = async () => {
    setPhase('working'); setShown(0); setMsg('')
    try {
      const j = await signInAs(username, pw)
      setVotes(j.ork.votes)
      for (let i = 1; i <= 4; i++) { await new Promise(r => setTimeout(r, 380)); setShown(i) }
      setPhase('done')
    } catch (e) {
      setVotes(e instanceof SignInError ? e.votes : [])
      for (let i = 1; i <= 3; i++) { await new Promise(r => setTimeout(r, 300)); setShown(i) }
      setMsg(e instanceof Error ? e.message : 'Sign-in failed'); setPhase('fail')
    }
  }
  const steps = [
    ...[1, 2, 3].map(n => ({ label: `ORK ${n} checks the password`, ok: votes.find(v => v.ork === n)?.ok })),
    { label: 'ORKs combine partial signatures into the access token (VVK)', ok: phase !== 'fail' },
  ]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="TideCloak sign-in">
      <div className="w-full max-w-[460px] rounded-[8px] bg-white p-6">
        <div className="flex items-start justify-between gap-3">
          <div><div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.1em] text-ash uppercase"><KeyRound className="size-3.5" />TideCloak · simulated</div>
            <h2 className="t-title mt-2 text-[28px]">{name.split(' (')[0]}</h2></div>
          <button onClick={onClose} aria-label="Close" className="rounded-[4px] p-1 hover:bg-black/5"><X className="size-5" /></button>
        </div>
        <form className="mt-5 flex flex-col gap-3" onSubmit={e => { e.preventDefault(); if (phase !== 'working') go() }}>
          <label className="flex flex-col gap-1 text-[12px] font-semibold text-ash">Username<input readOnly value={username} className="rounded-[8px] border border-rule bg-canvas px-3 py-2 text-[14px] text-ink" /></label>
          <label className="flex flex-col gap-1 text-[12px] font-semibold text-ash">Password <span className="font-normal">(demo accounts use “demo”)</span>
            <input type="password" name="password" autoComplete="current-password" value={pw} onChange={e => setPw(e.target.value)} className="rounded-[8px] border border-rule px-3 py-2 text-[14px] text-ink" /></label>
          <Button type="submit" size="lg" disabled={phase === 'working'}>{phase === 'working' ? 'Contacting the ORK network…' : 'Sign in with Tide'}</Button>
        </form>
        {phase !== 'idle' && (
          <ol className="mt-5 flex flex-col gap-2 text-[13px]" aria-live="polite">
            {steps.slice(0, shown).map((s, i) => (
              <li key={i} className="flex items-center gap-2">{s.ok === false ? <X className="size-4" /> : <Check className="size-4" />}<span className={s.ok === false ? 'font-semibold' : ''}>{s.label}{s.ok === false && i < 3 ? ': refused' : ''}</span></li>
            ))}
          </ol>
        )}
        {phase === 'fail' && <div role="alert" className="mt-4 flex gap-2 rounded-[8px] bg-black p-3 text-[13px] text-white"><ShieldAlert className="size-5 shrink-0" /><div><b>Sign-in refused.</b> {msg}</div></div>}
        {phase === 'done' && <Button className="mt-4 w-full" variant="outline" onClick={onClose}>Continue to the console <ArrowRight /></Button>}
        <p className="mt-4 text-[11px] leading-snug text-ash">Simulation: no TideCloak server or ORK network is running. This reproduces the sign-in, DPoP-bound token and role claims so the app can be switched to the real SDK later.</p>
      </div>
    </div>
  )
}

type Pick = { id: string; name: string } | null
function SignIn({ pick, setPick }: { pick: Pick; setPick: (p: Pick) => void }) {
  const { users, booted } = useApp()
  return (
    <>
      <PageTitle title="Who is signing in?">
        One record, five parties, no single point of trust. Take each seat in turn and see what that person can and cannot do. Sign-in is a simulated TideCloak flow: the ORKs verify the password, and the app only trusts the signed token.
      </PageTitle>
      {!booted ? <p className="text-ash">Loading…</p> : (
        <div className="grid max-w-[980px] gap-3 md:grid-cols-2">
          {users.map(u => (
            <button key={u.id} onClick={() => setPick({ id: u.id, name: u.name })} className="group flex flex-col gap-3 rounded-[8px] bg-white p-5 text-left transition-shadow hover:shadow-lift">
              <div className="flex items-start justify-between gap-3">
                <div><div className="text-[19px] font-bold tracking-[-0.03em]">{u.name.split(' (')[0]}</div><div className="t-nav text-ash">{ROLE_LABEL[u.role]}</div></div>
                <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
              </div>
              <p className="text-[13px] text-ash">{ROLE_BLURB[u.role]}</p>
              <ul className="text-[13px]">{ROLE_CAN[u.role].map(c => <li key={c} className="border-t border-rule py-1.5">{c}</li>)}</ul>
            </button>
          ))}
        </div>
      )}
      {pick && <TideLogin username={pick.id} name={pick.name} onClose={() => setPick(null)} />}
    </>
  )
}

function Gate({ children }: { children: ReactNode }) {
  const { me } = useApp()
  // the dialog outlives the sign-in itself, so the ORK steps stay visible until the person continues
  const [pick, setPick] = useState<Pick>(null)
  return me && !pick ? <>{children}</> : <SignIn pick={pick} setPick={setPick} />
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AppProvider>
      <Shell><Gate>{children}</Gate></Shell>
    </AppProvider>
  )
}
