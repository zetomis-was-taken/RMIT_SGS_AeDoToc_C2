import { createHash } from 'node:crypto'

// The simulated realm's user directory. In real TideCloak these live in the realm; the app only ever sees them as token claims.
export const REALM = 'consent-quorum'
export const CLIENT_ID = 'consent-quorum-app'
export const AUTH_SERVER = 'http://localhost:8080'
export const ISSUER = `${AUTH_SERVER}/realms/${REALM}`
export const DEMO_PASSWORD = 'demo'

export type Role = 'officer' | 'supervisor' | 'admin' | 'citizen' | 'agency_b'

export interface DirUser {
  username: string
  name: string
  role: Role
  realmRoles: string[]
  clientRoles: Record<string, string[]>
  groups: string[]
  citizenRef?: string
}

const ADMIN_ROLE = { 'realm-management': ['tide-realm-admin'] }
const base = ['_tide_enabled', 'offline_access']

export const DIRECTORY: DirUser[] = [
  { username: 'officer_an', name: 'An (Officer, Agency A)', role: 'officer', realmRoles: [...base, 'officer', '_tide_decryptor'], clientRoles: {}, groups: ['/agency-a/officers'] },
  { username: 'officer_binh', name: 'Binh (Officer, Agency A)', role: 'officer', realmRoles: [...base, 'officer', '_tide_decryptor'], clientRoles: {}, groups: ['/agency-a/officers'] },
  { username: 'supervisor_chi', name: 'Chi (Supervisor, Agency A)', role: 'supervisor', realmRoles: [...base, 'supervisor'], clientRoles: ADMIN_ROLE, groups: ['/agency-a/supervisors'] },
  { username: 'supervisor_minh', name: 'Minh (Supervisor, Agency A)', role: 'supervisor', realmRoles: [...base, 'supervisor'], clientRoles: ADMIN_ROLE, groups: ['/agency-a/supervisors'] },
  { username: 'supervisor_phong', name: 'Phong (Supervisor, Agency A)', role: 'supervisor', realmRoles: [...base, 'supervisor'], clientRoles: ADMIN_ROLE, groups: ['/agency-a/supervisors'] },
  { username: 'admin_dung', name: 'Dung (System Admin)', role: 'admin', realmRoles: [...base, 'app-admin'], clientRoles: { 'realm-management': ['manage-users'] }, groups: ['/platform/admins'] },
  { username: 'cz_hoa', name: 'Hoa (Citizen)', role: 'citizen', realmRoles: [...base, 'citizen', '_tide_decryptor'], clientRoles: {}, groups: ['/citizens'], citizenRef: 'cz-hoa' },
  { username: 'cz_nam', name: 'Nam (Citizen)', role: 'citizen', realmRoles: [...base, 'citizen', '_tide_decryptor'], clientRoles: {}, groups: ['/citizens'], citizenRef: 'cz-nam' },
  { username: 'agencyb_lan', name: 'Lan (Officer, Agency B)', role: 'agency_b', realmRoles: [...base, 'agency-b'], clientRoles: {}, groups: ['/agency-b'] },
]

const h = (s: string) => createHash('sha256').update(s).digest()
// shaped like the real claims: tideuserkey identifies the user to the ORKs, vuid is the vendor-scoped id
export const tideUserKey = (username: string) => h('tideuserkey:' + username).toString('base64url')
export const vuid = (username: string) => h('vuid:' + username).toString('hex').slice(0, 32)
export const subjectUuid = (username: string) => {
  const x = h('sub:' + username).toString('hex')
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20, 32)}`
}

export const dirUser = (username: string) => DIRECTORY.find(u => u.username === username)
export const byKey = (key: string) => DIRECTORY.find(u => tideUserKey(u.username) === key)
export const realmAdmins = () => DIRECTORY.filter(u => u.clientRoles['realm-management']?.includes('tide-realm-admin'))

// IGA quorum, as documented by Tide: max(1, floor(TotalAdmins * 0.7)). Not configurable by the app.
export const iga = () => {
  const n = realmAdmins().length
  return { admins: n, threshold: Math.max(1, Math.floor(n * 0.7)) }
}
