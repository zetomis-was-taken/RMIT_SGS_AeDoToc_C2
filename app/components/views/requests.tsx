'use client'
import { Check, ShieldOff, X } from 'lucide-react'
import { useApp } from '../app-context'
import { Button } from '../ui/button'
import { Empty, PageTitle, Panel, Status, Vote } from '../bits'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { ago } from '@/lib/client'

export function Requests() {
  const { me, reqs, act } = useApp()
  if (!me) return null
  const approver = (r: any) => r.status === 'pending' && !r.votes.some((v: any) => v.voter === me.id) &&
    (me.role === 'supervisor' || (me.role === 'citizen' && me.citizenId === r.citizen_id))

  return (
    <>
      <PageTitle title="Consent requests">A record opens only when the supervisor and the citizen who owns it both approve. Grants last 15 minutes.</PageTitle>
      <Panel title={`${reqs.length} request${reqs.length === 1 ? '' : 's'}`}>
        <Table>
          <TableHeader><TableRow>{['Request', 'Purpose', 'Approvals', 'Status', ''].map(h => <TableHead key={h} className="text-soft">{h}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {reqs.length === 0 && <TableRow><TableCell colSpan={5}><Empty>No requests yet. An officer opens one from a case.</Empty></TableCell></TableRow>}
            {reqs.map(r => {
              const v = (role: string) => r.votes.find((x: any) => x.voter_role === role)?.decision
              return (
                <TableRow key={r.id} className="align-top">
                  <TableCell><div className="font-medium"><span className="mono">#{r.id}</span> {r.case_id}</div><div className="text-[12px] text-soft">{r.kind === 'full_view' ? 'Full view' : 'Eligibility check'} · {r.requester} · {ago(r.created_at)}</div></TableCell>
                  <TableCell className="max-w-[220px] whitespace-normal text-soft">{r.purpose}</TableCell>
                  <TableCell><div className="flex flex-col gap-0.5"><Vote role="Supervisor" v={v('supervisor')} /><Vote role="Citizen" v={v('citizen')} /></div></TableCell>
                  <TableCell><Status s={r.status} /></TableCell>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-2">
                      {approver(r) && <>
                        <Button size="sm" onClick={() => act('vote-access', { id: r.id, decision: 'approve' }, { title: 'Vote recorded', message: `You approved request #${r.id}` })}><Check />Approve</Button>
                        <Button size="sm" variant="destructive" onClick={() => act('vote-access', { id: r.id, decision: 'deny' }, { title: 'Request denied', message: `You denied request #${r.id}` })}><X />Deny</Button>
                      </>}
                      {r.status === 'pending' && r.requester === me.id && (
                        <Button size="sm" variant="destructive" onClick={() => act('vote-access', { id: r.id, decision: 'approve' })}><ShieldOff />Approve my own</Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Panel>
    </>
  )
}
