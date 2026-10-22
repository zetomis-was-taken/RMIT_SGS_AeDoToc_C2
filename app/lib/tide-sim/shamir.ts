import { randomBytes } from 'node:crypto'

// Shamir secret sharing over GF(P), P = 2^521 - 1. Used by the SIMULATED ORK network so that no key is stored whole.
const P = (1n << 521n) - 1n
const toBig = (b: Buffer) => BigInt('0x' + (b.length ? b.toString('hex') : '0'))
const toBuf = (n: bigint, len: number) => Buffer.from(n.toString(16).padStart(len * 2, '0'), 'hex')
const mod = (a: bigint) => ((a % P) + P) % P
function inv(a: bigint): bigint {
  let [r0, r1, s0, s1] = [mod(a), P, 1n, 0n]
  while (r1) { const q = r0 / r1;[r0, r1] = [r1, r0 - q * r1];[s0, s1] = [s1, s0 - q * s1] }
  return mod(s0)
}

export interface Share { x: number; y: string; len: number }

export function split(secret: Buffer, n: number, t: number): Share[] {
  const coef = [toBig(secret), ...Array.from({ length: t - 1 }, () => mod(toBig(randomBytes(66))))]
  return Array.from({ length: n }, (_, i) => {
    const x = BigInt(i + 1)
    let y = 0n
    for (let k = coef.length - 1; k >= 0; k--) y = mod(y * x + coef[k])
    return { x: i + 1, y: y.toString(16), len: secret.length }
  })
}

export function combine(shares: Share[]): Buffer {
  let s = 0n
  for (const a of shares) {
    let num = 1n, den = 1n
    for (const b of shares) if (b.x !== a.x) { num = mod(num * BigInt(-b.x)); den = mod(den * BigInt(a.x - b.x)) }
    s = mod(s + BigInt('0x' + a.y) * num * inv(den))
  }
  return toBuf(s, shares[0].len)
}
