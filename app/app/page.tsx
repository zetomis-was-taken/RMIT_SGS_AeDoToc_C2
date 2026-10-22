'use client'
import { useCallback, useEffect, useState } from 'react'

type U = { id: string; name: string; role: string }
type R = Record<string, any>
const api = async (action: string, body?: R) => {
  const r = await fetch(`/api/guard/${action}`, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : undefined)
  const j = await r.json().catch(() => ({}))
  return { ok: r.ok, status: r.status, data: j }
}
const money = (n: number) => n.toLocaleString('en-US') + ' VND'

export default function Page() {
  const [users, setUsers] = useState<U[]>([])
  const [me, setMe] = useState<U | null>(null)
  const [cases, setCases] = useState<R[]>([])
  const [reqs, setReqs] = useState<R[]>([])
  const [changes, setChanges] = useState<R[]>([])
  const [log, setLog] = useState<R[]>([])
  const [records, setRecords] = useState<Record<string, R>>({})
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
    say(r.ok ? (okMsg ?? JSON.stringify(r.data)) : `${r.status} ${r.data.error ?? 'error'}`, r.ok)
    await refresh()
    return r
  }
  const login = async (id: string) => { setRecords({}); await api('login', { userId: id }); await refresh() }
  const open = async (caseId: string, kind: 'record' | 'eligibility') => {
    const r = await api(`${kind}?caseId=${caseId}`)
    say(r.ok ? 'Allowed' : `${r.status} ${r.data.error}`, r.ok)
    if (r.ok) setRecords(s => ({ ...s, [caseId]: r.data }))
    await refresh()
  }
  const role = me?.role
  const pendingVotes = reqs.filter(r => r.status === 'pending')

  return (
    <>
      <header>
        <h1>Citizen Consent Quorum</h1>
        <span className="mut">no admin, agency or insider opens a record alone</span>
        <span className="sp" />
        <select value={me?.id ?? ''} onChange={e => login(e.target.value)}>
          <option value="" disabled>Sign in as…</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        {me && <button onClick={async () => { await api('logout', {}); setMe(null) }}>Sign out</button>}
      </header>
      <main>
        {!me && <div className="card">Pick a persona above. <span className="mut">(Demo identities; TideCloak login replaces this.)</span></div>}

        {me && (
          <div className="card">
            <h2>Cases visible to {me.name}</h2>
            {cases.length === 0 && <div className="mut">No cases in your scope.</div>}
            {cases.map(c => (
              <div className="row" key={c.id}>
                <div className="grow"><b>{c.id}</b> {c.title}<div className="mut">assigned: {c.assignedTo.join(', ') || '-'}</div></div>
                {role === 'officer' && <>
                  <button onClick={() => act('request-access', { caseId: c.id, kind: 'full_view', purpose: 'Process housing subsidy' }, 'Consent request sent to supervisor + citizen')}>Request access</button>
                  <button className="p" onClick={() => open(c.id, 'record')}>Open record</button>
                </>}
                {role === 'agency_b' && <>
                  <button onClick={() => act('request-access', { caseId: c.id, kind: 'eligibility_check', purpose: 'Verify income eligibility' }, 'Consent request sent')}>Request eligibility check</button>
                  <button className="p" onClick={() => open(c.id, 'eligibility')}>Get result</button>
                </>}
                {records[c.id]?.name && <pre className="grow">{JSON.stringify({ ...records[c.id], income: money(records[c.id].income) }, null, 2)}</pre>}
                {records[c.id]?.income_eligible !== undefined && <pre className="grow">{JSON.stringify(records[c.id], null, 2)}   // Agency B never sees the file</pre>}
              </div>
            ))}
          </div>
        )}

        {me && (role === 'officer' || role === 'agency_b' || role === 'supervisor' || role === 'citizen') && (
          <div className="card">
            <h2>Consent requests</h2>
            {reqs.length === 0 && <div className="mut">None yet.</div>}
            {reqs.map(r => (
              <div className="row" key={r.id}>
                <div className="grow">#{r.id} <b>{r.case_id}</b> · {r.kind} · by {r.requester}
                  <div className="mut">{r.purpose} · votes: {r.votes.map((v: R) => `${v.voter_role}:${v.decision}`).join(', ') || 'none'}</div></div>
                <span className={`b ${r.status}`}>{r.status}</span>
                {(role === 'supervisor' || role === 'citizen') && r.status === 'pending' && <>
                  <button className="p" onClick={() => act('vote-access', { id: r.id, decision: 'approve' }, 'Vote recorded')}>Approve</button>
                  <button className="d" onClick={() => act('vote-access', { id: r.id, decision: 'deny' }, 'Denied')}>Deny</button>
                </>}
              </div>
            ))}
            {pendingVotes.length > 0 && <div className="mut">A record opens only after the supervisor AND the citizen approve.</div>}
          </div>
        )}

        {me && (
          <div className="card">
            <h2>Policy changes (quorum-protected)</h2>
            {role === 'admin' && (
              <div className="row">
                <div className="grow">Attack: admin tries to assign <b>themselves</b> to case C-1002.</div>
                <button className="d" onClick={() => act('propose-change', { change: 'assign', payload: { caseId: 'C-1002', userId: me.id } })}>Self-grant access</button>
                {changes[0]?.status === 'pending' && <button className="d" onClick={() => act('vote-change', { id: changes[0].id, decision: 'approve' })}>Approve my own change</button>}
                <button className="d" onClick={() => open('C-1002', 'record')}>Read C-1002 directly</button>
              </div>
            )}
            {changes.length === 0 && <div className="mut">No policy changes.</div>}
            {changes.map(c => (
              <div className="row" key={c.id}>
                <div className="grow">#{c.id} {c.change} {JSON.stringify(c.payload)} · by {c.requester}
                  <div className="mut">needs {c.quorum} supervisor approvals · got {c.votes.filter((v: R) => v.decision === 'approve').length}</div></div>
                <span className={`b ${c.status}`}>{c.status}</span>
                {role === 'supervisor' && c.status === 'pending' && <>
                  <button className="p" onClick={() => act('vote-change', { id: c.id, decision: 'approve' }, 'Vote recorded')}>Approve</button>
                  <button className="d" onClick={() => act('vote-change', { id: c.id, decision: 'deny' }, 'Rejected')}>Reject</button>
                </>}
              </div>
            ))}
          </div>
        )}

        {me && (
          <div className="card">
            <h2>Audit log (hash-chained)</h2>
            <table><tbody>
              {log.map(l => (
                <tr key={l.id}><td className="mut">{new Date(l.at).toLocaleTimeString()}</td><td>{l.actor}</td><td>{l.action}</td><td>{l.target}</td>
                  <td><span className={`b ${l.decision}`}>{l.decision}</span></td><td className="mut">{l.detail}</td></tr>
              ))}
            </tbody></table>
          </div>
        )}
      </main>
      {toast && <div className={`toast ${toast.ok ? 'ok' : 'err'}`}>{toast.t}</div>}
    </>
  )
}
