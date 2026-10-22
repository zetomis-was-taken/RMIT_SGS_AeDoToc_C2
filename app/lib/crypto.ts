import { createHash } from 'node:crypto'

export const sha = (s: string) => createHash('sha256').update(s).digest('hex')
