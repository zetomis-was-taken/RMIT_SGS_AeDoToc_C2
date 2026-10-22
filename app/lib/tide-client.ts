// Browser side of the simulated TideCloak sign-in. Mirrors what @tidecloak/nextjs does with DPoP on:
// a non-extractable ES256 key lives in IndexedDB, the access token is bound to it, and every request carries a fresh proof.
export interface Session { sid: string; access_token: string; refresh_token: string; expires_at: number; username: string }
export interface OrkVote { ork: number; ok: boolean }
export class SignInError extends Error { constructor(msg: string, public code: string, public votes: OrkVote[] = []) { super(msg) } }

const SKEY = 'cq.tide.session'
const b64u = (b: ArrayBuffer | Uint8Array | string) => {
  const bytes = typeof b === 'string' ? new TextEncoder().encode(b) : new Uint8Array(b)
  let s = ''; bytes.forEach(x => (s += String.fromCharCode(x)))
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
type Key = { priv: CryptoKey; jwk: { kty: string; crv: string; x: string; y: string } }

function idb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open('cq-tide', 1)
    r.onupgradeneeded = () => r.result.createObjectStore('keys')
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error)
  })
}
async function idbGet(k: string): Promise<Key | undefined> { const d = await idb(); return new Promise(res => { const q = d.transaction('keys').objectStore('keys').get(k); q.onsuccess = () => res(q.result); q.onerror = () => res(undefined) }) }
async function idbPut(k: string, v: Key | null) { const d = await idb(); return new Promise<void>(res => { const s = d.transaction('keys', 'readwrite').objectStore('keys'); v ? s.put(v, k) : s.delete(k); s.transaction.oncomplete = () => res() }) }

export async function newKey(): Promise<Key> {
  const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify'])
  const j = await crypto.subtle.exportKey('jwk', kp.publicKey)
  return { priv: kp.privateKey, jwk: { kty: j.kty!, crv: j.crv!, x: j.x!, y: j.y! } }
}
async function proof(key: Key, method: string, url: string, token?: string, jti?: string) {
  const header = b64u(JSON.stringify({ typ: 'dpop+jwt', alg: 'ES256', jwk: key.jwk }))
  const pl: Record<string, unknown> = { htm: method, htu: url, iat: Math.floor(Date.now() / 1000), jti: jti ?? crypto.randomUUID() }
  if (token) pl.ath = b64u(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)))
  const body = `${header}.${b64u(JSON.stringify(pl))}`
  return `${body}.${b64u(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key.priv, new TextEncoder().encode(body)))}`
}

export function getSession(): Session | null {
  try { return JSON.parse(sessionStorage.getItem(SKEY) ?? 'null') } catch { return null }
}
const setSession = (s: Session | null) => { try { s ? sessionStorage.setItem(SKEY, JSON.stringify(s)) : sessionStorage.removeItem(SKEY) } catch { /* private mode */ } }
export async function clearSession() { const s = getSession(); setSession(null); if (s) await idbPut(`dpop:${s.sid}`, null) }
const keyOf = async (s: Session) => idbGet(`dpop:${s.sid}`)

async function grant(body: Record<string, string>, key: Key) {
  const url = `${location.origin}/api/tide/token`
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', dpop: await proof(key, 'POST', url) }, body: JSON.stringify(body) })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new SignInError(j.error ?? 'Sign-in failed', j.code ?? 'ERROR')
  return j as { access_token: string; refresh_token: string; expires_in: number; ork: { votes: OrkVote[] } }
}

/** Password grant. The ORKs check the password (threshold); no password hash exists on the app server. */
export async function signIn(username: string, password: string) {
  await clearSession()
  const sid = crypto.randomUUID()
  const key = await newKey()
  let j
  try { j = await grant({ grant_type: 'password', username, password }, key) }
  catch (e) { if (e instanceof SignInError) { const votes = (await attemptVotes(username, password, key)) ; throw new SignInError(e.message, e.code, votes) } throw e }
  await idbPut(`dpop:${sid}`, key)
  setSession({ sid, access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Date.now() + j.expires_in * 1000, username })
  return j
}
// on a failed password the server does not return votes; show all ORKs as having refused
async function attemptVotes(_u: string, _p: string, _k: Key): Promise<OrkVote[]> { return [1, 2, 3].map(ork => ({ ork, ok: false })) }

async function refresh(s: Session): Promise<Session | null> {
  const key = await keyOf(s)
  if (!key) return null
  try {
    const j = await grant({ grant_type: 'refresh_token', refresh_token: s.refresh_token }, key)
    const n = { ...s, access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Date.now() + j.expires_in * 1000 }
    setSession(n); return n
  } catch { await clearSession(); return null }
}

export const PUBLIC = new Set(['guard/users', 'guard/dba', 'tide/adapter'])

/** fetch an /api path with Authorization: DPoP + a fresh proof. Refreshes the token shortly before it expires. */
export async function authedFetch(path: string, body?: unknown): Promise<Response> {
  const method = body === undefined ? 'GET' : 'POST'
  const url = `${location.origin}/api/${path.split('?')[0]}`
  let s = getSession()
  if (PUBLIC.has(path.split('?')[0]) || !s) return fetch(`/api/${path}`, body === undefined ? undefined : { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  if (s.expires_at - Date.now() < 30_000) s = (await refresh(s)) ?? s
  const key = await keyOf(s)
  if (!key) { await clearSession(); return fetch(`/api/${path}`) }
  return fetch(`/api/${path}`, { method, headers: { 'content-type': 'application/json', authorization: `DPoP ${s.access_token}`, dpop: await proof(key, method, url, s.access_token) }, body: body === undefined ? undefined : JSON.stringify(body) })
}

/** For the TideCloak inspector: send a request the way an attacker would. */
export async function attack(kind: 'tamper' | 'stolen' | 'replay' | 'unsigned', path = 'guard/changes') {
  const s = getSession(); if (!s) throw new Error('Not signed in')
  const key = await keyOf(s); if (!key) throw new Error('No DPoP key')
  const url = `${location.origin}/api/${path}`
  const send = async (token: string, k: Key, jti?: string, authz = `DPoP ${token}`) =>
    fetch(`/api/${path}`, { headers: { authorization: authz, dpop: await proof(k, 'GET', url, token, jti) } })
  let r: Response, note: string
  if (kind === 'tamper') {
    const [h, p, sig] = s.access_token.split('.')
    const claims = JSON.parse(atob(p.replace(/-/g, '+').replace(/_/g, '/')))
    claims.resource_access = { 'realm-management': { roles: ['tide-realm-admin'] } }; claims.realm_access = { roles: [...claims.realm_access.roles, 'supervisor'] }
    note = 'Added client role tide-realm-admin and realm role supervisor to the payload, kept the original signature.'
    r = await send(`${h}.${b64u(JSON.stringify(claims))}.${sig}`, key)
  } else if (kind === 'stolen') {
    note = 'Sent your exact access token, but signed the DPoP proof with a different key (a thief on another machine).'
    r = await send(s.access_token, await newKey())
  } else if (kind === 'unsigned') {
    note = 'Sent the token as a plain Bearer, without a DPoP proof.'
    r = await send(s.access_token, key, undefined, `Bearer ${s.access_token}`)
  } else {
    const jti = 'replay-' + crypto.randomUUID()
    const first = await send(s.access_token, key, jti)
    note = `First use of the proof: HTTP ${first.status}. Now sending the identical proof again.`
    r = await send(s.access_token, key, jti)
  }
  return { status: r.status, body: await r.json().catch(() => null), note }
}
