import { NextRequest, NextResponse } from 'next/server'
import { authenticate, USERS } from '@/lib/auth'
import { AuthError, type Check } from '@/lib/tide-sim/jwt'
import { Denied, verifyChain, eligibility, listAudit, listCases, listChanges, listRequests, proposeChange, readRecord, requestAccess, voteAccess, voteChange } from '@/lib/guard'
import { audit, db, resetDb } from '@/lib/db'
import { runScenario, SCENARIOS } from '@/lib/lab'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const fail = (e: unknown) => {
  if (e instanceof AuthError) return NextResponse.json({ error: e.message, code: e.code, checks: e.checks }, { status: 401 })
  if (e instanceof Denied) return NextResponse.json({ error: e.message, code: e.code, tide: e.tide }, { status: e.status })
  console.error(e)
  return NextResponse.json({ error: 'Internal error' }, { status: 500 })
}
const publicUser = (u: ReturnType<typeof authenticate>['user']) => ({ id: u.id, name: u.name, role: u.role, citizenId: u.citizenId, tideuserkey: u.tideuserkey })

export async function GET(req: NextRequest, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params
  const q = req.nextUrl.searchParams
  try {
    db()
    if (action === 'users') return NextResponse.json(USERS)
    // Attack #3: what a DBA with raw database access sees. No auth on purpose: this is the storage layer.
    if (action === 'dba') return NextResponse.json(db().prepare('SELECT * FROM citizens').all())
    if (action === 'me') {
      // signed-out is a normal answer here, not an error
      try { return NextResponse.json(publicUser(authenticate(req).user)) } catch (e) { if (e instanceof AuthError) return NextResponse.json(null); throw e }
    }
    const { user: u } = authenticate(req)
    switch (action) {
      case 'cases': return NextResponse.json(listCases(u))
      case 'requests': return NextResponse.json(listRequests(u))
      case 'changes': return NextResponse.json(listChanges(u))
      case 'audit': return NextResponse.json(listAudit(u, 300))
      case 'verify': return NextResponse.json(verifyChain())
      case 'scenarios': return NextResponse.json(SCENARIOS)
      case 'record': return NextResponse.json(readRecord(u, q.get('caseId') ?? ''))
      case 'eligibility': return NextResponse.json(eligibility(u, q.get('caseId') ?? ''))
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 404 })
  } catch (e) { return fail(e) }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params
  const body = await req.json().catch(() => ({}))
  try {
    db()
    const { user: u } = authenticate(req)
    switch (action) {
      case 'lab': return NextResponse.json(await runScenario(body.id))
      case 'reset': resetDb(); audit(u.id, 'reset_demo', '-', 'INFO', 'demo data reset'); return NextResponse.json({ ok: true })
      case 'request-access': return NextResponse.json({ id: requestAccess(u, body.caseId, body.kind, body.purpose ?? '') })
      case 'vote-access': return NextResponse.json({ status: voteAccess(u, Number(body.id), body.decision) })
      case 'propose-change': return NextResponse.json({ id: proposeChange(u, body.change, body.payload ?? {}) }, { status: 202 })
      case 'vote-change': return NextResponse.json({ status: voteChange(u, Number(body.id), body.decision) })
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 404 })
  } catch (e) { return fail(e) }
}
