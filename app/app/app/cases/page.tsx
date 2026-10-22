'use client'
import { ArrowRight, Lock, LockOpen, Search, ShieldOff } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useApp } from '@/components/app-context'
import { Badge } from '@/components/ui/badge'
import { Empty, PageTitle, Pager, Panel } from '@/components/bits'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { accessOf } from '@/lib/case-access'

const PER = 6
export default function CasesPage() {
  const { me, cases, reqs, now, booted } = useApp()
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const rows = useMemo(() => !me ? [] : cases.filter(c => {
    const a = accessOf(me, c, reqs, now).key
    if (filter === 'mine' && !c.assignedTo.includes(me.id)) return false
    if (filter === 'wait' && a !== 'wait') return false
    if (filter === 'open' && a !== 'open') return false
    return !q || `${c.id} ${c.title} ${c.assignedTo.join(' ')} ${c.citizen_id}`.toLowerCase().includes(q.toLowerCase())
  }), [cases, filter, q, reqs, now, me])
  if (!me) return null
  const pages = Math.max(1, Math.ceil(rows.length / PER))
  const view = rows.slice((Math.min(page, pages) - 1) * PER, Math.min(page, pages) * PER)
  const FILTERS: [string, string][] = me.role === 'officer' || me.role === 'agency_b'
    ? [['all', 'All'], ['mine', 'Assigned to me'], ['wait', 'Awaiting consent'], ['open', 'Unlocked']] : [['all', 'All']]

  return (
    <>
      <PageTitle title="Citizen Cases">
        The public index is visible across participating agencies. The sensitive citizen fields behind each case remain cryptographically sealed until a multi-party consent quorum is verified.
      </PageTitle>
      <Panel
        title={`${rows.length} case${rows.length === 1 ? '' : 's'}`}
        action={
          <div className="flex flex-wrap items-center gap-3">
            {FILTERS.length > 1 && (
              <div className="flex items-center gap-1.5">
                {FILTERS.map(([k, l]) => (
                  <button
                    key={k}
                    onClick={() => { setFilter(k); setPage(1) }}
                    aria-pressed={filter === k}
                    className={`t-nav rounded-full px-3.5 py-1 text-xs font-semibold transition-all duration-150 ${
                      filter === k
                        ? 'bg-gradient-to-r from-[#2727e6] to-[#3b5bf5] text-white shadow-[0_2px_12px_rgba(39,39,230,0.28)]'
                        : 'border border-gray-200 bg-white text-gray-600 shadow-sm hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            )}
            <label className="relative">
              <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                name="q"
                autoComplete="off"
                value={q}
                onChange={e => { setQ(e.target.value); setPage(1) }}
                placeholder="Search case, citizen, officer…"
                aria-label="Search cases"
                className="w-64 rounded-full border border-gray-200 bg-white py-1.5 pr-4 pl-9 text-[13px] text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2727e6]/30"
              />
            </label>
          </div>
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              {['Case ID', 'Citizen Ref', 'Assigned To', 'Your Access State', ''].map(h => (
                <TableHead key={h}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {!booted && (
              <TableRow>
                <TableCell colSpan={5}><Empty loading>Loading cases…</Empty></TableCell>
              </TableRow>
            )}
            {booted && view.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}><Empty>No cases match this filter.</Empty></TableCell>
              </TableRow>
            )}
            {view.map(c => {
              const a = accessOf(me, c, reqs, now)
              return (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link href={`/app/cases/${c.id}`} className="group block">
                      <div className="font-bold tracking-tight text-gray-900 group-hover:text-[#2727e6] transition-colors flex items-center gap-2">
                        {c.id}
                      </div>
                      <div className="text-[12px] text-gray-500">{c.title.replace(' application', '')}</div>
                    </Link>
                  </TableCell>
                  <TableCell className="mono font-mono text-xs text-[#2727e6]">{c.citizen_id}</TableCell>
                  <TableCell className="text-gray-600">{c.assignedTo.join(', ') || <span className="text-gray-400">Unassigned</span>}</TableCell>
                  <TableCell>
                    <Badge variant={a.variant}>
                      {a.key === 'open' ? <LockOpen className="size-3.5" /> : a.key === 'out' ? <ShieldOff className="size-3.5" /> : <Lock className="size-3.5" />}
                      {a.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/app/cases/${c.id}`}
                      className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-[#2727e6] hover:text-white transition-all shadow-sm"
                    >
                      Inspect <ArrowRight className="size-3" />
                    </Link>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        <Pager page={Math.min(page, pages)} pages={pages} onPage={setPage} total={rows.length} />
      </Panel>
    </>
  )
}
