'use client'
import type { ReactNode } from 'react'
import { AppProvider, useApp } from '@/components/app-context'
import { Shell } from '@/components/shell'
import { PageTitle } from '@/components/bits'
import { Button } from '@/components/ui/button'
import { ROLE_BLURB, ROLE_CAN, ROLE_LABEL } from '@/lib/client'
import { ArrowRight } from 'lucide-react'

function SignIn() {
  const { users, login, booted } = useApp()
  return (
    <>
      <PageTitle title="Who is signing in?">
        One record, five parties, no single point of trust. Take each seat in turn and see what that person can and cannot do. These are demo identities; TideCloak login replaces this step.
      </PageTitle>
      {!booted ? <p className="text-ash">Loading…</p> : (
        <div className="grid max-w-[980px] gap-3 md:grid-cols-2">
          {users.map(u => (
            <button key={u.id} onClick={() => login(u.id)} className="group flex flex-col gap-3 rounded-[8px] bg-white p-5 text-left transition-shadow hover:shadow-lift">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[19px] font-bold tracking-[-0.03em]">{u.name.split(' (')[0]}</div>
                  <div className="t-nav text-ash">{ROLE_LABEL[u.role]}</div>
                </div>
                <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
              </div>
              <p className="text-[13px] text-ash">{ROLE_BLURB[u.role]}</p>
              <ul className="text-[13px]">{ROLE_CAN[u.role].map(c => <li key={c} className="border-t border-rule py-1.5">{c}</li>)}</ul>
            </button>
          ))}
        </div>
      )}
    </>
  )
}

function Gate({ children }: { children: ReactNode }) {
  const { me } = useApp()
  return me ? <>{children}</> : <SignIn />
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AppProvider>
      <Shell><Gate>{children}</Gate></Shell>
    </AppProvider>
  )
}
