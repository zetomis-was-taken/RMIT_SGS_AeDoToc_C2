/**
 * SIMULATED Tide Cybersecurity Fabric (ORK network). There is no real network behind this file.
 *
 * What it reproduces from TideCloak/Tide (shapes and rules documented by Tide's MCP):
 *   - 3 ORKs, threshold 2: every key exists only as Shamir shares, one share per ORK, each in its own file.
 *   - password verification, token signing and decryption all need >= 2 ORKs online.
 *   - encrypt/decrypt run a contract on every ORK: RelationshipAttestation:1 (built into the ORK in real Tide)
 *     and ConsentQuorum:1 (a custom Forseti contract: in real Tide the Tide team reviews and deploys those).
 *
 * What it does NOT reproduce: keys are reconstructed transiently inside this process to do the maths. Real Tide
 * never assembles a key (invariant I-01). Treat this module as the thing that is replaced by @tidecloak/nextjs.
 */
import {
  createCipheriv, createDecipheriv, createHash, createHmac, createPrivateKey, createPublicKey,
  generateKeyPairSync, randomBytes, sign as nodeSign, verify as nodeVerify, timingSafeEqual,
} from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { combine, split, type Share } from './shamir'
import { AUTH_SERVER, DEMO_PASSWORD, DIRECTORY, REALM, CLIENT_ID } from './directory'

export const N = 3
export const T = 2
const DIR = path.join(process.cwd(), 'data', 'tide-sim')
const b64u = (b: Buffer | string) => Buffer.from(b).toString('base64url')
const fromB64u = (s: string) => Buffer.from(s, 'base64url')

interface OrkState { id: number; vvkShare: Share; cvkShare: Share; pwSecret: string; verifiers: Record<string, string> }
export interface Adapter {
  realm: string; 'auth-server-url': string; 'ssl-required': string; resource: string; 'public-client': boolean
  vendorId: string; homeOrkUrl: string; jwk: { keys: (JsonWebKey & { kid: string; alg: string; use: string })[] }
}
export interface Op { at: number; op: string; contract: string; who: string; tag: string; votes: { ork: number; ok: boolean }[]; result: 'allowed' | 'refused' | 'threshold-failure'; msg: string }

interface Sim { orks: OrkState[]; online: boolean[]; adapter: Adapter; ops: Op[] }
const g = globalThis as unknown as { __tideSim?: Sim }

export class OrkError extends Error {
  code: 'CONTRACT_REFUSED' | 'THRESHOLD_FAILURE'
  constructor(code: OrkError['code'], msg: string) { super(msg); this.code = code }
}

function bootstrap(): Sim {
  mkdirSync(DIR, { recursive: true })
  const adapterFile = path.join(DIR, 'tidecloak.sim.json')
  const files = Array.from({ length: N }, (_, i) => path.join(DIR, `ork-${i + 1}.json`))
  if (!existsSync(adapterFile) || files.some(f => !existsSync(f))) {
    // simulates setUpTideRealm: generate the vendor key (VVK) and the cell key (CVK), hand one share of each to every ORK
    const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' })
    const jwk = privateKey.export({ format: 'jwk' }) as JsonWebKey
    const vvkShares = split(fromB64u(jwk.d!), N, T)
    const cvkShares = split(randomBytes(32), N, T)
    const thumb = createHash('sha256').update(JSON.stringify({ crv: jwk.crv, kty: jwk.kty, x: jwk.x, y: jwk.y })).digest('base64url')
    const adapter: Adapter = {
      realm: REALM, 'auth-server-url': AUTH_SERVER, 'ssl-required': 'none', resource: CLIENT_ID, 'public-client': true,
      vendorId: 'sim-vendor-' + thumb.slice(0, 10), homeOrkUrl: 'http://sim-ork-1.local',
      jwk: { keys: [{ kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y, kid: thumb.slice(0, 16), alg: 'ES256', use: 'sig' }] },
    }
    writeFileSync(adapterFile, JSON.stringify(adapter, null, 2))
    files.forEach((f, i) => {
      const pwSecret = randomBytes(32).toString('hex')
      const verifiers: Record<string, string> = {}
      for (const u of DIRECTORY) verifiers[u.username] = createHmac('sha256', pwSecret).update(`${u.username}:${DEMO_PASSWORD}`).digest('hex')
      const st: OrkState = { id: i + 1, vvkShare: vvkShares[i], cvkShare: cvkShares[i], pwSecret, verifiers }
      writeFileSync(f, JSON.stringify(st), { mode: 0o600 })
    })
  }
  return {
    orks: files.map(f => JSON.parse(readFileSync(f, 'utf8')) as OrkState),
    online: Array(N).fill(true),
    adapter: JSON.parse(readFileSync(adapterFile, 'utf8')) as Adapter,
    ops: [],
  }
}
const sim = (): Sim => (g.__tideSim ??= bootstrap())

