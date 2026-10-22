'use client'
import { Check, Gavel, ShieldOff, X } from 'lucide-react'
import { useState } from 'react'
import { useApp } from '@/components/app-context'
import { Button } from '@/components/ui/button'
import { Empty, PageTitle, Panel, Restricted, Status, Vote } from '@/components/bits'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { describeChange } from '@/lib/client'
import { canOpen } from '@/lib/access'

const sel = 'rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-[13px] text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2727e6]/30 cursor-pointer'

export default function Policy() {
  const { me, cases, changes, users, act, booted } = useApp()
  const [caseId, setCaseId] = useState('C-1001')
  const [userId, setUserId] = useState('officer_an')
  const [quorum, setQuorum] = useState('1')
  if (!me) return null
  if (!canOpen(me.role, 'policy')) return <Restricted page="policy" probe="changes" />
  const officers = users.filter(u => u.role === 'officer')
  const pending = changes.find(c => c.status === 'pending')

  return (
    <>
      <PageTitle title="Policy Changes & Governance">
        Who is assigned to which case is a cryptographic policy decision. Modifying assignments requires supervisor quorum consensus. System administrators may propose changes, but can never self-approve.
      </PageTitle>

      {me.role === 'admin' && (
        <Panel className="mb-5" title="Propose Policy Change · Admin Gateway">
          <div className="grid gap-px bg-gray-200 md:grid-cols-2">
            <div className="flex flex-wrap items-end gap-3.5 bg-white p-6">
              <label className="flex flex-col gap-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Case Target
                <select className={sel} value={caseId} onChange={e => setCaseId(e.target.value)}>
                  {cases.map(c => <option key={c.id} className="bg-white text-gray-900">{c.id}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Grant Access To
                <select className={sel} value={userId} onChange={e => setUserId(e.target.value)}>
                  {officers.map(u => <option key={u.id} value={u.id} className="bg-white text-gray-900">{u.name.split(' (')[0]} · {u.id}</option>)}
                  <option value={me.id} className="bg-white text-gray-900">Myself (Self-Assignment) · {me.id}</option>
                </select>
              </label>
              <Button onClick={() => act('propose-change', { change: 'assign', payload: { caseId, userId } }, { title: 'Change proposed', message: 'Not applied. Waiting for supervisor quorum.' })}>
                <Gavel />Propose assignment
              </Button>
            </div>
            
            <div className="flex flex-wrap items-end gap-3.5 bg-white p-6">
              <label className="flex flex-col gap-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Approvals Required
                <select className={sel} value={quorum} onChange={e => setQuorum(e.target.value)}>
                  <option className="bg-white text-gray-900">1</option>
                  <option className="bg-white text-gray-900">2</option>
                </select>
              </label>
              <Button variant="outline" onClick={() => act('propose-change', { change: 'set_quorum', payload: { value: Number(quorum) } }, { title: 'Change proposed', message: 'Lowering the quorum needs the quorum.' })}>
                Propose new quorum
              </Button>
              {pending && (
                <Button variant="destructive" onClick={() => act('vote-change', { id: pending.id, decision: 'approve' })}>
                  <ShieldOff />Approve my own #{pending.id}
                </Button>
              )}
            </div>
          </div>
        </Panel>
      )}

      <Panel title={`${changes.length} policy change${changes.length === 1 ? '' : 's'}`}>
        <Table>
          <TableHeader>
            <TableRow>
              {['Change Specification', 'Requested By', 'Quorum Progress', 'Status', ''].map(h => (
                <TableHead key={h}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {!booted && <TableRow><TableCell colSpan={5}><Empty loading>Loading policy logs…</Empty></TableCell></TableRow>}
            {booted && changes.length === 0 && <TableRow><TableCell colSpan={5}><Empty>No policy changes proposed yet.</Empty></TableCell></TableRow>}
            {changes.map(c => {
              const approvals = c.votes.filter((v: any) => v.decision === 'approve').length
              return (
                <TableRow key={c.id} className="align-top">
                  <TableCell>
                    <div className="font-bold text-gray-900 flex items-center gap-2">
                      <span className="mono font-mono text-xs text-[#2727e6]">#{c.id}</span>
                      {describeChange(c)}
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-600">{c.requester}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="h-2.5 w-24 rounded-full bg-gray-100 p-0.5 border border-gray-200 overflow-hidden" role="progressbar" aria-valuenow={approvals} aria-valuemax={c.quorum}>
                        <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-[#3b5bf5] transition-[width] duration-300" style={{ width: `${Math.min(100, (approvals / c.quorum) * 100)}%` }} />
                      </div>
                      <span className="num text-[12px] font-bold text-gray-600">{approvals}/{c.quorum}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">{c.votes.map((v: any) => <Vote key={v.voter} role={v.voter} v={v.decision} />)}</div>
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

      <Panel className="mt-5" title="Current Active Assignments">
        <Table>
          <TableHeader>
            <TableRow>{['Case Target', 'Authorized Officer'].map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow>
          </TableHeader>
          <TableBody>
            {cases.map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-bold text-gray-900 font-mono text-xs">{c.id}</TableCell>
                <TableCell className="text-gray-600">{c.assignedTo.join(', ') || <span className="text-gray-400">Unassigned</span>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>
    </>
  )
}
