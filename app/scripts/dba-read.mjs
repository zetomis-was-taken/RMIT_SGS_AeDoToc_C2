// Demo attack #3: a DBA with full filesystem/DB access reads the citizen table directly.
import { DatabaseSync } from 'node:sqlite'
import path from 'node:path'
const db = new DatabaseSync(path.join(process.cwd(), 'data', 'citizen.db'), { readOnly: true })
console.log('DBA> SELECT * FROM citizens;\n')
for (const r of db.prepare('SELECT * FROM citizens').all()) console.log(r, '\n')
