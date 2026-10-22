import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { encryptField, sha } from './crypto'

export const DB_PATH = path.join(process.cwd(), 'data', 'citizen.db')

const g = globalThis as unknown as { __db?: DatabaseSync }

export function db(): DatabaseSync {
  if (g.__db) return g.__db
  mkdirSync(path.dirname(DB_PATH), { recursive: true })
  const d = new DatabaseSync(DB_PATH)
  d.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS citizens (
      id TEXT PRIMARY KEY,
      full_name_enc TEXT, national_id_enc TEXT, income_enc TEXT, address_enc TEXT, health_enc TEXT
    );
    CREATE TABLE IF NOT EXISTS cases (
      id TEXT PRIMARY KEY, citizen_id TEXT, kind TEXT, title TEXT, status TEXT
    );
    -- effective access policy: who is assigned to which case. Mutated ONLY via an approved policy change.
    CREATE TABLE IF NOT EXISTS assignments (case_id TEXT, user_id TEXT, PRIMARY KEY (case_id, user_id));
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE IF NOT EXISTS access_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT, case_id TEXT, requester TEXT, kind TEXT, purpose TEXT,
      status TEXT, created_at INTEGER, expires_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS request_votes (
      request_id INTEGER, voter TEXT, voter_role TEXT, decision TEXT, at INTEGER, PRIMARY KEY (request_id, voter)
    );
    CREATE TABLE IF NOT EXISTS policy_changes (
      id INTEGER PRIMARY KEY AUTOINCREMENT, requester TEXT, change TEXT, payload TEXT, status TEXT, created_at INTEGER
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

function seed(d: DatabaseSync) {
  const has = d.prepare('SELECT COUNT(*) AS n FROM citizens').get() as { n: number }
  if (has.n > 0) return
  const people: [string, string, string, number, string, string][] = [
    ['cz-hoa', 'Nguyen Thi Hoa', '079190004711', 9_800_000, '12 Le Loi, Q1, TP.HCM', 'Hypertension'],
    ['cz-nam', 'Tran Van Nam', '079185009022', 31_000_000, '88 Hai Ba Trung, Q3, TP.HCM', 'None'],
    ['cz-lien', 'Pham Thi Lien', '079192001533', 14_500_000, '5 Nguyen Hue, Q1, TP.HCM', 'Diabetes'],
  ]
  const ic = d.prepare('INSERT INTO citizens VALUES (?,?,?,?,?,?)')
  for (const [id, name, nid, income, addr, health] of people)
    ic.run(id, encryptField(name), encryptField(nid), encryptField(String(income)), encryptField(addr), encryptField(health))
  const cc = d.prepare('INSERT INTO cases VALUES (?,?,?,?,?)')
  cc.run('C-1001', 'cz-hoa', 'housing_subsidy', 'Housing subsidy application #1001', 'open')
  cc.run('C-1002', 'cz-nam', 'housing_subsidy', 'Housing subsidy application #1002', 'open')
  cc.run('C-1003', 'cz-lien', 'housing_subsidy', 'Housing subsidy application #1003', 'open')
  const ac = d.prepare('INSERT INTO assignments VALUES (?,?)')
  ac.run('C-1001', 'officer_an')
  ac.run('C-1002', 'officer_binh')
  ac.run('C-1003', 'officer_an')
  d.prepare('INSERT INTO settings VALUES (?,?)').run('policy_quorum', '2')
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
