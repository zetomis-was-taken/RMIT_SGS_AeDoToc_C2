'use client'
import { Check, ShieldOff, X } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { useApp } from '@/components/app-context'
import { Button } from '@/components/ui/button'
import { Empty, PageTitle, Pager, Panel, Restricted, Status, Vote } from '@/components/bits'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ago } from '@/lib/client'
import { canOpen } from '@/lib/access'

const PER = 6
export default function Requests() {
  const { me, reqs, act, booted } = useApp()
  const [f, setF] = useState('all')
  const [page, setPage] = useState(1)
  if (!me) return null
  if (!canOpen(me.role, 'requests')) return <Restricted page="requests" probe="requests" />
  const approver = (r: any) => r.status === 'pending' && !r.votes.some((v: any) => v.voter === me.id) && (me.role === 'supervisor' || (me.role === 'citizen' && me.citizenId === r.citizen_id))
  const rows = reqs.filter(r => f === 'all' || r.status === f)
  const pages = Math.max(1, Math.ceil(rows.length / PER)), pg = Math.min(page, pages)
  const view = rows.slice((pg - 1) * PER, pg * PER)

  return (
    <>
      <PageTitle title="Consent Quorum Requests">
        A citizen record unlocks only when the supervisor and the citizen who owns it both independently approve. Each grant is time-boxed to 15 minutes and strictly scoped to one verified purpose.
      </PageTitle>
      
      <Panel
        title={`${rows.length} request${rows.length === 1 ? '' : 's'}`}
        action={
          <div className="flex items-center gap-1.5">
            {['all', 'pending', 'granted', 'denied'].map(k => (
              <button
                key={k}
                onClick={() => { setF(k); setPage(1) }}
                aria-pressed={f === k}
                className={`t-nav rounded-full px-3.5 py-1 text-xs font-semibold capitalize transition-all duration-150 ${
                  f === k
                    ? 'bg-gradient-to-r from-[#2727e6] to-[#3b5bf5] text-white shadow-[0_2px_12px_rgba(39,39,230,0.28)]'
                    : 'border border-gray-200 bg-white text-gray-600 shadow-sm hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              {['Request & Target', 'Stated Purpose', 'Quorum Status', 'Decision', ''].map(h => (
                <TableHead key={h}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {!booted && (
              <TableRow>
                <TableCell colSpan={5}><Empty loading>Loading requests…</Empty></TableCell>
              </TableRow>
            )}
            {booted && view.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Empty>{reqs.length === 0 ? 'No requests yet. An assigned case officer opens one from a case.' : 'No requests match this filter.'}</Empty>
                </TableCell>
              </TableRow>
            )}
            {view.map(r => {
              const v = (role: string) => r.votes.find((x: any) => x.voter_role === role)?.decision
              return (
                <TableRow key={r.id} className="align-top">
                  <TableCell>
                    <div className="font-bold text-gray-900 flex items-center gap-2">
                      <span className="mono font-mono text-xs text-[#2727e6]">#{r.id}</span>
                      <Link href={`/app/cases/${r.case_id}`} className="hover:text-[#2727e6] underline underline-offset-4 transition-colors">
                        {r.case_id}
                      </Link>
                    </div>
                    <div className="text-[12px] text-gray-500 mt-1">
                      {r.kind === 'full_view' ? 'Full view' : 'Eligibility check'} · {r.requester} · {ago(r.created_at)}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[240px] whitespace-normal text-gray-600 text-xs leading-relaxed">
                    {r.purpose}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Vote role="Supervisor" v={v('supervisor')} />
                      <Vote role="Citizen" v={v('citizen')} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Status s={r.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-2">
                      {approver(r) && (
                        <>
                          <Button size="sm" onClick={() => act('vote-access', { id: r.id, decision: 'approve' }, { title: 'Vote recorded', message: `You approved request #${r.id}` })}>
                            <Check />Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => act('vote-access', { id: r.id, decision: 'deny' }, { title: 'Request denied', message: `You denied request #${r.id}` })}>
                            <X />Deny
                          </Button>
                        </>
                      )}
                      {r.status === 'pending' && r.requester === me.id && (
                        <Button size="sm" variant="destructive" onClick={() => act('vote-access', { id: r.id, decision: 'approve' })}>
                          <ShieldOff />Approve my own
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        <Pager page={pg} pages={pages} onPage={setPage} total={rows.length} />
      </Panel>
    </>
  )
}
