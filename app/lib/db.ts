import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { sha } from './crypto'
import { encryptField, resetNetwork, signPolicy } from './tide-sim/ork'
import { tideUserKey } from './tide-sim/directory'

export const DB_PATH = path.join(process.cwd(), 'data', 'citizen.db')
const SCHEMA = 3
const TABLES = ['citizens', 'cases', 'policies', 'settings', 'access_requests', 'request_votes', 'policy_changes', 'policy_votes', 'audit']

const g = globalThis as unknown as { __db?: DatabaseSync }

export function db(): DatabaseSync {
  if (g.__db) return g.__db
  mkdirSync(path.dirname(DB_PATH), { recursive: true })
  const d = new DatabaseSync(DB_PATH)
  const v = (d.prepare('PRAGMA user_version').get() as { user_version: number }).user_version
  if (v !== SCHEMA) { for (const t of TABLES) d.exec(`DROP TABLE IF EXISTS ${t}`); d.exec(`PRAGMA user_version = ${SCHEMA}`) }
  d.exec(`
    PRAGMA journal_mode = WAL;
    -- sensitive columns hold Tide ciphertext (tide:v1:...), bound to the case id as the single tag
    CREATE TABLE IF NOT EXISTS citizens (
      id TEXT PRIMARY KEY,
      full_name_enc TEXT, national_id_enc TEXT, income_enc TEXT, address_enc TEXT, health_enc TEXT
    );
    CREATE TABLE IF NOT EXISTS cases (
      id TEXT PRIMARY KEY, citizen_id TEXT, kind TEXT, title TEXT, status TEXT
    );
    -- signed RelationshipAttestation:1 policies. A row here means nothing unless its signature verifies.
    CREATE TABLE IF NOT EXISTS policies (
      id INTEGER PRIMARY KEY AUTOINCREMENT, case_id TEXT, subject_type TEXT, subject_id TEXT, subject_name TEXT,
      roles TEXT, policy_json TEXT, source TEXT, created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE IF NOT EXISTS access_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT, case_id TEXT, requester TEXT, kind TEXT, purpose TEXT,
      status TEXT, created_at INTEGER, expires_at INTEGER, attestation TEXT
    );
    CREATE TABLE IF NOT EXISTS request_votes (
      request_id INTEGER, voter TEXT, voter_role TEXT, decision TEXT, at INTEGER, PRIMARY KEY (request_id, voter)
    );
    -- IGA change requests (entity_type/action_type follow Tide's vocabulary)
    CREATE TABLE IF NOT EXISTS policy_changes (
      id INTEGER PRIMARY KEY AUTOINCREMENT, requester TEXT, change TEXT, entity_type TEXT, action_type TEXT,
      payload TEXT, status TEXT, threshold INTEGER, created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS policy_votes (
      change_id INTEGER, voter TEXT, decision TEXT, at INTEGER, PRIMARY KEY (change_id, voter)
    );
    CREATE TABLE IF NOT EXISTS audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER, actor TEXT, action TEXT, target TEXT,
      decision TEXT, detail TEXT, prev_hash TEXT, hash TEXT
    );
  `)
  g.__db = d
  seed(d)
  return d
}

export function resetDb() {
  const d = db()
  for (const t of TABLES) d.exec(`DELETE FROM ${t}`)
  d.exec('DELETE FROM sqlite_sequence')
  resetNetwork()
  seed(d)
}

export function addPolicy(caseId: string, username: string, roles: string[], source: string, approvedBy: string[]) {
  const key = tideUserKey(username)
  const p = signPolicy({
    contract: 'RelationshipAttestation:1', models: ['PolicyEnabledEncryption:1', 'PolicyEnabledDecryption:1'], approval: 'IMPLICIT', execution: 'PRIVATE',
    params: { subjectType: 'User', subjectId: key, assignmentId: caseId, roles: JSON.stringify(roles) }, iat: Date.now(), approvedBy,
  }, approvedBy[0] ?? 'bootstrap')
  db().prepare('INSERT INTO policies (case_id,subject_type,subject_id,subject_name,roles,policy_json,source,created_at) VALUES (?,?,?,?,?,?,?,?)')
    .run(caseId, 'User', key, username, JSON.stringify(roles), JSON.stringify(p), source, Date.now())
}

