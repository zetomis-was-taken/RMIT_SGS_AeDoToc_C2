import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

// DEV KEY PROVIDER. In the Tide build this key never exists in one place:
// it is held as threshold shares by the Tide fabric, so no single admin can decrypt.
function masterKey(): Buffer {
  const hex = process.env.DEMO_MASTER_KEY
  if (!hex) throw new Error('DEMO_MASTER_KEY missing (see .env.local)')
  return Buffer.from(hex, 'hex')
}

export function encryptField(plain: string): string {
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', masterKey(), iv)
  const ct = Buffer.concat([c.update(plain, 'utf8'), c.final()])
  return `enc:v1:${Buffer.concat([iv, c.getAuthTag(), ct]).toString('base64')}`
}

export function decryptField(blob: string): string {
  const raw = Buffer.from(blob.replace('enc:v1:', ''), 'base64')
  const d = createDecipheriv('aes-256-gcm', masterKey(), raw.subarray(0, 12))
  d.setAuthTag(raw.subarray(12, 28))
  return Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString('utf8')
}

export const sha = (s: string) => createHash('sha256').update(s).digest('hex')

const secret = () => process.env.SESSION_SECRET ?? 'dev-secret'
export function sign(value: string): string {
  return `${value}.${createHmac('sha256', secret()).update(value).digest('hex')}`
}
export function unsign(signed: string | undefined): string | null {
  if (!signed) return null
  const i = signed.lastIndexOf('.')
  if (i < 0) return null
  const value = signed.slice(0, i)
  const want = Buffer.from(sign(value))
  const got = Buffer.from(signed)
  return want.length === got.length && timingSafeEqual(want, got) ? value : null
}
