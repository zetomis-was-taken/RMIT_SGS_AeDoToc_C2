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
      <PageTitle title="Consent requests">A record opens only when the supervisor and the citizen who owns it both approve. Each grant lasts 15 minutes and covers one purpose.</PageTitle>
      <Panel title={`${rows.length} request${rows.length === 1 ? '' : 's'}`} action={
        <div className="flex gap-2">{['all', 'pending', 'granted', 'denied'].map(k => (
          <button key={k} onClick={() => { setF(k); setPage(1) }} aria-pressed={f === k} className={`t-nav rounded-[4px] px-2.5 py-1 capitalize ${f === k ? 'bg-ink text-white' : 'bg-canvas hover:bg-rule'}`}>{k}</button>
        ))}</div>}>
        <Table>
          <TableHeader><TableRow>{['Request', 'Purpose', 'Approvals', 'Status', ''].map(h => <TableHead key={h} className="text-ash">{h}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {!booted && <TableRow><TableCell colSpan={5}><Empty loading>Loading requests…</Empty></TableCell></TableRow>}
            {booted && view.length === 0 && <TableRow><TableCell colSpan={5}><Empty>{reqs.length === 0 ? 'No requests yet. An officer opens one from a case.' : 'No requests with this status.'}</Empty></TableCell></TableRow>}
            {view.map(r => {
              const v = (role: string) => r.votes.find((x: any) => x.voter_role === role)?.decision
              return (
                <TableRow key={r.id} className="align-top">
                  <TableCell><div className="font-bold"><span className="mono">#{r.id}</span> <Link href={`/app/cases/${r.case_id}`} className="underline underline-offset-4">{r.case_id}</Link></div><div className="text-[12px] text-ash">{r.kind === 'full_view' ? 'Full view' : 'Eligibility check'} · {r.requester} · {ago(r.created_at)}</div></TableCell>
                  <TableCell className="max-w-[220px] whitespace-normal text-ash">{r.purpose}</TableCell>
                  <TableCell><div className="flex flex-col gap-0.5"><Vote role="Supervisor" v={v('supervisor')} /><Vote role="Citizen" v={v('citizen')} /></div></TableCell>
                  <TableCell><Status s={r.status} /></TableCell>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-2">
                      {approver(r) && <>
                        <Button size="sm" onClick={() => act('vote-access', { id: r.id, decision: 'approve' }, { title: 'Vote recorded', message: `You approved request #${r.id}` })}><Check />Approve</Button>
                        <Button size="sm" variant="outline" onClick={() => act('vote-access', { id: r.id, decision: 'deny' }, { title: 'Request denied', message: `You denied request #${r.id}` })}><X />Deny</Button>
                      </>}
                      {r.status === 'pending' && r.requester === me.id && <Button size="sm" variant="destructive" onClick={() => act('vote-access', { id: r.id, decision: 'approve' })}><ShieldOff />Approve my own</Button>}
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