function seed(d: DatabaseSync) {
  const has = d.prepare('SELECT COUNT(*) AS n FROM citizens').get() as { n: number }
  if (has.n > 0) return
  // [citizen id, case id, name, national id, income, address, health, assigned officer, citizen account]
  const rows: [string, string, string, string, number, string, string, string, string | null][] = [
    ['cz-hoa', 'C-1001', 'Nguyen Thi Hoa', '079190004711', 9_800_000, '12 Le Loi, Q1, TP.HCM', 'Hypertension', 'officer_an', 'cz_hoa'],
    ['cz-nam', 'C-1002', 'Tran Van Nam', '079185009022', 31_000_000, '88 Hai Ba Trung, Q3, TP.HCM', 'None', 'officer_binh', 'cz_nam'],
    ['cz-lien', 'C-1003', 'Pham Thi Lien', '079192001533', 14_500_000, '5 Nguyen Hue, Q1, TP.HCM', 'Diabetes', 'officer_an', null],
    ['cz-minh', 'C-1004', 'Le Quang Minh', '079188003344', 18_200_000, '41 Vo Van Tan, Q3, TP.HCM', 'None', 'officer_binh', null],
    ['cz-thao', 'C-1005', 'Do Thi Thao', '079195007788', 7_400_000, '9 Pasteur, Q1, TP.HCM', 'Asthma', 'officer_an', null],
    ['cz-phuc', 'C-1006', 'Vu Hoang Phuc', '079191005566', 12_900_000, '120 Cach Mang Thang 8, Q10, TP.HCM', 'None', 'officer_binh', null],
    ['cz-yen', 'C-1007', 'Bui Hai Yen', '079193002211', 26_300_000, '3 Nguyen Dinh Chieu, Q1, TP.HCM', 'None', 'officer_an', null],
    ['cz-khoa', 'C-1008', 'Dang Anh Khoa', '079189009900', 11_100_000, '77 Ly Thuong Kiet, Q10, TP.HCM', 'Hypertension', 'officer_binh', null],
  ]
  const ic = d.prepare('INSERT INTO citizens VALUES (?,?,?,?,?,?)')
  const cc = d.prepare('INSERT INTO cases VALUES (?,?,?,?,?)')
  for (const [cid, caseId, name, nid, income, addr, health] of rows) {
    ic.run(cid, encryptField(name, caseId), encryptField(nid, caseId), encryptField(String(income), caseId), encryptField(addr, caseId), encryptField(health, caseId))
    cc.run(caseId, cid, 'housing_subsidy', `Housing subsidy application #${caseId.slice(2)}`, 'open')
  }
  // bootstrap policies: signed at realm setup, standing in for the admin approvals a real realm would have recorded
  for (const [, caseId, , , , , , officer, citizen] of rows) {
    addPolicy(caseId, officer, ['_tide_decryptor'], 'bootstrap', ['bootstrap'])
    if (citizen) addPolicy(caseId, citizen, ['_tide_decryptor'], 'bootstrap', ['bootstrap'])
  }
  d.prepare('INSERT INTO settings VALUES (?,?)').run('income_threshold', '15000000')
}

export function audit(actor: string, action: string, target: string, decision: 'ALLOW' | 'DENY' | 'PENDING' | 'INFO', detail = '') {
  const d = db()
  const last = d.prepare('SELECT hash FROM audit ORDER BY id DESC LIMIT 1').get() as { hash: string } | undefined
  const prev = last?.hash ?? 'GENESIS'
  const at = Date.now()
  const hash = sha(`${prev}|${at}|${actor}|${action}|${target}|${decision}|${detail}`)
  d.prepare('INSERT INTO audit (at,actor,action,target,decision,detail,prev_hash,hash) VALUES (?,?,?,?,?,?,?,?)').run(
    at, actor, action, target, decision, detail, prev, hash,
  )
}
