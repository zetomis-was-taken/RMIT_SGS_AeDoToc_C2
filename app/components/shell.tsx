'use client'
import { Activity, ArrowUpRight, KeyRound, CheckCheck, CircleUserRound, FlaskConical, Folders, LayoutDashboard, LogOut, MailCheck, Play, ScrollText, ShieldAlert, ShieldCheck, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useApp } from './app-context'
import { Badge } from './ui/badge'
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
  { label: 'Governance', items: [
    { id: 'audit', href: '/app/audit', label: 'Audit log', icon: ScrollText },
    { id: 'tide', href: '/app/tide', label: 'TideCloak', icon: KeyRound },
  ] },
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
    <div className="min-h-screen md:pl-[264px] bg-[#f0f2f8] text-gray-900">
      <a href="#content" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-gray-900 focus:px-4 focus:py-2 focus:text-white focus:shadow-2xl font-bold">Skip to content</a>
      
      {/* Frosted light sidebar */}
      <aside className="flex flex-col gap-6 border-r border-gray-200 bg-white/95 backdrop-blur-2xl px-5 py-6 text-gray-900 md:fixed md:inset-y-0 md:left-0 md:w-[264px] md:overflow-y-auto shadow-[4px_0_24px_rgba(17,24,39,0.04)] z-40">
        <Link href="/" className="group block" aria-label="Back to landing page">
          <div className="flex items-center gap-2.5">
            <span className="size-3 rounded-full bg-[#2727e6] shadow-[0_0_12px_rgba(39,39,230,0.5)] animate-pulse" />
            <div className="text-[20px] leading-[1.05] font-bold tracking-[-0.04em] text-gray-900">
              Consent<br />Quorum
            </div>
          </div>
          <div className="t-nav mt-2.5 flex items-center gap-1.5 text-xs text-gray-500 group-hover:text-gray-900">
            <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider text-[#2727e6]">Ops Console</span>
            <ArrowUpRight className="size-3" />
          </div>
        </Link>

        <nav className="flex flex-col gap-6" aria-label="Sections">
          {GROUPS.map(g => {
            const items = g.items.filter(i => me && canOpen(me.role, i.id))
            if (!items.length) return null
            return (
              <div key={g.label}>
                <div className="mb-2 px-3 text-[10px] font-bold tracking-[0.1em] text-gray-400 uppercase">{g.label}</div>
                <div className="flex flex-col gap-1">
                  {items.map(n => {
                    const Icon = n.icon, on = active(n.href), c = count[n.id]
                    return (
                      <Link
                        key={n.id}
                        href={n.href}
                        aria-current={on ? 'page' : undefined}
                        className={`t-nav flex items-center gap-3 rounded-xl px-3 py-2 transition-all duration-150 ${
                          on
                            ? 'border border-blue-500/25 bg-gradient-to-r from-[#2727e6] to-[#3b5bf5] text-white shadow-[0_2px_14px_rgba(39,39,230,0.25)] font-semibold'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 hover:translate-x-0.5'
                        }`}
                      >
                        <Icon className={`size-4 shrink-0 ${on ? 'text-white' : 'text-gray-400'}`} />
                        <span className="flex-1 text-[14px]">{n.label}</span>
                        {!!c && (
                          <span className={`num rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            on ? 'bg-white text-[#2727e6]' : 'bg-blue-50 border border-blue-200 text-blue-700'
                          }`}>
                            {c}
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-2.5 border-t border-gray-200 pt-5">
          <label className="text-[10px] font-bold tracking-[0.1em] text-gray-400 uppercase" htmlFor="persona">Acting as</label>
          <select
            id="persona"
            value={me?.id ?? ''}
            onChange={e => login(e.target.value).then(() => router.push('/app'))}
            className="rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[13px] font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2727e6]/30 cursor-pointer shadow-sm"
          >
            <option value="" disabled className="bg-white text-gray-900">Choose an identity…</option>
            {users.map(u => (
              <option key={u.id} value={u.id} className="bg-white text-gray-900">
                {u.name}
              </option>
            ))}
          </select>
          {me && (
            <button
              onClick={() => logout().then(() => router.push('/app'))}
              className="t-nav flex items-center gap-2 text-left text-xs text-gray-500 hover:text-gray-900 pt-1"
            >
              <LogOut className="size-3.5" />Sign out
            </button>
          )}
        </div>
      </aside>

      <div className="min-w-0">
        {/* Sticky frosted header */}
        <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 backdrop-blur-xl bg-white/80 border-b border-gray-200 px-6 py-3.5 md:px-10">
          <div className="t-nav flex min-w-0 items-center gap-2.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 backdrop-blur-md shadow-sm">
            <div className="flex size-6 items-center justify-center rounded-full bg-blue-50 text-[#2727e6] border border-blue-200">
              <CircleUserRound className="size-4" />
            </div>
            {me ? (
              <span className="truncate font-semibold text-[13px] text-gray-900">
                {me.name.split(' (')[0]} <span className="font-normal text-gray-500">· {ROLE_LABEL[me.role]}</span>
              </span>
            ) : (
              <span className="text-gray-500 text-[13px]">Not signed in</span>
            )}
          </div>
          <span className="flex-1" />
          {me && (
            <Link
              href="/app/audit"
              onClick={() => setAuditFilter('DENY')}
              title="Open the audit log filtered to denied attempts"
              className="t-nav flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-1.5 text-[13px] text-gray-700 hover:bg-gray-50 hover:border-gray-300 backdrop-blur-md shadow-sm transition-all"
            >
              <ShieldAlert className="size-4 text-rose-500" />
              <span>Violations this session</span>
              <Badge variant={violations ? 'danger' : 'outline'} className="num ml-1">{violations}</Badge>
            </Link>
          )}
        </header>

        <main id="content" className="px-6 pt-6 pb-20 md:px-10">{children}</main>
      </div>

      {/* Floating toasts */}
      <div className="pointer-events-none fixed top-16 right-5 z-50 flex w-[min(420px,calc(100vw-2rem))] flex-col gap-2.5" aria-live="assertive">
        {toasts.map(t => t.kind === 'violation' ? (
          <div key={t.id} role="alert" className="toast-in hatch-danger pointer-events-auto flex gap-3.5 rounded-2xl border border-rose-200 bg-white/95 p-4 text-gray-900 shadow-[0_12px_36px_rgba(244,63,94,0.18)] backdrop-blur-2xl">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600 border border-rose-200">
              <ShieldAlert className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold tracking-[0.1em] text-rose-600 uppercase">Access denied · logged</div>
              <div className="text-[16px] leading-tight font-bold tracking-tight text-gray-900 mt-0.5">{t.code ? (CODE_TITLE[t.code] ?? t.title) : t.title}</div>
              <div className="mt-1 text-[13px] text-gray-600 leading-snug">{t.message}</div>
              {t.tide && <div className="mono mt-2 text-[11px] text-rose-700/80">TideCloak: {t.tide}</div>}
              {t.code && <div className="mono mt-2 inline-block rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[11px] text-rose-700">{t.code}</div>}
            </div>
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="self-start rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors">
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <div key={t.id} role="status" className="toast-in pointer-events-auto flex gap-3.5 rounded-2xl border border-gray-200 bg-white/95 p-4 text-[13px] text-gray-900 shadow-[0_12px_36px_rgba(17,24,39,0.12)] backdrop-blur-2xl">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
              {t.kind === 'success' ? <CheckCheck className="size-5" /> : <Activity className="size-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-[15px] text-gray-900">{t.title}</div>
              <div className="text-gray-600 mt-0.5 leading-snug">{t.message}</div>
            </div>
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="self-start rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors">
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
