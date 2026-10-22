import { AlertOctagon, Check, CircleDashed, Clock, Info, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge } from './ui/badge'

export function PageTitle({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-6 max-w-[72ch]">
      <h1 className="ddc text-[40px] text-iris">{title}</h1>
      {children && <p className="mt-2 text-[15px] text-soft">{children}</p>}
    </div>
  )
}

export function Panel({ title, action, children, className = '' }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 border border-line bg-white ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="text-[14px] font-medium whitespace-nowrap">{title}</h2>
          {action}
        </div>
      )}
      <div>{children}</div>
    </section>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="px-4 py-10 text-center text-[13px] text-soft">{children}</div>
}

export function Status({ s }: { s: string }) {
  const k = s.toLowerCase()
  if (['allow', 'granted', 'applied'].includes(k)) return <Badge variant="ok"><Check />{s === 'ALLOW' ? 'Allowed' : s}</Badge>
  if (['deny', 'denied', 'rejected'].includes(k)) return <Badge variant="danger"><X />{s === 'DENY' ? 'Denied' : s}</Badge>
  if (k === 'pending') return <Badge variant="warn"><Clock />{s === 'PENDING' ? 'Pending' : s}</Badge>
  if (k === 'expired') return <Badge variant="outline"><CircleDashed />expired</Badge>
  return <Badge variant="info"><Info />{s === 'INFO' ? 'Info' : s}</Badge>
}

/** Inline violation notice shown where the user tried to act. */
export function Violation({ code, title, children }: { code?: string; title: string; children: ReactNode }) {
  return (
    <div role="alert" className="flash-danger flex gap-3 border border-danger/40 bg-danger-bg p-3 text-[13px]">
      <AlertOctagon className="mt-0.5 size-5 shrink-0 text-danger" />
      <div>
        <div className="font-medium text-danger">{title}</div>
        <div>{children}</div>
        {code && <div className="mono mt-1 text-danger/80">{code} · logged</div>}
      </div>
    </div>
  )
}

export function Vote({ role, v }: { role: string; v?: string }) {
  const done = v === 'approve'
  const no = v === 'deny'
  return (
    <span className={`inline-flex items-center gap-1 text-[12px] ${done ? 'text-ok' : no ? 'text-danger' : 'text-soft'}`}>
      {done ? <Check className="size-3.5" /> : no ? <X className="size-3.5" /> : <CircleDashed className="size-3.5" />}
      {role}
    </span>
  )
}

export const caseTitle = (c: { id: string }) => `Housing subsidy · ${c.id}`
