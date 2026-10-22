'use client'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, type R, type U } from '@/lib/client'

export interface Toast { id: number; kind: 'violation' | 'success' | 'info'; title: string; message: string; code?: string }

interface Ctx {
  users: U[]; me: U | null; cases: R[]; reqs: R[]; changes: R[]; log: R[]
  auditFilter: string; setAuditFilter: (f: string) => void
  selectedCase: string | null; selectCase: (id: string | null) => void
  now: number; violations: number; booted: boolean
  toasts: Toast[]; dismiss: (id: number) => void; notify: (t: Omit<Toast, 'id'>) => void
  refresh: () => Promise<void>
  /** POST an action; 403 becomes a violation toast, other failures an info toast. */
  act: (action: string, body: R, ok?: { title: string; message: string }) => Promise<{ ok: boolean; data: R; status: number }>
  login: (id: string) => Promise<void>
  logout: () => Promise<void>
}

const AppCtx = createContext<Ctx>(null as unknown as Ctx)
export const useApp = () => useContext(AppCtx)

let tid = 0
export function AppProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<U[]>([])
  const [me, setMe] = useState<U | null>(null)
  const [cases, setCases] = useState<R[]>([])
  const [reqs, setReqs] = useState<R[]>([])
  const [changes, setChanges] = useState<R[]>([])
  const [log, setLog] = useState<R[]>([])
  const [auditFilter, setAuditFilter] = useState('all')
  const [selectedCase, selectCase] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [now, setNow] = useState(() => Date.now())
  const [booted, setBooted] = useState(false)
  const [sessionViolations, setSessionViolations] = useState(0)

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])

  const dismiss = useCallback((id: number) => setToasts(t => t.filter(x => x.id !== id)), [])
  const notify = useCallback((t: Omit<Toast, 'id'>) => {
    const id = ++tid
    setToasts(s => [...s.slice(-3), { ...t, id }])
    if (t.kind === 'violation') setSessionViolations(n => n + 1)
    setTimeout(() => setToasts(s => s.filter(x => x.id !== id)), t.kind === 'violation' ? 9000 : 5000)
  }, [])

  const refresh = useCallback(async () => {
    const m = (await api('me')).data
    setMe(m?.id ? m : null)
    if (m?.id) {
      // fetch only what this role may see; the server would refuse the rest anyway
      const role = m.role as string
      const [c, r, ch, a] = await Promise.all([
        api('cases'),
        role === 'admin' ? null : api('requests'),
        role === 'admin' || role === 'supervisor' ? api('changes') : null,
        api('audit'),
      ])
      setCases(c.ok ? c.data : []); setReqs(r?.ok ? r.data : []); setChanges(ch?.ok ? ch.data : []); setLog(a.ok ? a.data : [])
    } else { setCases([]); setReqs([]); setChanges([]); setLog([]) }
    setBooted(true)
  }, [])

  useEffect(() => { api('users').then(r => { if (Array.isArray(r.data)) setUsers(r.data) }); refresh() }, [refresh])
  // light polling so an approver's vote shows up for the requester without a manual reload
  useEffect(() => { const t = setInterval(() => { if (document.visibilityState === 'visible') refresh() }, 6000); return () => clearInterval(t) }, [refresh])

  const act: Ctx['act'] = useCallback(async (action, body, ok) => {
    const r = await api(action, body)
    if (r.ok) { if (ok) notify({ kind: 'success', ...ok }) }
    else if (r.status === 403) notify({ kind: 'violation', title: 'Access denied', message: r.data.error ?? 'Not permitted', code: r.data.code })
    else notify({ kind: 'info', title: `Request failed (${r.status})`, message: r.data.error ?? 'Unexpected error', code: r.data.code })
    await refresh()
    return r
  }, [notify, refresh])

  const login = useCallback(async (id: string) => {
    await api('login', { userId: id })
    selectCase(null)
    await refresh()
  }, [refresh])
  const logout = useCallback(async () => { await api('logout', {}); setMe(null); setLog([]); selectCase(null) }, [])

  const violations = useMemo(() => Math.max(sessionViolations, 0), [sessionViolations])
  const value: Ctx = { users, me, cases, reqs, changes, log, auditFilter, setAuditFilter, selectedCase, selectCase, now, violations, booted, toasts, dismiss, notify, refresh, act, login, logout }
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}