export const adapter = () => sim().adapter
export const status = () => ({ n: N, t: T, orks: sim().online.map((on, i) => ({ id: i + 1, online: on })), ops: [...sim().ops].reverse() })
export function setOnline(id: number, on: boolean) { if (id >= 1 && id <= N) sim().online[id - 1] = on }
export function resetNetwork() { sim().online.fill(true); sim().ops.length = 0 }
const log = (o: Omit<Op, 'at'>) => { const s = sim(); s.ops.push({ at: Date.now(), ...o }); if (s.ops.length > 40) s.ops.shift() }

function up() {
  const s = sim()
  const online = s.orks.filter(o => s.online[o.id - 1])
  if (online.length < T) throw new OrkError('THRESHOLD_FAILURE', `TIDE-TIDEJS-NET-THRESHOLD_FAILURE: Could not reach enough VVK ORKs (got ${online.length} of ${T} required)`)
  return online
}

// ---------- password: each ORK verifies on its own; no password hash exists anywhere in the app ----------
export function verifyPassword(username: string, password: string) {
  const s = sim()
  let online: OrkState[]
  try { online = up() } catch (e) { log({ op: 'password', contract: 'PRISM', who: username, tag: '-', votes: [], result: 'threshold-failure', msg: (e as Error).message }); throw e }
  const votes = online.map(o => {
    const want = o.verifiers[username]
    const got = createHmac('sha256', o.pwSecret).update(`${username}:${password}`).digest('hex')
    return { ork: o.id, ok: !!want && want.length === got.length && timingSafeEqual(Buffer.from(want), Buffer.from(got)) }
  })
  const ok = votes.filter(v => v.ok).length >= T
  log({ op: 'password', contract: 'PRISM', who: username, tag: '-', votes, result: ok ? 'allowed' : 'refused', msg: ok ? `${votes.filter(v => v.ok).length} of ${s.orks.length} ORKs verified the password` : 'threshold password check failed' })
  return { ok, votes }
}

// ---------- threshold signing (VVK) ----------
function vvkPrivate(online: OrkState[]) {
  const d = combine(online.slice(0, T).map(o => o.vvkShare))
  const pub = sim().adapter.jwk.keys[0]
  return createPrivateKey({ key: { kty: 'EC', crv: 'P-256', x: pub.x, y: pub.y, d: b64u(d) }, format: 'jwk' })
}
export function thresholdSign(data: Buffer, purpose: string, who = 'system'): Buffer {
  let online: OrkState[]
  try { online = up() } catch (e) { log({ op: 'sign', contract: purpose, who, tag: '-', votes: [], result: 'threshold-failure', msg: (e as Error).message }); throw e }
  const sig = nodeSign('sha256', data, { key: vvkPrivate(online), dsaEncoding: 'ieee-p1363' })
  log({ op: 'sign', contract: purpose, who, tag: '-', votes: online.map(o => ({ ork: o.id, ok: true })), result: 'allowed', msg: `${online.length} partial signatures combined` })
  return sig
}
const vvkPublic = () => { const k = sim().adapter.jwk.keys[0]; return createPublicKey({ key: { kty: k.kty, crv: k.crv, x: k.x, y: k.y }, format: 'jwk' }) }
export const verifyVvk = (data: Buffer, sig: Buffer) => { try { return nodeVerify('sha256', data, { key: vvkPublic(), dsaEncoding: 'ieee-p1363' }, sig) } catch { return false } }

export function signCompact(payload: Record<string, unknown>, purpose: string, who: string, typ = 'JWT') {
  const header = { alg: 'ES256', typ, kid: sim().adapter.jwk.keys[0].kid }
  const body = `${b64u(JSON.stringify(header))}.${b64u(JSON.stringify(payload))}`
  return `${body}.${b64u(thresholdSign(Buffer.from(body), purpose, who))}`
}
export function verifyCompact(token: string): Record<string, any> | null {
  const [h, p, s] = token.split('.')
  if (!h || !p || !s || !verifyVvk(Buffer.from(`${h}.${p}`), fromB64u(s))) return null
  try { return JSON.parse(fromB64u(p).toString('utf8')) } catch { return null }
}

