import { NextRequest, NextResponse } from 'next/server'
import { authenticate } from '@/lib/auth'
import { ACCESS_TTL, AuthError, tokenEndpoint, type Check } from '@/lib/tide-sim/jwt'
import { adapter, setOnline, status, OrkError } from '@/lib/tide-sim/ork'
import { AUTH_SERVER, CLIENT_ID, DIRECTORY, ISSUER, REALM, iga, realmAdmins, tideUserKey } from '@/lib/tide-sim/directory'
import { audit, db } from '@/lib/db'
import { listPolicies } from '@/lib/guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ROLES = [
  { name: 'officer', type: 'realm', note: 'Case officer. Needs a signed relationship policy per case.' },
  { name: 'supervisor', type: 'realm', note: 'Votes on consent requests. Never reads records.' },
  { name: 'citizen', type: 'realm', note: 'Votes on access to their own record.' },
  { name: 'agency-b', type: 'realm', note: 'May ask for an eligibility answer only.' },
  { name: 'app-admin', type: 'realm', note: 'Proposes policy changes. Cannot approve them.' },
  { name: '_tide_decryptor', type: 'realm', note: 'Capability the ORKs require to decrypt. A second gate behind the policy.' },
  { name: 'tide-realm-admin', type: 'client', client: 'realm-management', note: 'Approves IGA change requests. Quorum = max(1, floor(0.7 x holders)).' },
]

const fail = (e: unknown) => {
  if (e instanceof AuthError) return NextResponse.json({ error: e.message, code: e.code, checks: e.checks }, { status: 401 })
  if (e instanceof OrkError) return NextResponse.json({ error: e.message, code: e.code }, { status: 503 })
  console.error(e)
  return NextResponse.json({ error: 'Internal error' }, { status: 500 })
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params
  try {
    if (action === 'adapter') return NextResponse.json(adapter())
    const trace: Check[] = []
    const { user: u, payload } = authenticate(req, trace)
    switch (action) {
      case 'session': return NextResponse.json({ claims: payload, checks: trace, expiresIn: payload.exp - Math.floor(Date.now() / 1000) })
      case 'ork': return NextResponse.json(status())
      case 'policies': db(); return NextResponse.json(listPolicies(u))
      case 'realm': {
        const q = iga()
        return NextResponse.json({
          realm: REALM, issuer: ISSUER, authServer: AUTH_SERVER, client: CLIENT_ID, accessTokenSeconds: ACCESS_TTL, igaEnabled: true,
          iga: { ...q, formula: 'max(1, floor(0.7 x tide-realm-admin holders))', holders: realmAdmins().map(a => a.username) },
          vendorId: adapter().vendorId, kid: adapter().jwk.keys[0].kid,
          roles: ROLES,
          users: DIRECTORY.map(d => ({ username: d.username, name: d.name, realmRoles: d.realmRoles.filter(r => !['_tide_enabled', 'offline_access'].includes(r)), clientRoles: d.clientRoles, groups: d.groups, tideuserkey: tideUserKey(d.username) })),
        })
      }
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 404 })
  } catch (e) { return fail(e) }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params
  const body = await req.json().catch(() => ({}))
  try {
    if (action === 'token') {
      // the token endpoint is public, but every grant is DPoP-bound to the caller's key
      return NextResponse.json(tokenEndpoint(body, req.headers.get('dpop'), req.nextUrl.origin + req.nextUrl.pathname), { headers: { 'cache-control': 'no-store' } })
    }
    const { user: u } = authenticate(req)
    if (action === 'ork') {
      db()
      setOnline(Number(body.id), !!body.online)
      audit(u.id, 'ork_toggle', `ORK ${body.id}`, 'INFO', body.online ? 'brought online (demo control)' : 'taken offline (demo control)')
      return NextResponse.json(status())
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 404 })
  } catch (e) { return fail(e) }
}
