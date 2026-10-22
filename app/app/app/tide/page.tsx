'use client'
import { Check, KeyRound, Power, ShieldCheck, Skull, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useApp } from '@/components/app-context'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Empty, PageTitle, Panel } from '@/components/bits'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { tideApi, type R } from '@/lib/client'
import { attack } from '@/lib/tide-client'

const short = (s: string, n = 12) => (s.length > n ? `${s.slice(0, n)}…` : s)

export default function TidePage() {
  const { me, now, refresh, notify } = useApp()
  const [session, setSession] = useState<R | null>(null)
  const [realm, setRealm] = useState<R | null>(null)
  const [ork, setOrk] = useState<R | null>(null)
  const [pol, setPol] = useState<R[]>([])
  const [result, setResult] = useState<{ kind: string; status: number; body: R | null; note: string } | null>(null)

  const load = useCallback(async () => {
    const [s, r, o, p] = await Promise.all([tideApi('session'), tideApi('realm'), tideApi('ork'), tideApi('policies')])
    if (s.ok) setSession(s.data); if (r.ok) setRealm(r.data); if (o.ok) setOrk(o.data); if (p.ok) setPol(p.data)
  }, [])
  useEffect(() => { if (me) load() }, [me, load, now - (now % 5000)])
  if (!me) return null

  const hit = async (kind: 'tamper' | 'stolen' | 'replay' | 'unsigned') => {
    const r = await attack(kind)
    setResult({ kind, ...r })
    notify({ kind: 'violation', title: 'Request refused', message: r.body?.error ?? `HTTP ${r.status}`, code: r.body?.code })
    refresh(); load()
  }
  const toggle = async (id: number, online: boolean) => { const r = await tideApi('ork', { id, online }); if (r.ok) setOrk(r.data); refresh() }
  const c = session?.claims as R | undefined

  return (
    <>
      <PageTitle title="TideCloak">
        Where TideCloak sits in this app, and proof the server only trusts what the realm signed. <b>This is a simulation</b>: no TideCloak server or ORK network is running; the app reproduces their token, role and policy checks so it can be switched to the real SDK.
      </PageTitle>

      <div className="grid items-start gap-4 xl:grid-cols-2">
        <Panel title="Your access token" action={<Badge variant="info"><KeyRound />DPoP-bound · {session ? `${session.expiresIn}s left` : '…'}</Badge>}>
          {!c ? <Empty loading>Verifying token…</Empty> : (
            <div className="flex flex-col gap-4 p-5">
              <ol className="flex flex-col gap-1.5 text-[13px]">
                {(session!.checks as R[]).map(k => <li key={k.id} className="flex items-center gap-2"><Check className="size-4 shrink-0" /><span>{k.label}{k.detail ? <span className="mono ml-2 text-gray-500">{k.detail}</span> : null}</span></li>)}
              </ol>
              <dl className="grid grid-cols-[130px_1fr] gap-x-3 gap-y-1.5 border-t border-gray-200 pt-4 text-[13px]">
                {([['user', c.preferred_username], ['realm roles', (c.realm_access?.roles ?? []).join(', ')], ['client roles', Object.entries(c.resource_access ?? {}).map(([k, v]: [string, any]) => `${k}: ${v.roles.join(', ')}`).join(' · ') || 'none'], ['groups', (c.groups ?? []).join(', ')], ['tideuserkey', short(c.tideuserkey, 22)], ['vuid', short(c.vuid, 22)], ['cnf.jkt', short(c.cnf?.jkt ?? '', 22)], ['issuer', c.iss]] as [string, string][]).map(([k, v]) => (
                  <div key={k} className="contents"><dt className="text-gray-500">{k}</dt><dd className="mono break-all text-[12px]">{v}</dd></div>
                ))}
              </dl>
            </div>
          )}
        </Panel>

        <Panel title="Try to cheat the server" action={<Badge variant="info">calls the real API</Badge>}>
          <div className="flex flex-col gap-3 p-5 text-[13px]">
            <p className="text-gray-600">Each button sends a request the way an attacker would. The server verifies the signature against the key embedded in <span className="mono">tidecloak.json</span>, so editing roles in the browser changes nothing.</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="destructive" onClick={() => hit('tamper')}><Skull />Add tide-realm-admin to my token</Button>
              <Button variant="destructive" onClick={() => hit('stolen')}><Skull />Replay my token from another key</Button>
              <Button variant="destructive" onClick={() => hit('replay')}><Skull />Re-send the same proof</Button>
              <Button variant="destructive" onClick={() => hit('unsigned')}><Skull />Use it as a plain Bearer token</Button>
            </div>
            {result && (
              <div role="status" className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <div className="text-gray-600">{result.note}</div>
                <div className="mt-1 font-semibold">HTTP {result.status} · {result.body?.code ?? ''}</div>
                <div className="mono text-gray-600">{result.body?.error}</div>
              </div>
            )}
          </div>
        </Panel>
      </div>

      <Panel className="mt-4" title="ORK network" action={<span className="text-[12px] text-gray-500">{ork ? `${ork.t} of ${ork.n} must agree for every sign, decrypt and password check` : ''}</span>}>
        <div className="grid gap-px bg-gray-200 md:grid-cols-3">
          {(ork?.orks ?? []).map((o: R) => (
            <div key={o.id} className="flex items-center justify-between gap-3 bg-white p-4">
              <div><div className="font-semibold">ORK {o.id}</div><div className="text-[12px] text-gray-500">holds 1 key share · {o.online ? 'online' : 'offline'}</div></div>
              <Button size="sm" variant={o.online ? 'outline' : 'default'} onClick={() => toggle(o.id, !o.online)}><Power />{o.online ? 'Take offline' : 'Bring online'}</Button>
            </div>
          ))}
        </div>
        <Table>
          <TableHeader><TableRow>{['Operation', 'Contract', 'Caller', 'ORKs', 'Result'].map(h => <TableHead key={h} className="text-gray-500">{h}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {(ork?.ops ?? []).length === 0 && <TableRow><TableCell colSpan={5}><Empty>No ORK operations yet.</Empty></TableCell></TableRow>}
            {(ork?.ops ?? []).slice(0, 8).map((o: R, i: number) => (
              <TableRow key={i} className="align-top text-[13px]">
                <TableCell className="font-semibold">{o.op}{o.tag !== '-' && <span className="mono ml-1 text-gray-500">{o.tag}</span>}</TableCell>
                <TableCell className="mono">{o.contract}</TableCell>
                <TableCell>{o.who}</TableCell>
                <TableCell>{o.votes.length ? o.votes.map((v: R) => <span key={v.ork} className="mr-1">{v.ok ? '✓' : '✕'}{v.ork}</span>) : '—'}</TableCell>
                <TableCell className="max-w-[320px] whitespace-normal"><Badge variant={o.result === 'allowed' ? 'ok' : 'danger'}>{o.result}</Badge> <span className="text-gray-500">{o.msg}</span></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-2">
        <Panel title="Realm" action={realm && <span className="mono text-[12px] text-gray-500">{realm.realm}</span>}>
          {!realm ? <Empty loading>Loading…</Empty> : (
            <div className="flex flex-col gap-4 p-5 text-[13px]">
              <p>IGA is on. Approving a change request needs <b>{realm.iga.threshold} of {realm.iga.admins}</b> <span className="mono">tide-realm-admin</span> holders: <span className="mono">{realm.iga.formula}</span>. The app cannot change this. Holders: {realm.iga.holders.join(', ')}.</p>
              <ul className="flex flex-col divide-y divide-gray-200 border-y border-gray-200">
                {realm.roles.map((r: R) => <li key={r.name} className="py-2"><span className="mono font-semibold">{r.name}</span> <Badge variant="outline">{r.type}{r.client ? ` · ${r.client}` : ''}</Badge><div className="text-gray-500">{r.note}</div></li>)}
              </ul>
            </div>
          )}
        </Panel>
        <Panel title="Signed relationship policies" action={<span className="text-[12px] text-gray-500">RelationshipAttestation:1</span>}>
          <Table>
            <TableHeader><TableRow>{['Case', 'Subject', 'Source', 'Signature'].map(h => <TableHead key={h} className="text-gray-500">{h}</TableHead>)}</TableRow></TableHeader>
            <TableBody>
              {pol.length === 0 && <TableRow><TableCell colSpan={4}><Empty>No policies name you.</Empty></TableCell></TableRow>}
              {pol.slice(0, 10).map(p => (
                <TableRow key={p.id} className="text-[13px]">
                  <TableCell className="font-semibold">{p.caseId}</TableCell>
                  <TableCell>{p.subject}<div className="mono text-gray-500">{short(p.subjectKey, 10)}</div></TableCell>
                  <TableCell className="text-gray-600">{p.source}</TableCell>
                  <TableCell><Badge variant={p.signatureValid ? 'ok' : 'danger'}>{p.signatureValid ? <ShieldCheck /> : <X />}{p.signatureValid ? 'valid' : 'invalid'}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      </div>
    </>
  )
}