// ---------- policies (RelationshipAttestation:1) ----------
export interface Policy {
  contract: 'RelationshipAttestation:1'
  models: ['PolicyEnabledEncryption:1', 'PolicyEnabledDecryption:1']
  approval: 'IMPLICIT'; execution: 'PRIVATE'; keyId: string
  params: { subjectType: 'User' | 'Group' | 'Role'; subjectId: string; assignmentId: string; roles: string; clientId?: string }
  iat: number; expiresAt?: number; approvedBy: string[]; sig?: string
}
const policyBody = (p: Policy) => Buffer.from(JSON.stringify({ ...p, sig: undefined }))
export function signPolicy(p: Omit<Policy, 'sig' | 'keyId'>, who: string): Policy {
  const full = { ...p, keyId: sim().adapter.vendorId } as Policy
  return { ...full, sig: b64u(thresholdSign(policyBody(full), 'RelationshipAttestation:1 policy', who)) }
}
export const verifyPolicy = (p: Policy) => !!p.sig && p.keyId === sim().adapter.vendorId && verifyVvk(policyBody(p), fromB64u(p.sig))

export interface Caller { username: string; tideuserkey: string; realmRoles: string[]; clientRoles: Record<string, string[]>; groups: string[] }

/** Mirrors the checks Tide documents for RelationshipAttestation:1. Returns the refusal message, or null if allowed. */
export function evaluateRelationship(policy: Policy | undefined, c: Caller, tag: string, op: 'decrypt' | 'encrypt' = 'decrypt'): string | null {
  if (!policy) return 'No relationship policy names this caller for this record.'
  if (!verifyPolicy(policy)) return 'Policy signature is not valid.'
  if (policy.expiresAt && policy.expiresAt < Date.now()) return 'Policy has expired.'
  const p = policy.params
  if (p.assignmentId !== tag) return 'Tags do not contain assignmentId.'
  if (p.subjectType === 'User' && p.subjectId !== c.tideuserkey) return `subjectId does not match. ${c.tideuserkey.slice(0, 10)}… <> ${p.subjectId.slice(0, 10)}…`
  if (p.subjectType === 'Group' && !c.groups.includes(p.subjectId)) return `'${p.subjectId}' group not found in doken.`
  if (p.subjectType === 'Role') {
    const has = p.clientId ? c.clientRoles[p.clientId]?.includes(p.subjectId) : c.realmRoles.includes(p.subjectId)
    if (!has) return `'${p.subjectId}' role not found in doken.`
  }
  const need = op === 'decrypt' ? '_tide_decryptor' : '_tide_encryptor'
  if (!(JSON.parse(p.roles) as string[]).includes(need)) return `${need} not found in list of roles.`
  if (!c.realmRoles.includes(need)) return `'${need}' role not found for this ${op === 'decrypt' ? 'decryption' : 'encryption'} request.`
  return null
}

// ---------- consent attestation (ConsentQuorum:1, a custom Forseti contract in real Tide) ----------
export interface ConsentClaims { typ: 'consent-quorum'; case: string; kind: string; sub: string; approvals: { role: string; key: string }[]; iat: number; exp: number }
export function issueConsent(c: Omit<ConsentClaims, 'typ'>) { return signCompact({ typ: 'consent-quorum', ...c }, 'ConsentQuorum:1 attestation', 'orks', 'consent+jwt') }
export function evaluateConsent(att: string | null | undefined, c: Caller, tag: string, kind: string): string | null {
  if (!att) return 'Consent attestation missing.'
  const cl = verifyCompact(att) as ConsentClaims | null
  if (!cl || cl.typ !== 'consent-quorum') return 'Consent attestation signature is not valid.'
  if (cl.exp < Date.now()) return 'Consent attestation expired.'
  if (cl.case !== tag) return 'Consent attestation is for another record.'
  if (cl.kind !== kind) return 'Consent attestation is for another purpose.'
  if (cl.sub !== c.tideuserkey) return 'Consent attestation was issued to another caller.'
  const roles = new Set(cl.approvals.map(a => a.role)), keys = new Set(cl.approvals.map(a => a.key))
  if (!roles.has('supervisor') || !roles.has('citizen') || keys.size < 2 || keys.has(cl.sub)) return 'Consent quorum incomplete: needs supervisor and citizen approvals.'
  return null
}

