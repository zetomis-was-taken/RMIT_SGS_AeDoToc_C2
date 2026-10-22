import { cookies } from 'next/headers'
import { sign, unsign } from './crypto'

export type Role = 'officer' | 'supervisor' | 'admin' | 'citizen' | 'agency_b'
export interface User { id: string; name: string; role: Role; citizenId?: string }

// Demo identities. With TideCloak enabled these come from the verified token
// (roles + vuid) instead of a signed cookie; the rest of the app only sees `User`.
export const USERS: User[] = [
  { id: 'officer_an', name: 'An (Officer, Agency A)', role: 'officer' },
  { id: 'officer_binh', name: 'Binh (Officer, Agency A)', role: 'officer' },
  { id: 'supervisor_chi', name: 'Chi (Supervisor, Agency A)', role: 'supervisor' },
  { id: 'supervisor_minh', name: 'Minh (Supervisor, Agency A)', role: 'supervisor' },
  { id: 'admin_dung', name: 'Dung (System Admin)', role: 'admin' },
  { id: 'cz_hoa', name: 'Hoa (Citizen)', role: 'citizen', citizenId: 'cz-hoa' },
  { id: 'cz_nam', name: 'Nam (Citizen)', role: 'citizen', citizenId: 'cz-nam' },
  { id: 'cz_lien', name: 'Lien (Citizen)', role: 'citizen', citizenId: 'cz-lien' },
  { id: 'cz_tuan', name: 'Tuan (Citizen)', role: 'citizen', citizenId: 'cz-tuan' },
  { id: 'cz_mai', name: 'Mai (Citizen)', role: 'citizen', citizenId: 'cz-mai' },
  { id: 'cz_son', name: 'Son (Citizen)', role: 'citizen', citizenId: 'cz-son' },
  { id: 'agencyb_lan', name: 'Lan (Officer, Agency B)', role: 'agency_b' },
]

export const userById = (id: string) => USERS.find(u => u.id === id)

export const COOKIE = 'cg_session'
export const makeSession = (userId: string) => sign(userId)

export async function currentUser(): Promise<User | null> {
  const jar = await cookies()
  const id = unsign(jar.get(COOKIE)?.value)
  return id ? userById(id) ?? null : null
}
