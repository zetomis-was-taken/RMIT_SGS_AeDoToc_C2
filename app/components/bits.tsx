'use client'
import { Check, CircleDashed, Clock, Info, ShieldAlert, ShieldOff, X } from 'lucide-react'
import Link from 'next/link'
import { useState, type ReactNode } from 'react'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { api, ROLE_LABEL } from '@/lib/client'
import { PAGE_WHY, type PageId } from '@/lib/access'
import { useApp } from './app-context'

export function PageTitle({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 pt-6">
      <div className="max-w-[64ch]">
        <h1 className="t-title">{title}</h1>
        {children && <p className="mt-3 text-[16px] leading-[1.5] text-ash">{children}</p>}
      </div>
      {action}
    </div>
  )
}

export function Panel({ title, action, children, className = '', dark = false }: { title?: string; action?: ReactNode; children: ReactNode; className?: string; dark?: boolean }) {
  return (
    <section className={`min-w-0 overflow-hidden rounded-[8px] ${dark ? 'bg-ink text-white' : 'bg-white'} ${className}`}>
      {(title || action) && (
        <div className={`flex items-center justify-between gap-3 border-b px-5 py-3.5 ${dark ? 'border-white/15' : 'border-rule'}`}>
          <h2 className="text-[15px] font-bold tracking-[-0.02em] whitespace-nowrap">{title}</h2>
          {action}
        </div>
      )}
      <div>{children}</div>
    </section>
  )
}

export function Empty({ children, loading }: { children: ReactNode; loading?: boolean }) {
  return <div className="px-5 py-12 text-center text-[13px] text-ash">{loading ? <span className="inline-flex items-center gap-2"><CircleDashed className="size-4 motion-safe:animate-spin" />{children}</span> : children}</div>
}

export function Status({ s }: { s: string }) {
  const k = s.toLowerCase()
  if (['allow', 'granted', 'applied'].includes(k)) return <Badge variant="ok"><Check />{s === 'ALLOW' ? 'Allowed' : s}</Badge>
  if (['deny', 'denied', 'rejected'].includes(k)) return <Badge variant="danger"><X />{s === 'DENY' ? 'Denied' : s}</Badge>
  if (k === 'pending') return <Badge variant="warn"><Clock />{s === 'PENDING' ? 'Pending' : s}</Badge>
  if (k === 'expired') return <Badge variant="outline"><CircleDashed />expired</Badge>
  return <Badge variant="info"><Info />{s === 'INFO' ? 'Info' : s}</Badge>
}

/** Inline violation notice: the Black Showcase Card, used wherever someone tried something they may not do. */
export function Violation({ code, title, children }: { code?: string; title: string; children: ReactNode }) {
  return (
    <div role="alert" className="slam hatch-dark flex gap-3 rounded-[8px] bg-black p-4 text-[13px] text-white">
      <ShieldAlert className="mt-0.5 size-5 shrink-0" />
      <div>
        <div className="text-[11px] font-bold tracking-[0.1em] text-white/60 uppercase">Access denied · logged</div>
        <div className="text-[15px] font-bold tracking-[-0.02em]">{title}</div>
        <div className="text-white/80">{children}</div>
        {code && <div className="mono mt-1.5 text-white/50">{code}</div>}
      </div>
    </div>
  )
}

export function Vote({ role, v }: { role: string; v?: string }) {
  const done = v === 'approve', no = v === 'deny'
  return (
    <span className={`inline-flex items-center gap-1 text-[12px] ${done ? 'font-semibold text-ink' : no ? 'font-semibold text-ink line-through' : 'text-ash'}`}>
      {done ? <Check className="size-3.5" /> : no ? <X className="size-3.5" /> : <CircleDashed className="size-3.5" />}
      {role}
    </span>
  )
}

/** A page this role may not open. "Try anyway" really calls the API so the refusal (and its log line) are real. */
export function Restricted({ page, probe }: { page: PageId; probe: string }) {
  const { me, notify, refresh } = useApp()
  const [tried, setTried] = useState<string | null>(null)
  if (!me) return null
  const why = PAGE_WHY[page]?.[me.role] ?? 'This area is outside your role.'
  return (
    <div className="mt-10 grid gap-6 md:grid-cols-[1.2fr_1fr]">
      <div className="hatch-dark rounded-[8px] bg-black p-8 text-white">
        <ShieldOff className="size-8" />
        <h1 className="t-title mt-6">Not available to {ROLE_LABEL[me.role].toLowerCase()}s.</h1>
        <p className="mt-4 max-w-[48ch] text-[16px] text-white/75">{why}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/app" className="inline-flex items-center rounded-[8px] bg-white px-4 py-2 text-[14px] font-semibold text-graphite hover:shadow-lift">Back to overview</Link>
          <Button variant="inverse" onClick={async () => {
            const r = await api(probe)
            setTried(r.ok ? 'The server answered (unexpected).' : `${r.status} · ${r.data.error}`)
            if (!r.ok) notify({ kind: 'violation', title: 'Access denied', message: r.data.error, code: r.data.code })
            await refresh()
          }}>Ask the server anyway</Button>
        </div>
      </div>
      <div className="rounded-[8px] bg-white p-6 text-[14px]">
        <div className="text-[11px] font-bold tracking-[0.1em] text-ash uppercase">What the server says</div>
        {tried ? <p className="mono mt-3 text-[13px]">{tried}</p> : <p className="mt-3 text-ash">Hiding the menu is not the protection. The API refuses the call too. Press the button to see it, and find the attempt in the audit log.</p>}
      </div>
    </div>
  )
}

export function Pager({ page, pages, onPage, total }: { page: number; pages: number; onPage: (n: number) => void; total: number }) {
  if (pages <= 1) return null
  return (
    <div className="flex items-center justify-between gap-3 border-t border-rule px-5 py-3 text-[13px]">
      <span className="num text-ash">{total} entries · page {page} of {pages}</span>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button>
        <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</Button>
      </div>
    </div>
  )
}
