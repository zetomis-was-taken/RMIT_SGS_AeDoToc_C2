'use client'
import { Lock, LockOpen, Search, ShieldOff } from 'lucide-react'
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
      <PageTitle title="Cases">The index is visible to everyone. The sensitive fields behind each case are not. Open a case to see its fields, its consent trail and what you may do.</PageTitle>
      <Panel
        title={`${rows.length} case${rows.length === 1 ? '' : 's'}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {FILTERS.length > 1 && FILTERS.map(([k, l]) => (
              <button key={k} onClick={() => { setFilter(k); setPage(1) }} aria-pressed={filter === k}
                className={`t-nav rounded-[4px] px-2.5 py-1 ${filter === k ? 'bg-ink text-white' : 'bg-canvas hover:bg-rule'}`}>{l}</button>
            ))}
            <label className="relative">
              <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ash" />
              <input type="search" name="q" autoComplete="off" value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder="Search case, citizen, officer" aria-label="Search cases"
                className="w-56 rounded-[4px] border border-rule bg-white py-1.5 pr-3 pl-8 text-[13px]" />
            </label>
          </div>
        }>
        <Table>
          <TableHeader><TableRow>{['Case', 'Citizen ref', 'Assigned to', 'Your access', ''].map(h => <TableHead key={h} className="text-ash">{h}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {!booted && <TableRow><TableCell colSpan={5}><Empty loading>Loading cases…</Empty></TableCell></TableRow>}
            {booted && view.length === 0 && <TableRow><TableCell colSpan={5}><Empty>No cases match this filter.</Empty></TableCell></TableRow>}
            {view.map(c => {
              const a = accessOf(me, c, reqs, now)
              return (
                <TableRow key={c.id} className="hover:bg-canvas">
                  <TableCell><Link href={`/app/cases/${c.id}`} className="block"><div className="font-bold tracking-[-0.01em]">{c.id}</div><div className="text-[12px] text-ash">{c.title.replace(' application', '')}</div></Link></TableCell>
                  <TableCell className="mono">{c.citizen_id}</TableCell>
                  <TableCell>{c.assignedTo.join(', ') || <span className="text-ash">unassigned</span>}</TableCell>
                  <TableCell><Badge variant={a.variant}>{a.key === 'open' ? <LockOpen /> : a.key === 'out' ? <ShieldOff /> : <Lock />}{a.label}</Badge></TableCell>
                  <TableCell className="text-right"><Link href={`/app/cases/${c.id}`} className="t-nav underline underline-offset-4">Open</Link></TableCell>
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
