'use client'
import { Activity, ArrowUpRight, CheckCheck, CircleUserRound, FlaskConical, Folders, LayoutDashboard, LogOut, MailCheck, Play, ScrollText, ShieldAlert, ShieldCheck, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useApp } from './app-context'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { CODE_TITLE, ROLE_LABEL } from '@/lib/client'
import { canOpen, type PageId } from '@/lib/access'

const GROUPS: { label: string; items: { id: PageId; href: string; label: string; icon: typeof Folders }[] }[] = [
  { label: 'Workspace', items: [
    { id: 'overview', href: '/app', label: 'Overview', icon: LayoutDashboard },
    { id: 'cases', href: '/app/cases', label: 'Cases', icon: Folders },
  ] },
  { label: 'Approvals', items: [
    { id: 'requests', href: '/app/requests', label: 'Consent requests', icon: MailCheck },
    { id: 'policy', href: '/app/policy', label: 'Policy changes', icon: ShieldCheck },
  ] },
  { label: 'Governance', items: [{ id: 'audit', href: '/app/audit', label: 'Audit log', icon: ScrollText }] },
  { label: 'Demo', items: [
    { id: 'demo', href: '/app/demo', label: 'Guided demo', icon: Play },
    { id: 'lab', href: '/app/lab', label: 'Security lab', icon: FlaskConical },
  ] },
]

export function Shell({ children }: { children: ReactNode }) {
  const { me, users, login, logout, reqs, changes, log, violations, setAuditFilter, toasts, dismiss } = useApp()
  const path = usePathname()
  const router = useRouter()
  const count: Partial<Record<PageId, number>> = {
    requests: reqs.filter(r => r.status === 'pending').length,
    policy: changes.filter(c => c.status === 'pending').length,
    audit: log.filter(l => l.decision === 'DENY').length,
  }
  const active = (href: string) => (href === '/app' ? path === '/app' : path.startsWith(href))

  return (
    <div className="min-h-screen md:pl-[264px]">
      <a href="#content" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-[8px] focus:bg-white focus:px-4 focus:py-2 focus:text-ink">Skip to content</a>
      <aside className="flex flex-col gap-5 bg-ink px-4 py-5 text-white md:fixed md:inset-y-0 md:left-0 md:w-[264px] md:overflow-y-auto">
        <Link href="/" className="group block" aria-label="Back to landing page">
          <div className="text-[20px] leading-[1.05] font-bold tracking-[-0.04em]">Consent<br />Quorum</div>
          <div className="t-nav mt-1.5 flex items-center gap-1 text-white/70 group-hover:text-white">Operations console <ArrowUpRight className="size-3.5" /></div>
        </Link>

        <nav className="flex flex-col gap-5" aria-label="Sections">
          {GROUPS.map(g => {
            const items = g.items.filter(i => me && canOpen(me.role, i.id))
            if (!items.length) return null
            return (
              <div key={g.label}>
                <div className="mb-1.5 px-2 text-[11px] font-semibold tracking-[0.06em] text-white/65 uppercase">{g.label}</div>
                <div className="flex flex-col gap-0.5">
                  {items.map(n => {
                    const Icon = n.icon, on = active(n.href), c = count[n.id]
                    return (
                      <Link key={n.id} href={n.href} aria-current={on ? 'page' : undefined}
                        className={`t-nav flex items-center gap-2.5 rounded-[4px] px-2 py-1.5 transition-colors duration-150 ${on ? 'bg-white text-ink' : 'text-white/85 hover:bg-white/10'}`}>
                        <Icon className="size-4 shrink-0" />
                        <span className="flex-1">{n.label}</span>
                        {!!c && <span className={`num rounded-[4px] px-1.5 text-[11px] font-bold ${on ? 'bg-ink text-white' : 'bg-white text-ink'}`}>{c}</span>}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-2.5 border-t border-white/15 pt-4">
          <label className="text-[11px] font-semibold tracking-[0.06em] text-white/65 uppercase" htmlFor="persona">Acting as</label>
          <select id="persona" value={me?.id ?? ''} onChange={e => login(e.target.value).then(() => router.push('/app'))}
            className="rounded-[8px] border border-white/30 bg-graphite px-3 py-2 text-[13px] font-semibold text-white">
            <option value="" disabled>Choose an identity…</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          {me && <button onClick={() => logout().then(() => router.push('/app'))} className="t-nav flex items-center gap-2 text-left text-white/60 hover:text-white"><LogOut className="size-3.5" />Sign out</button>}
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 bg-canvas/95 px-5 py-3 md:px-10">
          <div className="t-nav flex min-w-0 items-center gap-2">
            <CircleUserRound className="size-[18px]" />
            {me ? <span className="truncate font-semibold">{me.name.split(' (')[0]} <span className="font-normal text-ash">· {ROLE_LABEL[me.role]}</span></span> : <span className="text-ash">Not signed in</span>}
          </div>
          <span className="flex-1" />
          {me && (
            <Link href="/app/audit" onClick={() => setAuditFilter('DENY')} title="Open the audit log filtered to denied attempts"
              className="t-nav flex items-center gap-2 rounded-[8px] bg-white px-3 py-1 hover:shadow-lift">
              <ShieldAlert className="size-4" />Violations this session
              <Badge variant={violations ? 'danger' : 'outline'} className="num">{violations}</Badge>
            </Link>
          )}
        </header>
        <main id="content" className="px-5 pt-4 pb-16 md:px-10">{children}</main>
      </div>

      <div className="pointer-events-none fixed top-14 right-4 z-50 flex w-[min(400px,calc(100vw-2rem))] flex-col gap-2" aria-live="assertive">
        {toasts.map(t => t.kind === 'violation' ? (
          <div key={t.id} role="alert" className="toast-in hatch-dark pointer-events-auto flex gap-3 rounded-[8px] bg-black p-4 text-white shadow-lift">
            <ShieldAlert className="mt-0.5 size-6 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold tracking-[0.1em] text-white/60 uppercase">Access denied · logged</div>
              <div className="text-[17px] leading-tight font-bold tracking-[-0.02em]">{t.code ? (CODE_TITLE[t.code] ?? t.title) : t.title}</div>
              <div className="mt-1 text-[13px] text-white/80">{t.message}</div>
              {t.code && <div className="mono mt-2 text-white/50">{t.code}</div>}
            </div>
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="self-start rounded-[4px] p-1 text-white/60 hover:bg-white/15 hover:text-white"><X className="size-4" /></button>
          </div>
        ) : (
          <div key={t.id} role="status" className="toast-in pointer-events-auto flex gap-3 rounded-[8px] bg-white p-3 text-[13px] shadow-lift">
            {t.kind === 'success' ? <CheckCheck className="mt-0.5 size-5 shrink-0" /> : <Activity className="mt-0.5 size-5 shrink-0" />}
            <div className="min-w-0 flex-1"><div className="font-bold">{t.title}</div><div className="text-ash">{t.message}</div></div>
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="self-start rounded-[4px] p-1 text-ash hover:bg-black/5"><X className="size-4" /></button>
          </div>
        ))}
      </div>
    </div>
  )
}
