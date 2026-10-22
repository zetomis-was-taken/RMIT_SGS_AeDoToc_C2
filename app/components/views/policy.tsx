'use client'
import { Check, Gavel, ShieldOff, X } from 'lucide-react'
import { useState } from 'react'
import { useApp } from '../app-context'
import { Button } from '../ui/button'
import { Empty, PageTitle, Panel, Status, Vote } from '../bits'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'

const sel = 'rounded-[12px] border border-line bg-white px-3 py-1.5 text-[13px]'

export function Policy() {
  const { me, cases, changes, users, act } = useApp()
  const [caseId, setCaseId] = useState('C-1001')
  const [userId, setUserId] = useState('officer_an')
  const [quorum, setQuorum] = useState('1')
  if (!me) return null
  const officers = users.filter(u => u.role === 'officer')
  const pending = changes.find(c => c.status === 'pending')

  return (
    <>
      <PageTitle title="Policy changes">Who is assigned to which case is policy. Changing it needs two supervisors. An admin can propose, never approve.</PageTitle>

      {me.role === 'admin' && (
        <Panel className="mb-6" title="Propose a change (admin)">
          <div className="flex flex-col gap-4 p-4">
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-[12px] text-soft">Case
                <select className={sel} value={caseId} onChange={e => setCaseId(e.target.value)}>{cases.map(c => <option key={c.id}>{c.id}</option>)}</select></label>
              <label className="flex flex-col gap-1 text-[12px] text-soft">Grant access to
                <select className={sel} value={userId} onChange={e => setUserId(e.target.value)}>
                  {officers.map(u => <option key={u.id} value={u.id}>{u.name.split(' (')[0]} · {u.id}</option>)}
                  <option value={me.id}>Myself · {me.id}</option>
                </select></label>
              <Button onClick={() => act('propose-change', { change: 'assign', payload: { caseId, userId } }, { title: 'Change proposed', message: 'Not applied. Waiting for supervisor quorum.' })}><Gavel />Propose assignment</Button>
            </div>
            <div className="flex flex-wrap items-end gap-3 border-t border-line pt-4">
              <label className="flex flex-col gap-1 text-[12px] text-soft">Approvals required
                <select className={sel} value={quorum} onChange={e => setQuorum(e.target.value)}><option>1</option><option>2</option></select></label>
              <Button variant="outline" onClick={() => act('propose-change', { change: 'set_quorum', payload: { value: Number(quorum) } }, { title: 'Change proposed', message: 'Lowering the quorum also needs the quorum.' })}>Propose new quorum</Button>
              {pending && <Button variant="destructive" onClick={() => act('vote-change', { id: pending.id, decision: 'approve' })}><ShieldOff />Approve my own change #{pending.id}</Button>}
            </div>
          </div>
        </Panel>
      )}

      <Panel title={`${changes.length} change${changes.length === 1 ? '' : 's'}`}>
        <Table>
          <TableHeader><TableRow>{['Change', 'Requested by', 'Approvals', 'Status', ''].map(h => <TableHead key={h} className="text-soft">{h}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {changes.length === 0 && <TableRow><TableCell colSpan={5}><Empty>No policy changes.</Empty></TableCell></TableRow>}
            {changes.map(c => {
              const approvals = c.votes.filter((v: any) => v.decision === 'approve').length
              return (
                <TableRow key={c.id} className="align-top">
                  <TableCell><div className="font-medium"><span className="mono">#{c.id}</span> {c.change === 'assign' ? `Assign ${c.payload.userId} to ${c.payload.caseId}` : `Set quorum to ${c.payload.value}`}</div></TableCell>
                  <TableCell>{c.requester}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 bg-iris-100" role="progressbar" aria-valuenow={approvals} aria-valuemax={c.quorum}><div className="h-full bg-iris transition-[width] duration-300" style={{ width: `${Math.min(100, (approvals / c.quorum) * 100)}%` }} /></div>
                      <span className="num text-[12px] text-soft">{approvals}/{c.quorum}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3">{c.votes.map((v: any) => <Vote key={v.voter} role={v.voter} v={v.decision} />)}</div>
                  </TableCell>
                  <TableCell><Status s={c.status} /></TableCell>
                  <TableCell>
                    {me.role === 'supervisor' && c.status === 'pending' && !c.votes.some((v: any) => v.voter === me.id) && (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" onClick={() => act('vote-change', { id: c.id, decision: 'approve' }, { title: 'Vote recorded', message: `You approved change #${c.id}` })}><Check />Approve</Button>
                        <Button size="sm" variant="destructive" onClick={() => act('vote-change', { id: c.id, decision: 'deny' }, { title: 'Change rejected', message: `You rejected change #${c.id}` })}><X />Reject</Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Panel>

      <Panel className="mt-6" title="Effective assignments">
        <Table>
          <TableHeader><TableRow>{['Case', 'Assigned to'].map(h => <TableHead key={h} className="text-soft">{h}</TableHead>)}</TableRow></TableHeader>
          <TableBody>{cases.map(c => <TableRow key={c.id}><TableCell className="font-medium">{c.id}</TableCell><TableCell>{c.assignedTo.join(', ') || '—'}</TableCell></TableRow>)}</TableBody>
        </Table>
      </Panel>
    </>
  )
}
