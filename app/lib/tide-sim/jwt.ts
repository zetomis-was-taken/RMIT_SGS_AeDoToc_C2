import { createHash, createPublicKey, randomBytes, verify as nodeVerify } from 'node:crypto'
import { adapter, signCompact, verifyPassword } from './ork'
import { CLIENT_ID, ISSUER, dirUser, subjectUuid, tideUserKey, vuid } from './directory'

const b64u = (b: Buffer | string) => Buffer.from(b).toString('base64url')
const dec = (s: string) => JSON.parse(Buffer.from(s, 'base64url').toString('utf8'))
export const ACCESS_TTL = 600 // seconds, the realm default Tide documents

export class AuthError extends Error {
  status = 401
  constructor(public code: string, msg: string, public checks: Check[] = []) { super(msg) }
}
export interface Check { id: string; label: string; ok: boolean; detail?: string }

export const jwkThumbprint = (j: { crv?: string; kty?: string; x?: string; y?: string }) =>
  createHash('sha256').update(JSON.stringify({ crv: j.crv, kty: j.kty, x: j.x, y: j.y })).digest('base64url')

const seen = new Map<string, number>() // DPoP jti replay cache, 2 minute TTL
function remember(jti: string) {
  const now = Date.now()
  for (const [k, t] of seen) if (t < now) seen.delete(k)
  if (seen.has(jti)) return false
  seen.set(jti, now + 120_000)
  return true
}

/** Verify a TideCloak access token against the JWKS embedded in the adapter JSON (never a remote JWKS: Tide invariant I-04). */
export function verifyTideJWT(token: string, trace: Check[] = []) {
  const fail = (code: string, msg: string, id: string, label: string): never => { trace.push({ id, label, ok: false, detail: msg }); throw new AuthError(code, msg, trace) }
  const parts = token.split('.')
  if (parts.length !== 3) return fail('TOKEN_MALFORMED', 'Not a JWT.', 'format', 'Token is a well-formed JWT')
  let header: any, payload: any
  try { header = dec(parts[0]); payload = dec(parts[1]) } catch { return fail('TOKEN_MALFORMED', 'Token cannot be decoded.', 'format', 'Token is a well-formed JWT') }
  trace.push({ id: 'format', label: 'Token is a well-formed JWT', ok: true })

  const cfg = adapter()
  const jwk = cfg.jwk.keys.find(k => k.kid === header.kid) ?? cfg.jwk.keys[0]
  let sigOk = false
  try { sigOk = header.alg === 'ES256' && nodeVerify('sha256', Buffer.from(`${parts[0]}.${parts[1]}`), { key: createPublicKey({ key: { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y }, format: 'jwk' }), dsaEncoding: 'ieee-p1363' }, Buffer.from(parts[2], 'base64url')) } catch { sigOk = false }
  if (!sigOk) return fail('TOKEN_SIGNATURE_INVALID', 'Signature does not verify against the realm key embedded in tidecloak.json.', 'signature', 'Signature verifies against the embedded realm key (jwk)')
  trace.push({ id: 'signature', label: 'Signature verifies against the embedded realm key (jwk)', ok: true, detail: `kid ${jwk.kid}` })

  if (payload.iss !== ISSUER) return fail('TOKEN_ISSUER_MISMATCH', `Issuer ${payload.iss} is not ${ISSUER}.`, 'iss', 'Issuer is this realm')
  trace.push({ id: 'iss', label: 'Issuer is this realm', ok: true, detail: payload.iss })
  if (payload.azp !== cfg.resource) return fail('TOKEN_AZP_MISMATCH', `Token was issued to ${payload.azp}, not ${cfg.resource}.`, 'azp', 'Authorized party is this app (azp)')
  trace.push({ id: 'azp', label: 'Authorized party is this app (azp)', ok: true, detail: payload.azp })
  const now = Math.floor(Date.now() / 1000)
  if (payload.exp < now) return fail('TOKEN_EXPIRED', 'Token has expired. Sign in again.', 'exp', 'Not expired')
  if (payload.iat > now + 60) return fail('TOKEN_FROM_FUTURE', 'Token was issued in the future.', 'exp', 'Not expired')
  trace.push({ id: 'exp', label: 'Not expired', ok: true, detail: `${payload.exp - now}s left` })
  return payload as Record<string, any>
}

