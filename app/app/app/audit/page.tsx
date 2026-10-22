'use client'
import { BadgeCheck, Search, ShieldX } from 'lucide-react'
import { useState } from 'react'
import { useApp } from '@/components/app-context'
import { Button } from '@/components/ui/button'
import { Empty, PageTitle, Pager, Panel, Status } from '@/components/bits'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api } from '@/lib/client'

const FILTERS: [string, string][] = [['all', 'All'], ['DENY', 'Denied'], ['ALLOW', 'Allowed'], ['PENDING', 'Pending'], ['INFO', 'Info']]
const PER = 12

export default function Audit() {
  const { me, log, auditFilter, setAuditFilter, booted } = useApp()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [chain, setChain] = useState<{ ok: boolean; entries: number; brokenAt: number | null } | null>(null)
  if (!me) return null
  const oversight = me.role === 'supervisor' || me.role === 'admin'
  const rows = log.filter(l => (auditFilter === 'all' || l.decision === auditFilter) && (!q || `${l.actor} ${l.action} ${l.target} ${l.detail}`.toLowerCase().includes(q.toLowerCase())))
  const count = (k: string) => k === 'all' ? log.length : log.filter(l => l.decision === k).length
  const pages = Math.max(1, Math.ceil(rows.length / PER)), pg = Math.min(page, pages)
  const view = rows.slice((pg - 1) * PER, pg * PER)

  return (
    <>
      <PageTitle title="Audit log">{oversight ? 'Every attempt, allowed or not, from everyone.' : 'Your own actions only. Supervisors and admins see the whole log.'} Each entry is chained to the one before it: edit a row and the chain breaks.</PageTitle>
      <Panel title={`${rows.length} of ${log.length} entries`} action={
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map(([k, l]) => (
            <button key={k} onClick={() => { setAuditFilter(k); setPage(1) }} aria-pressed={auditFilter === k}
              className={`t-nav flex items-center gap-1.5 rounded-[4px] px-2.5 py-1 ${auditFilter === k ? 'bg-ink text-white' : 'bg-canvas hover:bg-rule'}`}>{l}<span className="num opacity-70">{count(k)}</span></button>
          ))}
          <label className="relative"><Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ash" /><input type="search" name="q" autoComplete="off" value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder="Search" aria-label="Search audit log" className="w-40 rounded-[4px] border border-rule bg-white py-1.5 pr-3 pl-8 text-[13px]" /></label>
          <Button size="sm" variant="outline" onClick={async () => setChain((await api('verify')).data)}><BadgeCheck />Verify chain</Button>
        </div>}>
        {chain && (
          <div className={`flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold ${chain.ok ? 'bg-canvas' : 'hatch-dark bg-black text-white'}`}>
            {chain.ok ? <BadgeCheck className="size-4" /> : <ShieldX className="size-4" />}
            {chain.ok ? `Chain intact: ${chain.entries} entries, every hash matches.` : `Chain broken at entry #${chain.brokenAt}: the log was altered.`}
          </div>
        )}
        <Table>
          <TableHeader><TableRow>{['#', 'Time', 'Actor', 'Action', 'Result', 'Detail', 'Hash'].map(h => <TableHead key={h} className="text-ash">{h}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {!booted && <TableRow><TableCell colSpan={7}><Empty loading>Loading log…</Empty></TableCell></TableRow>}
            {booted && view.length === 0 && <TableRow><TableCell colSpan={7}><Empty>No entries match.</Empty></TableCell></TableRow>}
            {view.map(l => (
              <TableRow key={l.id} className={`align-top text-[13px] ${l.decision === 'DENY' ? 'hatch bg-canvas' : ''}`}>
                <TableCell className="mono text-ash">{l.id}</TableCell>
                <TableCell className="num whitespace-nowrap">{new Date(l.at).toLocaleTimeString()}</TableCell>
                <TableCell className="font-semibold">{l.actor}</TableCell>
                <TableCell>{l.action.replaceAll('_', ' ')} <span className="mono">{l.target !== '-' ? l.target : ''}</span></TableCell>
                <TableCell><Status s={l.decision} /></TableCell>
                <TableCell className="max-w-[320px] whitespace-normal text-ash">{l.detail}</TableCell>
                <TableCell className="mono text-ash" title={l.hash}>{String(l.hash).slice(0, 8)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Pager page={pg} pages={pages} onPage={setPage} total={rows.length} />
      </Panel>
    </>
  )
}
