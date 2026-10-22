'use client'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Globe } from '@/components/globe'

type U = { id: string; name: string; role: string }
type R = Record<string, any>
const api = async (action: string, body?: R) => {
  const r = await fetch(`/api/guard/${action}`, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : undefined)
  const j = await r.json().catch(() => ({}))
  return { ok: r.ok, status: r.status, data: j }
}
const money = (n: number) => n.toLocaleString('en-US') + ' VND'

function Status({ s }: { s: string }) {
  const k = s.toLowerCase()
  if (['allow', 'granted', 'applied'].includes(k)) return <Badge>✓ {s}</Badge>
  if (['deny', 'denied', 'rejected'].includes(k)) return <Badge variant="destructive">✕ {s}</Badge>
  if (k === 'pending') return <Badge variant="pending">… {s}</Badge>
  return <Badge variant="outline">{s}</Badge>
}

function Section({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
  return (
    <section className="grid gap-8 md:grid-cols-[2fr_3fr] md:gap-12">
      <div>
        <h2 className="heading">{title}</h2>
        {lead && <p className="mt-2 text-[16px]">{lead}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  )
}

const Item = ({ children, last }: { children: ReactNode; last?: boolean }) => (
  <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 py-4 ${last ? '' : 'border-b border-iris'}`}>{children}</div>
)

export default function Page() {
  const [users, setUsers] = useState<U[]>([])
  const [me, setMe] = useState<U | null>(null)
  const [cases, setCases] = useState<R[]>([])
  const [reqs, setReqs] = useState<R[]>([])
  const [changes, setChanges] = useState<R[]>([])
  const [log, setLog] = useState<R[]>([])
  const [records, setRecords] = useState<Record<string, R>>({})
  const [dba, setDba] = useState<R[] | null>(null)
  const [toast, setToast] = useState<{ t: string; ok: boolean } | null>(null)

  const say = (t: string, ok: boolean) => { setToast({ t, ok }); setTimeout(() => setToast(null), 5000) }
  const refresh = useCallback(async () => {
    const m = (await api('me')).data
    setMe(m?.id ? m : null)
    if (!m?.id) return
    const [c, r, ch, a] = await Promise.all([api('cases'), api('requests'), api('changes'), api('audit')])
    setCases(c.data); setReqs(r.data); setChanges(ch.data); setLog(a.data)
  }, [])
  useEffect(() => { api('users').then(r => setUsers(r.data)); refresh() }, [refresh])

  const act = async (action: string, body: R, okMsg?: string) => {
    const r = await api(action, body)
    say(r.ok ? (okMsg ?? JSON.stringify(r.data)) : `${r.status} · ${r.data.error ?? 'error'}`, r.ok)
    await refresh()
  }
  const login = async (id: string) => { setRecords({}); await api('login', { userId: id }); await refresh() }
  const open = async (caseId: string, kind: 'record' | 'eligibility') => {
    const r = await api(`${kind}?caseId=${caseId}`)
    say(r.ok ? 'Allowed' : `${r.status} · ${r.data.error}`, r.ok)
    if (r.ok) setRecords(s => ({ ...s, [caseId]: r.data }))
    await refresh()
  }
  const role = me?.role
  const firstName = me?.name.split(' ')[0]

  return (
    <div className="min-h-screen md:grid md:grid-cols-[33.333%_1fr]">
      <aside className="flex flex-col items-center justify-between gap-8 bg-iris px-6 py-8 text-white md:fixed md:inset-y-0 md:left-0 md:w-1/3">
        <div className="w-full text-center">
          <div className="pb-4 text-[14px] font-medium tracking-wide uppercase">Citizen Consent Quorum</div>
          <div className="h-px w-full bg-white" />
        </div>
        <Globe size={300} />
        <div className="flex w-full items-center gap-3 text-[14px] font-medium uppercase">
          <span className="h-px flex-1 bg-white" />
          <span>{me ? `Signed in · ${firstName}` : 'Not signed in'}</span>
          <span className="h-px flex-1 bg-white" />
        </div>
      </aside>

      <main className="flex flex-col gap-16 bg-white p-8 md:col-start-2 md:p-16">
        <header className="flex flex-col gap-6">
          <h1 className="display max-w-[16ch]">No one opens a citizen’s record alone.</h1>
          <p className="subheading max-w-[40ch]">Agencies share data only when the assigned officer, a supervisor and the citizen all agree.</p>
          <p className="ddc max-w-[28ch] text-[24px]">The citizen is part of the approval.</p>
        </header>

        <Section title="Who are you?" lead="Demo identities. TideCloak login replaces this switcher.">
          <div className="flex flex-wrap gap-2">
            {users.map(u => (
              <Button key={u.id} onClick={() => login(u.id)} className={me?.id === u.id ? 'underline' : ''}>
                {me?.id === u.id ? '● ' : ''}{u.name}
              </Button>
            ))}
          </div>
        </Section>

        {me && (
          <Section title="Cases" lead={`What ${firstName} is allowed to see. Sensitive fields stay encrypted until consent is complete.`}>
            {cases.length === 0 && <p>No cases in your scope.</p>}
            {cases.map((c, i) => (
              <Item key={c.id} last={i === cases.length - 1}>
                <div className="min-w-[200px] flex-1">
                  <div className="font-medium">{c.id} · {c.title}</div>
                  <div className="caption">assigned: {c.assignedTo.join(', ') || '-'}</div>
                </div>
                {role === 'officer' && <>
                  <Button onClick={() => act('request-access', { caseId: c.id, kind: 'full_view', purpose: 'Process housing subsidy' }, 'Consent request sent to supervisor and citizen')}>Request access</Button>
                  <Button onClick={() => open(c.id, 'record')}>Open record</Button>
                </>}
                {role === 'agency_b' && <>
                  <Button onClick={() => act('request-access', { caseId: c.id, kind: 'eligibility_check', purpose: 'Verify income eligibility' }, 'Consent request sent')}>Request eligibility check</Button>
                  <Button onClick={() => open(c.id, 'eligibility')}>Get result</Button>
                </>}
                {records[c.id]?.name && (
                  <dl className="grid w-full grid-cols-[auto_1fr] gap-x-6 border-[1.5px] border-iris p-4 caption">
                    <dt>Name</dt><dd className="font-medium">{records[c.id].name}</dd>
                    <dt>National ID</dt><dd className="font-medium">{records[c.id].national_id}</dd>
                    <dt>Income</dt><dd className="font-medium">{money(records[c.id].income)}</dd>
                    <dt>Address</dt><dd className="font-medium">{records[c.id].address}</dd>
                    <dt>Health</dt><dd>withheld: not needed for this purpose</dd>
                  </dl>
                )}
                {records[c.id]?.income_eligible !== undefined && (
                  <p className="w-full border-[1.5px] border-iris p-4">
                    income eligible: <b>{records[c.id].income_eligible ? 'yes' : 'no'}</b>
                    <span className="caption block">Agency B never sees the file, only this answer.</span>
                  </p>
                )}
              </Item>
            ))}
          </Section>
        )}

        {me && role !== 'admin' && (
          <Section title="Consent requests" lead="A record opens only after the supervisor and the citizen both approve.">
            {reqs.length === 0 && <p>None yet.</p>}
            {reqs.map((r, i) => (
              <Item key={r.id} last={i === reqs.length - 1}>
                <div className="min-w-[200px] flex-1">
                  <div className="font-medium">① #{r.id} · {r.case_id} · {r.kind.replace('_', ' ')}</div>
                  <div className="caption">by {r.requester} · {r.purpose} · votes: {r.votes.map((v: R) => `${v.voter_role} ${v.decision}`).join(', ') || 'none'}</div>
                </div>
                <Status s={r.status} />
                {(role === 'supervisor' || role === 'citizen') && r.status === 'pending' && <>
                  <Button onClick={() => act('vote-access', { id: r.id, decision: 'approve' }, 'Vote recorded')}>Approve</Button>
                  <Button onClick={() => act('vote-access', { id: r.id, decision: 'deny' }, 'Request denied')}>Deny</Button>
                </>}
              </Item>
            ))}
          </Section>
        )}

        {me && (
          <Section title="Policy changes" lead="Admins can propose, never approve their own change. Two supervisors must agree.">
            {role === 'admin' && (
              <Item>
                <div className="min-w-[200px] flex-1 font-medium">Attack lab: you are the admin</div>
                <Button onClick={() => act('propose-change', { change: 'assign', payload: { caseId: 'C-1002', userId: me.id } })}>Grant myself C-1002</Button>
                <Button onClick={() => { const p = changes.find(c => c.status === 'pending'); p ? act('vote-change', { id: p.id, decision: 'approve' }) : say('Propose a change first', false) }}>Approve my own change</Button>
                <Button onClick={() => open('C-1002', 'record')}>Read C-1002 directly</Button>
              </Item>
            )}
            {changes.length === 0 && <p>No policy changes.</p>}
            {changes.map((c, i) => (
              <Item key={c.id} last={i === changes.length - 1}>
                <div className="min-w-[200px] flex-1">
                  <div className="font-medium">② #{c.id} · {c.change} {c.payload.caseId ?? ''} {c.payload.userId ?? c.payload.value ?? ''}</div>
                  <div className="caption">by {c.requester} · needs {c.quorum} supervisor approvals · has {c.votes.filter((v: R) => v.decision === 'approve').length}</div>
                </div>
                <Status s={c.status} />
                {role === 'supervisor' && c.status === 'pending' && <>
                  <Button onClick={() => act('vote-change', { id: c.id, decision: 'approve' }, 'Vote recorded')}>Approve</Button>
                  <Button onClick={() => act('vote-change', { id: c.id, decision: 'deny' }, 'Change rejected')}>Reject</Button>
                </>}
              </Item>
            ))}
          </Section>
        )}

        <Section title="The database, as a DBA sees it" lead="Full storage access, no consent. Only ciphertext.">
          <Button onClick={async () => setDba((await api('dba')).data)}>Run SELECT * FROM citizens</Button>
          {dba && (
            <pre className="mt-4 overflow-x-auto border-[1.5px] border-iris p-4 text-[12px] leading-[1.46]">
              {dba.map(r => `${r.id}\n  name    ${String(r.full_name_enc).slice(0, 48)}…\n  nat_id  ${String(r.national_id_enc).slice(0, 48)}…\n  income  ${String(r.income_enc).slice(0, 48)}…\n`).join('\n')}
            </pre>
          )}
        </Section>

        {me && (
          <Section title="Audit log" lead="Every decision is recorded and hash-chained.">
            <Table>
              <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Actor</TableHead><TableHead>Action</TableHead><TableHead>Result</TableHead><TableHead>Detail</TableHead></TableRow></TableHeader>
              <TableBody>
                {log.map(l => (
                  <TableRow key={l.id} className="align-top text-[13px]">
                    <TableCell>{new Date(l.at).toLocaleTimeString()}</TableCell>
                    <TableCell>{l.actor}</TableCell>
                    <TableCell>{l.action} {l.target}</TableCell>
                    <TableCell><Status s={l.decision} /></TableCell>
                    <TableCell className="whitespace-normal">{l.detail}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Section>
        )}
      </main>

      {toast && (
        <div role="status" className="fixed right-6 bottom-6 z-50 max-w-sm border-[1.5px] border-iris bg-white p-4 text-[14px] font-medium">
          {toast.ok ? '✓ ' : '✕ '}{toast.t}
        </div>
      )}
    </div>
  )
}
