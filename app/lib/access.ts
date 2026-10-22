// Which pages each role may open. The UI uses this to build the menu and show "restricted" pages;
// the API enforces the same rules again on the server, so editing client state gets you nothing.
export type PageId = 'overview' | 'cases' | 'requests' | 'policy' | 'audit' | 'lab' | 'demo'

export const PAGE_ROLES: Record<PageId, string[]> = {
  overview: ['officer', 'supervisor', 'admin', 'citizen', 'agency_b'],
  cases: ['officer', 'supervisor', 'admin', 'citizen', 'agency_b'],
  requests: ['officer', 'supervisor', 'citizen', 'agency_b'],
  policy: ['supervisor', 'admin'],
  audit: ['officer', 'supervisor', 'admin', 'citizen', 'agency_b'],
  lab: ['officer', 'supervisor', 'admin', 'citizen', 'agency_b'],
  demo: ['officer', 'supervisor', 'admin', 'citizen', 'agency_b'],
}
export const canOpen = (role: string, page: PageId) => PAGE_ROLES[page].includes(role)

export const PAGE_WHY: Partial<Record<PageId, Record<string, string>>> = {
  requests: { admin: 'Admins take no part in consent. Letting them see requests would make them part of the approval chain.' },
  policy: {
    officer: 'Assignments are policy. Only supervisors approve changes and only admins propose them.',
    citizen: 'Policy changes are an internal matter between admins and supervisors.',
    agency_b: 'Agency B receives answers, never the rules of another agency.',
  },
}
