import type { NextRequest } from 'next/server'
import { AuthError, verifyDPoP, verifyTideJWT, type Check } from './tide-sim/jwt'
import { DIRECTORY, dirUser, tideUserKey, vuid, type Role } from './tide-sim/directory'
import type { Caller } from './tide-sim/ork'

export type { Role }
export interface User {
  id: string; name: string; role: Role; citizenId?: string
  tideuserkey: string; vuid: string
  realmRoles: string[]; clientRoles: Record<string, string[]>; groups: string[]
}

// The app derives everything about a caller from VERIFIED token claims. There is no session cookie and no client-supplied role.
const FROM_REALM_ROLE: [string, Role][] = [['officer', 'officer'], ['supervisor', 'supervisor'], ['app-admin', 'admin'], ['citizen', 'citizen'], ['agency-b', 'agency_b']]
const roleOf = (roles: string[]): Role | null => FROM_REALM_ROLE.find(([r]) => roles.includes(r))?.[1] ?? null

export function userFromClaims(p: Record<string, any>): User {
  const roles: string[] = p.realm_access?.roles ?? []
  const role = roleOf(roles)
  if (!role) throw new AuthError('NO_APP_ROLE', 'The token carries no role for this app.')
  return {
    id: p.preferred_username, name: p.name ?? p.preferred_username, role, citizenId: p.citizen_ref,
    tideuserkey: p.tideuserkey, vuid: p.vuid, realmRoles: roles,
    clientRoles: Object.fromEntries(Object.entries(p.resource_access ?? {}).map(([c, v]: [string, any]) => [c, v.roles ?? []])),
    groups: p.groups ?? [],
  }
}

/** Authenticate a request: DPoP-bound access token, verified against the embedded realm key. Throws AuthError (401). */
export function authenticate(req: NextRequest, trace: Check[] = []) {
  const m = /^DPoP (.+)$/.exec(req.headers.get('authorization') ?? '')
  if (!m) throw new AuthError('TOKEN_MISSING', 'Missing DPoP-bound access token. Sign in again.', trace)
  const payload = verifyTideJWT(m[1], trace)
  verifyDPoP(req.headers.get('dpop'), req.method, req.nextUrl.origin + req.nextUrl.pathname, m[1], payload.cnf?.jkt, trace)
  return { user: userFromClaims(payload), payload, token: m[1] }
}

// Directory-backed users for the Security lab, which plays attackers inside the policy engine without going through HTTP.
export function userById(id: string): User | undefined {
  const d = dirUser(id)
  return d && { id: d.username, name: d.name, role: d.role, citizenId: d.citizenRef, tideuserkey: tideUserKey(d.username), vuid: vuid(d.username), realmRoles: d.realmRoles, clientRoles: d.clientRoles, groups: d.groups }
}
export const USERS = DIRECTORY.map(d => ({ id: d.username, name: d.name, role: d.role, citizenId: d.citizenRef }))
export const callerOf = (u: User): Caller => ({ username: u.id, tideuserkey: u.tideuserkey, realmRoles: u.realmRoles, clientRoles: u.clientRoles, groups: u.groups })
export const isRealmAdmin = (u: User) => !!u.clientRoles['realm-management']?.includes('tide-realm-admin')