/** RFC 9449 proof check. `accessToken` is present for API calls, absent at the token endpoint. */
export function verifyDPoP(proof: string | null, method: string, url: string, accessToken?: string, cnfJkt?: string, trace: Check[] = []) {
  const fail = (code: string, msg: string, id: string, label: string): never => { trace.push({ id, label, ok: false, detail: msg }); throw new AuthError(code, msg, trace) }
  if (!proof) return fail('DPOP_MISSING', 'DPoP proof header is missing.', 'dpop', 'DPoP proof present and well formed')
  const p = proof.split('.')
  let h: any, pl: any
  try { h = dec(p[0]); pl = dec(p[1]) } catch { return fail('DPOP_INVALID', 'DPoP proof cannot be decoded.', 'dpop', 'DPoP proof present and well formed') }
  if (h.typ !== 'dpop+jwt' || h.alg !== 'ES256' || !h.jwk) return fail('DPOP_INVALID', 'DPoP proof must be an ES256 dpop+jwt carrying a jwk.', 'dpop', 'DPoP proof present and well formed')
  let ok = false
  try { ok = nodeVerify('sha256', Buffer.from(`${p[0]}.${p[1]}`), { key: createPublicKey({ key: { kty: h.jwk.kty, crv: h.jwk.crv, x: h.jwk.x, y: h.jwk.y }, format: 'jwk' }), dsaEncoding: 'ieee-p1363' }, Buffer.from(p[2], 'base64url')) } catch { ok = false }
  if (!ok) return fail('DPOP_INVALID', 'DPoP proof signature is invalid.', 'dpop', 'DPoP proof present and well formed')
  trace.push({ id: 'dpop', label: 'DPoP proof present and well formed', ok: true })
  if (pl.htm !== method) return fail('DPOP_HTM_MISMATCH', `Proof is for ${pl.htm}, request is ${method}.`, 'htu', 'Proof matches this method and URL (htm, htu)')
  if (pl.htu !== url) return fail('DPOP_HTU_MISMATCH', `Proof is for ${pl.htu}, request is ${url}.`, 'htu', 'Proof matches this method and URL (htm, htu)')
  trace.push({ id: 'htu', label: 'Proof matches this method and URL (htm, htu)', ok: true })
  if (Math.abs(Date.now() / 1000 - pl.iat) > 120) return fail('DPOP_STALE', 'Proof is older than 120 seconds.', 'iat', 'Proof is fresh (iat within 120 s)')
  trace.push({ id: 'iat', label: 'Proof is fresh (iat within 120 s)', ok: true })
  if (!pl.jti || !remember(pl.jti)) return fail('DPOP_REPLAY', 'This proof was already used. Each request needs a new one.', 'jti', 'Proof has not been used before (jti)')
  trace.push({ id: 'jti', label: 'Proof has not been used before (jti)', ok: true })
  if (accessToken) {
    const ath = createHash('sha256').update(accessToken).digest('base64url')
    if (pl.ath !== ath) return fail('DPOP_ATH_MISMATCH', 'Proof was made for a different access token.', 'ath', 'Proof is bound to this access token (ath)')
    trace.push({ id: 'ath', label: 'Proof is bound to this access token (ath)', ok: true })
  }
  const jkt = jwkThumbprint(h.jwk)
  if (cnfJkt !== undefined && cnfJkt !== jkt) return fail('DPOP_KEY_MISMATCH', 'Token is bound to a different key than the one that signed this proof (cnf.jkt).', 'cnf', 'Proof key matches the key the token is bound to (cnf.jkt)')
  if (cnfJkt !== undefined) trace.push({ id: 'cnf', label: 'Proof key matches the key the token is bound to (cnf.jkt)', ok: true })
  return { jkt, jwk: h.jwk as { kty: string; crv: string; x: string; y: string } }
}

// ---------- the "TideCloak server" side: token endpoint ----------
const refreshStore = new Map<string, { username: string; jkt: string; exp: number }>()

function mint(username: string, jkt: string) {
  const u = dirUser(username)!
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: ISSUER, sub: subjectUuid(u.username), azp: adapter().resource, typ: 'Bearer', iat: now, exp: now + ACCESS_TTL, jti: randomBytes(12).toString('hex'),
    preferred_username: u.username, name: u.name,
    realm_access: { roles: u.realmRoles },
    resource_access: Object.fromEntries(Object.entries(u.clientRoles).map(([c, roles]) => [c, { roles }])),
    groups: u.groups, tideuserkey: tideUserKey(u.username), vuid: vuid(u.username),
    ...(u.citizenRef ? { citizen_ref: u.citizenRef } : {}),
    cnf: { jkt },
  }
  const access = signCompact(payload, 'access token (VVK threshold signature)', username)
  const refresh = randomBytes(24).toString('base64url')
  refreshStore.set(refresh, { username, jkt, exp: Date.now() + 30 * 60_000 })
  return { access_token: access, refresh_token: refresh, token_type: 'DPoP', expires_in: ACCESS_TTL }
}

export function tokenEndpoint(body: { grant_type?: string; username?: string; password?: string; refresh_token?: string }, proof: string | null, url: string) {
  const { jkt } = verifyDPoP(proof, 'POST', url)
  if (body.grant_type === 'refresh_token') {
    const r = body.refresh_token ? refreshStore.get(body.refresh_token) : undefined
    if (!r || r.exp < Date.now()) throw new AuthError('INVALID_GRANT', 'Refresh token is invalid or expired.')
    if (r.jkt !== jkt) throw new AuthError('DPOP_KEY_MISMATCH', 'Refresh token is bound to a different key.')
    refreshStore.delete(body.refresh_token!)
    return { ...mint(r.username, jkt), ork: { votes: [], note: 'refresh: no password check' } }
  }
  const username = String(body.username ?? '')
  if (!dirUser(username)) { verifyPassword('unknown', 'x'); throw new AuthError('INVALID_CREDENTIALS', 'Invalid username or password.') }
  const pw = verifyPassword(username, String(body.password ?? ''))
  if (!pw.ok) throw new AuthError('INVALID_CREDENTIALS', 'Invalid username or password.')
  return { ...mint(username, jkt), ork: { votes: pw.votes } }
}
