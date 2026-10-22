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
      <div className="max-w-[68ch]">
        <h1 className="t-title text-gray-900">{title}</h1>
        {children && <p className="mt-3 text-[16px] leading-[1.55] text-gray-500">{children}</p>}
      </div>
      {action}
    </div>
  )
}

export function Panel({ title, action, children, className = '', dark = false }: { title?: string; action?: ReactNode; children: ReactNode; className?: string; dark?: boolean }) {
  return (
    <section className={`min-w-0 overflow-hidden rounded-2xl border transition-all duration-200 ${
      dark 
        ? 'border-[#2727e6]/20 bg-[#2727e6] shadow-[0_4px_24px_rgba(39,39,230,0.25)] text-white' 
        : 'border-gray-200 bg-white shadow-sm hover:shadow-md text-gray-900'
    } ${className}`}>
      {(title || action) && (
        <div className={`flex items-center justify-between gap-3 border-b px-6 py-4 ${dark ? 'border-white/20 bg-white/[0.08]' : 'border-gray-100 bg-gray-50/60'}`}>
          <h2 className={`text-[15px] font-bold tracking-[-0.02em] whitespace-nowrap ${dark ? 'text-white' : 'text-gray-900'}`}>{title}</h2>
          {action}
        </div>
      )}
      <div>{children}</div>
    </section>
  )
}

export function Empty({ children, loading }: { children: ReactNode; loading?: boolean }) {
  return (
    <div className="px-6 py-14 text-center text-[13px] text-gray-400">
      {loading ? (
        <span className="inline-flex items-center gap-2 text-[#2727e6]">
          <CircleDashed className="size-4 motion-safe:animate-spin" />
          {children}
        </span>
      ) : children}
    </div>
  )
}

export function Status({ s }: { s: string }) {
  const k = s.toLowerCase()
  if (['allow', 'granted', 'applied'].includes(k)) return <Badge variant="ok"><Check className="size-3.5" />{s === 'ALLOW' ? 'Allowed' : s}</Badge>
  if (['deny', 'denied', 'rejected'].includes(k)) return <Badge variant="danger"><X className="size-3.5" />{s === 'DENY' ? 'Denied' : s}</Badge>
  if (k === 'pending') return <Badge variant="warn"><Clock className="size-3.5" />{s === 'PENDING' ? 'Pending' : s}</Badge>
  if (k === 'expired') return <Badge variant="outline"><CircleDashed className="size-3.5" />expired</Badge>
  return <Badge variant="info"><Info className="size-3.5" />{s === 'INFO' ? 'Info' : s}</Badge>
}

/** Inline violation notice — light mode red alert */
export function Violation({ code, title, tide, children }: { code?: string; title: string; tide?: string; children: ReactNode }) {
  return (
    <div role="alert" className="slam flex gap-3.5 rounded-2xl border border-red-200 bg-red-50 p-5 text-[13px] text-gray-900 shadow-sm">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-red-100 border border-red-200 text-red-600">
        <ShieldAlert className="size-5" />
      </div>
      <div>
        <div className="text-[11px] font-bold tracking-[0.1em] text-red-600 uppercase">Access denied · logged</div>
        <div className="text-[16px] font-bold tracking-[-0.02em] text-gray-900 mt-0.5">{title}</div>
        <div className="text-gray-600 mt-1 leading-relaxed">{children}</div>
        {tide && <div className="mono mt-2 text-red-700/80">TideCloak: {tide}</div>}
        {code && <div className="mono mt-2 inline-block rounded-full bg-red-100 border border-red-200 px-2.5 py-0.5 text-red-700">{code}</div>}
      </div>
    </div>
  )
}

export function Vote({ role, v }: { role: string; v?: string }) {
  const done = v === 'approve', no = v === 'deny'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] border ${
      done 
        ? 'border-emerald-200 bg-emerald-50 font-semibold text-emerald-700' 
        : no 
        ? 'border-red-200 bg-red-50 font-semibold text-red-600 line-through' 
        : 'border-gray-200 bg-gray-50 text-gray-500'
    }`}>
      {done ? <Check className="size-3.5 text-emerald-600" /> : no ? <X className="size-3.5 text-red-500" /> : <CircleDashed className="size-3.5 text-gray-400" />}
      {role}
    </span>
  )
}

/** A page this role may not open. */
export function Restricted({ page, probe }: { page: PageId; probe: string }) {
  const { me, notify, refresh } = useApp()
  const [tried, setTried] = useState<string | null>(null)
  if (!me) return null
  const why = PAGE_WHY[page]?.[me.role] ?? 'This area is outside your role.'
  return (
    <div className="mt-10 grid gap-6 md:grid-cols-[1.3fr_1fr]">
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-gray-900 shadow-sm">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-red-50 border border-red-100 text-red-500">
          <ShieldOff className="size-7" />
        </div>
        <h1 className="t-title mt-6 text-[28px] text-gray-900">Not available to {ROLE_LABEL[me.role].toLowerCase()}s.</h1>
        <p className="mt-3 max-w-[48ch] text-[15px] leading-relaxed text-gray-500">{why}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/app" className="inline-flex items-center rounded-full bg-[#2727e6] px-5 py-2.5 text-[14px] font-bold text-white hover:bg-[#1e1eb8] shadow-[0_0_16px_rgba(39,39,230,0.3)] hover:shadow-[0_0_24px_rgba(39,39,230,0.5)] transition-all">Back to overview</Link>
          <Button variant="outline" onClick={async () => {
            const r = await api(probe)
            setTried(r.ok ? 'The server answered (unexpected).' : `${r.status} · ${r.data.error}`)
            if (!r.ok) notify({ kind: 'violation', title: 'Access denied', message: r.data.error, code: r.data.code, tide: r.data.tide })
            await refresh()
          }}>Ask the server anyway</Button>
        </div>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-[14px] flex flex-col justify-between shadow-sm">
        <div>
          <div className="text-[11px] font-bold tracking-[0.1em] text-gray-400 uppercase">What the server says</div>
          {tried ? (
            <div className="mono mt-3 rounded-xl border border-red-100 bg-red-50 p-4 text-[13px] text-red-700 break-words">{tried}</div>
          ) : (
            <p className="mt-3 text-gray-500 leading-relaxed">Hiding the menu is not the protection. The API refuses the call too. Press the button to see it, and find the attempt in the audit log.</p>
          )}
        </div>
        <div className="mt-6 pt-4 border-t border-gray-100 text-[12px] text-gray-400 flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
          Zero-trust verified server boundary
        </div>
      </div>
    </div>
  )
}

export function Pager({ page, pages, onPage, total }: { page: number; pages: number; onPage: (n: number) => void; total: number }) {
  if (pages <= 1) return null
  return (
    <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-6 py-4 text-[13px]">
      <span className="num text-gray-400">{total} entries · page {page} of {pages}</span>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button>
        <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</Button>
      </div>
    </div>
  )
}
