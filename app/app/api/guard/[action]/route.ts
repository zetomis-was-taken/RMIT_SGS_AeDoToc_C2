import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { COOKIE, currentUser, makeSession, userById, USERS } from '@/lib/auth'
import { Denied, eligibility, listAudit, listCases, listChanges, listRequests, proposeChange, readRecord, requestAccess, voteAccess, voteChange } from '@/lib/guard'
import { audit, db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const fail = (e: unknown) => {
  if (e instanceof Denied) return NextResponse.json({ error: e.message }, { status: e.status })
  console.error(e)
  return NextResponse.json({ error: 'Internal error' }, { status: 500 })
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params
  const q = req.nextUrl.searchParams
  try {
    db()
    if (action === 'users') return NextResponse.json(USERS)
    // Demo of attack #3: what a DBA with raw database access sees. No auth on purpose: this is the storage layer.
    if (action === 'dba') return NextResponse.json(db().prepare('SELECT * FROM citizens').all())
    const u = await currentUser()
    if (action === 'me') return NextResponse.json(u)
    if (!u) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    switch (action) {
      case 'cases': return NextResponse.json(listCases(u))
      case 'requests': return NextResponse.json(listRequests(u))
      case 'changes': return NextResponse.json(listChanges())
      case 'audit': return NextResponse.json(listAudit())
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
    const jar = await cookies()
    if (action === 'login') {
      const user = userById(body.userId)
      if (!user) return NextResponse.json({ error: 'Unknown user' }, { status: 400 })
      jar.set(COOKIE, makeSession(user.id), { httpOnly: true, sameSite: 'lax', path: '/' })
      audit(user.id, 'login', '-', 'INFO', 'demo persona')
      return NextResponse.json(user)
    }
    if (action === 'logout') { jar.delete(COOKIE); return NextResponse.json({ ok: true }) }
    const u = await currentUser()
    if (!u) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    switch (action) {
      case 'request-access':
        return NextResponse.json({ id: requestAccess(u, body.caseId, body.kind, body.purpose ?? '') })
      case 'vote-access':
        return NextResponse.json({ status: voteAccess(u, Number(body.id), body.decision) })
      case 'propose-change':
        return NextResponse.json({ id: proposeChange(u, body.change, body.payload ?? {}) }, { status: 202 })
      case 'vote-change':
        return NextResponse.json({ status: voteChange(u, Number(body.id), body.decision) })
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 404 })
  } catch (e) { return fail(e) }
}