// ---------- field encryption (CVK), tag-bound ----------
function cvk(online: OrkState[]) { return combine(online.slice(0, T).map(o => o.cvkShare)) }
export function encryptField(plain: string, tag: string): string {
  const online = up()
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', cvk(online), iv)
  c.setAAD(Buffer.from(tag))
  const ct = Buffer.concat([c.update(plain, 'utf8'), c.final()])
  return `tide:v1:${Buffer.concat([iv, c.getAuthTag(), ct]).toString('base64')}`
}
function decryptRaw(blob: string, tag: string, online: OrkState[]): string {
  const raw = Buffer.from(blob.replace('tide:v1:', ''), 'base64')
  const d = createDecipheriv('aes-256-gcm', cvk(online), raw.subarray(0, 12))
  d.setAAD(Buffer.from(tag))
  d.setAuthTag(raw.subarray(12, 28))
  return Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString('utf8')
}

export interface Ctx { caller: Caller; policy?: Policy; consent?: { attestation: string | null; kind: string } }
function runContract(op: string, contract: string, tag: string, ctx: Ctx): OrkState[] {
  let online: OrkState[]
  try { online = up() } catch (e) { log({ op, contract, who: ctx.caller.username, tag, votes: [], result: 'threshold-failure', msg: (e as Error).message }); throw e }
  // every online ORK evaluates the same contract independently
  const err = evaluateRelationship(ctx.policy, ctx.caller, tag) ?? (ctx.consent ? evaluateConsent(ctx.consent.attestation, ctx.caller, tag, ctx.consent.kind) : null)
  const votes = online.map(o => ({ ork: o.id, ok: !err }))
  if (err) { log({ op, contract, who: ctx.caller.username, tag, votes, result: 'refused', msg: err }); throw new OrkError('CONTRACT_REFUSED', err) }
  log({ op, contract, who: ctx.caller.username, tag, votes, result: 'allowed', msg: `${online.length} of ${N} ORKs ran the contract and agreed` })
  return online
}
export function decryptFields(blobs: Record<string, string>, tag: string, ctx: Ctx): Record<string, string> {
  const online = runContract('decrypt', ctx.consent ? 'ConsentQuorum:1 + RelationshipAttestation:1' : 'RelationshipAttestation:1', tag, ctx)
  return Object.fromEntries(Object.entries(blobs).map(([k, v]) => [k, decryptRaw(v, tag, online)]))
}
/** Purpose-bound evaluation: the ORKs answer a yes/no and never release the number. */
export function evaluateEligibility(incomeBlob: string, tag: string, limit: number, ctx: Ctx & { consent: NonNullable<Ctx['consent']> }) {
  let online: OrkState[]
  try { online = up() } catch (e) { log({ op: 'evaluate', contract: 'EligibilityAttestation:1', who: ctx.caller.username, tag, votes: [], result: 'threshold-failure', msg: (e as Error).message }); throw e }
  const err = evaluateConsent(ctx.consent.attestation, ctx.caller, tag, ctx.consent.kind)
  const votes = online.map(o => ({ ork: o.id, ok: !err }))
  if (err) { log({ op: 'evaluate', contract: 'EligibilityAttestation:1', who: ctx.caller.username, tag, votes, result: 'refused', msg: err }); throw new OrkError('CONTRACT_REFUSED', err) }
  const eligible = Number(decryptRaw(incomeBlob, tag, online)) <= limit
  log({ op: 'evaluate', contract: 'EligibilityAttestation:1', who: ctx.caller.username, tag, votes, result: 'allowed', msg: 'released a boolean, not the income' })
  return eligible
}

/** Attack demo: an operator who obtains ONE ORK's key share. A single share is not a key, so decryption fails. */
export function singleShareAttack(blob: string, tag: string) {
  const share = sim().orks[0].cvkShare
  const key = combine([share]).subarray(-32)
  try {
    const raw = Buffer.from(blob.replace('tide:v1:', ''), 'base64')
    const d = createDecipheriv('aes-256-gcm', key, raw.subarray(0, 12))
    d.setAAD(Buffer.from(tag)); d.setAuthTag(raw.subarray(12, 28))
    Buffer.concat([d.update(raw.subarray(28)), d.final()])
    return { ok: true, shareHead: share.y.slice(0, 18) }
  } catch { return { ok: false, shareHead: share.y.slice(0, 18) } }
}
