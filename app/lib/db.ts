import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { sha } from './crypto'
import { seed } from './seed'

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
  // cache only after a successful seed: if seeding throws (e.g. missing DEMO_MASTER_KEY),
  // the next call must retry instead of reusing an empty database forever
  seed(d)
  g.__db = d
  return d
}

export function resetDb() {
  const d = db()
  for (const t of ['citizens', 'cases', 'assignments', 'settings', 'access_requests', 'request_votes', 'policy_changes', 'policy_votes', 'audit'])
    d.exec(`DELETE FROM ${t}`)
  d.exec("DELETE FROM sqlite_sequence")
  seed(d)
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
