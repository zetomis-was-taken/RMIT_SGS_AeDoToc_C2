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
      <PageTitle title="Cryptographic Audit Trail">
        {oversight ? 'Every attempt, permitted or denied, across all participants.' : 'Your own operations only. Supervisors and system admins oversee the complete ledger.'}{' '}
        Every row is cryptographically chained using SHA-256 hashes: tamper with a single record, and mathematical verification fails instantly.
      </PageTitle>

      <Panel
        title={`${rows.length} of ${log.length} ledger entries`}
        action={
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              {FILTERS.map(([k, l]) => (
                <button
                  key={k}
                  onClick={() => { setAuditFilter(k); setPage(1) }}
                  aria-pressed={auditFilter === k}
                  className={`t-nav flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-semibold transition-all duration-150 ${
                    auditFilter === k
                      ? 'bg-gradient-to-r from-[#2727e6] to-[#3b5bf5] text-white shadow-[0_2px_12px_rgba(39,39,230,0.28)]'
                      : 'border border-gray-200 bg-white text-gray-600 shadow-sm hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  {l}
                  <span className={`num text-[10px] px-1.5 py-0.2 rounded-full ${auditFilter === k ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>{count(k)}</span>
                </button>
              ))}
            </div>
            <label className="relative">
              <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                name="q"
                autoComplete="off"
                value={q}
                onChange={e => { setQ(e.target.value); setPage(1) }}
                placeholder="Search audit log…"
                aria-label="Search audit log"
                className="w-48 rounded-full border border-gray-200 bg-white py-1.5 pr-4 pl-9 text-[13px] text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2727e6]/30"
              />
            </label>
            <Button size="sm" variant="default" onClick={async () => setChain((await api('verify')).data)}>
              <BadgeCheck className="size-4" />Verify Hash Chain
            </Button>
          </div>
        }
      >
        {chain && (
          <div className={`m-4 flex items-center gap-3 rounded-xl border p-4 text-[13px] font-semibold ${
            chain.ok 
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800' 
              : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}>
            <div className={`flex size-8 shrink-0 items-center justify-center rounded-full ${chain.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
              {chain.ok ? <BadgeCheck className="size-5" /> : <ShieldX className="size-5" />}
            </div>
            <div>
              <div className="font-bold text-[14px] text-gray-900">
                {chain.ok ? 'Cryptographic Chain Integrity Confirmed' : 'Integrity Check Failed'}
              </div>
              <div className="text-xs font-normal text-gray-600 mt-0.5">
                {chain.ok ? `All ${chain.entries} entries verified. Every cryptographic parent-hash matches the consensus block.` : `Chain broken at entry #${chain.brokenAt}: unauthorized mutation detected.`}
              </div>
            </div>
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              {['Index', 'Timestamp', 'Actor', 'Action & Target', 'Outcome', 'Security Detail', 'Parent Hash'].map(h => (
                <TableHead key={h}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {!booted && (
              <TableRow>
                <TableCell colSpan={7}><Empty loading>Loading ledger entries…</Empty></TableCell>
              </TableRow>
            )}
            {booted && view.length === 0 && (
              <TableRow>
                <TableCell colSpan={7}><Empty>No log entries match your filter.</Empty></TableCell>
              </TableRow>
            )}
            {view.map(l => (
              <TableRow
                key={l.id}
                className={`align-top text-[13px] ${l.decision === 'DENY' ? 'bg-rose-50/70 border-rose-200' : ''}`}
              >
                <TableCell className="mono font-mono text-xs text-gray-400">{l.id}</TableCell>
                <TableCell className="num text-gray-500 whitespace-nowrap text-xs">{new Date(l.at).toLocaleTimeString()}</TableCell>
                <TableCell className="font-semibold text-gray-900">{l.actor}</TableCell>
                <TableCell>
                  <span className="text-gray-700">{l.action.replaceAll('_', ' ')}</span>{' '}
                  <span className="mono font-mono text-xs text-[#2727e6]">{l.target !== '-' ? l.target : ''}</span>
                </TableCell>
                <TableCell><Status s={l.decision} /></TableCell>
                <TableCell className="max-w-[340px] whitespace-normal text-gray-500 text-xs leading-relaxed">{l.detail}</TableCell>
                <TableCell>
                  <span className="mono font-mono text-[11px] text-[#2727e6] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full inline-block" title={l.hash}>
                    {String(l.hash).slice(0, 8)}…
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Pager page={pg} pages={pages} onPage={setPage} total={rows.length} />
      </Panel>
    </>
  )
}
