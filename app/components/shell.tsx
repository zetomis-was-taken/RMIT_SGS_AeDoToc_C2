'use client'
import { AlertOctagon, CircleUserRound, FlaskConical, Folders, LayoutDashboard, LogOut, MailCheck, ScrollText, ShieldCheck, ShieldAlert, X, CheckCircle2, Info } from 'lucide-react'
import type { ReactNode } from 'react'
import { useApp, type View } from './app-context'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { CODE_TITLE, ROLE_LABEL } from '@/lib/client'

const NAV: { id: View; label: string; icon: typeof Folders }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'cases', label: 'Cases', icon: Folders },
  { id: 'requests', label: 'Consent requests', icon: MailCheck },
  { id: 'policy', label: 'Policy changes', icon: ShieldCheck },
  { id: 'audit', label: 'Audit log', icon: ScrollText },
  { id: 'lab', label: 'Security lab', icon: FlaskConical },
]

export function Shell({ children }: { children: ReactNode }) {
  const { me, users, view, setView, login, logout, reqs, changes, log, violations, setAuditFilter, toasts, dismiss } = useApp()
  const pendingReqs = reqs.filter(r => r.status === 'pending').length
  const pendingChanges = changes.filter(c => c.status === 'pending').length
  const denied = log.filter(l => l.decision === 'DENY').length
  const badge: Partial<Record<View, number>> = { requests: pendingReqs, policy: pendingChanges, audit: denied }

  return (
    <div className="min-h-screen md:pl-[256px]">
      <aside className="flex flex-col gap-6 bg-iris px-4 py-5 text-white md:fixed md:inset-y-0 md:left-0 md:w-[256px]">
        <div>
          <div className="ddc text-[26px]">Citizen Consent Quorum</div>
          <div className="mt-1 text-[12px] text-white/75">Agency data exchange · demo</div>
        </div>
        <div className="h-px bg-white/30" />
        <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible" aria-label="Sections">
          {NAV.map(n => {
            const Icon = n.icon
            const on = view === n.id
            const count = badge[n.id]
            return (
              <button key={n.id} onClick={() => setView(n.id)} aria-current={on ? 'page' : undefined}
                className={`flex items-center gap-2.5 rounded-[12px] px-3 py-2 text-left text-[14px] font-medium whitespace-nowrap transition-colors duration-150 ${on ? 'bg-white text-iris' : 'text-white hover:bg-white/15'}`}>
                <Icon className="size-4 shrink-0" />
                <span className="flex-1">{n.label}</span>
                {!!count && me && <span className={`num rounded-full px-1.5 text-[11px] ${on ? 'bg-iris text-white' : 'bg-white text-iris'}`}>{count}</span>}
              </button>
            )
          })}
        </nav>
        <div className="mt-auto flex flex-col gap-3">
          <div className="h-px bg-white/30" />
          <label className="text-[12px] text-white/75" htmlFor="persona">Signed in as</label>
          <select id="persona" value={me?.id ?? ''} onChange={e => login(e.target.value)}
            className="rounded-[12px] border-[1.5px] border-white bg-iris px-3 py-2 text-[13px] font-medium text-white">
            <option value="" disabled>Choose an identity…</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          {me && (
            <button onClick={logout} className="flex items-center gap-2 text-left text-[12px] text-white/80 underline underline-offset-4 hover:text-white">
              <LogOut className="size-3.5" /> Sign out
            </button>
          )}
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-line bg-white/95 px-6 py-3 backdrop-blur-0 md:px-10">
          <div className="flex min-w-0 items-center gap-2">
            <CircleUserRound className="size-5 text-iris" />
            {me ? (
              <span className="truncate text-[14px] font-medium">{me.name.split(' (')[0]} <span className="font-normal text-soft">· {ROLE_LABEL[me.role]}</span></span>
            ) : <span className="text-soft">Not signed in</span>}
          </div>
          <span className="flex-1" />
          {me && (
            <button onClick={() => { setAuditFilter('DENY'); setView('audit') }} title="Show denied attempts in the audit log"
              className="flex items-center gap-2 rounded-full border border-line px-3 py-1 text-[13px] font-medium hover:bg-iris-50">
              <ShieldAlert className={`size-4 ${violations ? 'text-danger' : 'text-soft'}`} />
              Violations this session
              <Badge variant={violations ? 'danger' : 'outline'} className="num">{violations}</Badge>
            </button>
          )}
        </header>
        <main className="px-6 py-8 md:px-10">{children}</main>
      </div>

      <div className="pointer-events-none fixed top-16 right-4 z-50 flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2" aria-live="assertive">
        {toasts.map(t => (
          <div key={t.id} role="alert" className={`toast-in pointer-events-auto flex gap-3 border bg-white p-3 text-[13px] ${t.kind === 'violation' ? 'border-danger bg-danger-bg' : t.kind === 'success' ? 'border-ok/40' : 'border-line'}`}>
            {t.kind === 'violation' ? <AlertOctagon className="mt-0.5 size-5 shrink-0 text-danger" /> : t.kind === 'success' ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-ok" /> : <Info className="mt-0.5 size-5 shrink-0 text-iris" />}
            <div className="min-w-0 flex-1">
              <div className={`font-medium ${t.kind === 'violation' ? 'text-danger' : ''}`}>{t.code ? (CODE_TITLE[t.code] ?? t.title) : t.title}</div>
              <div className="text-soft">{t.message}</div>
              {t.kind === 'violation' && <div className="mono mt-1 text-danger/80">{t.code} · recorded in the audit log</div>}
            </div>
            <Button variant="ghost" size="icon-xs" onClick={() => dismiss(t.id)} aria-label="Dismiss"><X /></Button>
          </div>
        ))}
      </div>
    </div>
  )
}
