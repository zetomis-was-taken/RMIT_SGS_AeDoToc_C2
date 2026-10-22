'use client'
import { AppProvider, useApp } from '@/components/app-context'
import { Shell } from '@/components/shell'
import { Overview } from '@/components/views/overview'
import { Cases } from '@/components/views/cases'
import { Requests } from '@/components/views/requests'
import { Policy } from '@/components/views/policy'
import { Audit } from '@/components/views/audit'
import { Lab } from '@/components/views/lab'
import { PageTitle } from '@/components/bits'
import { Button } from '@/components/ui/button'
import { ROLE_BLURB, ROLE_LABEL } from '@/lib/client'

function SignIn() {
  const { users, login, booted } = useApp()
  return (
    <>
      <PageTitle title="Choose who you are">
        One record, five parties, no single point of trust. Sign in as each person in turn to see what they can and cannot do. (Demo identities. TideCloak login replaces this step.)
      </PageTitle>
      <div className="max-w-[720px] border border-line">
        {!booted && <div className="p-6 text-soft">Loading…</div>}
        {users.map(u => (
          <div key={u.id} className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
            <div className="min-w-[240px] flex-1">
              <div className="font-medium">{u.name.split(' (')[0]} <span className="font-normal text-soft">· {ROLE_LABEL[u.role]}</span></div>
              <div className="text-[13px] text-soft">{ROLE_BLURB[u.role]}</div>
            </div>
            <Button variant="outline" onClick={() => login(u.id)}>Sign in</Button>
          </div>
        ))}
      </div>
    </>
  )
}

function Body() {
  const { me, view } = useApp()
  if (!me) return <SignIn />
  return view === 'overview' ? <Overview /> : view === 'cases' ? <Cases /> : view === 'requests' ? <Requests /> : view === 'policy' ? <Policy /> : view === 'audit' ? <Audit /> : <Lab />
}

export default function Page() {
  return (
    <AppProvider>
      <Shell><Body /></Shell>
    </AppProvider>
  )
}
