'use client'
import { BadgeCheck, ShieldX } from 'lucide-react'
import { useState } from 'react'
import { useApp } from '../app-context'
import { Button } from '../ui/button'
import { Empty, PageTitle, Panel, Status } from '../bits'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { api, CODE_TITLE } from '@/lib/client'

const FILTERS: [string, string][] = [['all', 'All'], ['DENY', 'Denied'], ['ALLOW', 'Allowed'], ['PENDING', 'Pending'], ['INFO', 'Info']]

export function Audit() {
  const { me, log, auditFilter, setAuditFilter } = useApp()
  const [q, setQ] = useState('')
  const [chain, setChain] = useState<{ ok: boolean; entries: number; brokenAt: number | null } | null>(null)
  if (!me) return null
  const rows = log.filter(l => (auditFilter === 'all' || l.decision === auditFilter) && (!q || `${l.actor} ${l.action} ${l.target} ${l.detail}`.toLowerCase().includes(q.toLowerCase())))
  const count = (k: string) => k === 'all' ? log.length : log.filter(l => l.decision === k).length

  return (
    <>
      <PageTitle title="Audit log">Every attempt, allowed or not, is chained to the one before it. Edit a row and the chain breaks.</PageTitle>
      <Panel
        title={`${rows.length} of ${log.length} entries`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {FILTERS.map(([k, l]) => (
              <button key={k} onClick={() => setAuditFilter(k)} aria-pressed={auditFilter === k}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-[12px] font-medium ${auditFilter === k ? 'border-iris bg-iris text-white' : 'border-line text-soft hover:bg-iris-50'}`}>
                {l}<span className="num opacity-80">{count(k)}</span></button>
            ))}
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search" aria-label="Search audit log" className="w-36 rounded-[12px] border border-line px-3 py-1 text-[12px]" />
            <Button size="sm" variant="outline" onClick={async () => setChain((await api('verify')).data)}><BadgeCheck />Verify chain</Button>
          </div>
        }>
        {chain && (
          <div className={`flex items-center gap-2 border-b px-4 py-2 text-[13px] ${chain.ok ? 'border-ok/30 bg-ok-bg text-ok' : 'border-danger/30 bg-danger-bg text-danger'}`}>
            {chain.ok ? <BadgeCheck className="size-4" /> : <ShieldX className="size-4" />}
            {chain.ok ? `Chain intact: ${chain.entries} entries, every hash matches.` : `Chain broken at entry #${chain.brokenAt}: the log was altered.`}
          </div>
        )}
        <Table>
          <TableHeader><TableRow>{['#', 'Time', 'Actor', 'Action', 'Result', 'Detail', 'Hash'].map(h => <TableHead key={h} className="text-soft">{h}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 && <TableRow><TableCell colSpan={7}><Empty>No entries match.</Empty></TableCell></TableRow>}
            {rows.map(l => (
              <TableRow key={l.id} className={`align-top text-[13px] ${l.decision === 'DENY' ? 'bg-danger-bg/60' : ''}`}>
                <TableCell className="mono text-soft">{l.id}</TableCell>
                <TableCell className="num whitespace-nowrap">{new Date(l.at).toLocaleTimeString()}</TableCell>
                <TableCell className="font-medium">{l.actor}</TableCell>
                <TableCell>{l.action.replaceAll('_', ' ')} <span className="mono">{l.target !== '-' ? l.target : ''}</span></TableCell>
                <TableCell><Status s={l.decision} /></TableCell>
                <TableCell className="max-w-[320px] whitespace-normal text-soft">{l.detail}</TableCell>
                <TableCell className="mono text-soft" title={l.hash}>{String(l.hash).slice(0, 8)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>
    </>
  )
}
