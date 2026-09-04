import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';

const here = dirname(fileURLToPath(import.meta.url));

async function main() {
  const sql = await readFile(join(here, 'schema.sql'), 'utf8');
  console.log('[migrate] applying schema.sql ...');
  await pool.query(sql);
  console.log('[migrate] done -- all tables recreated.');
  await pool.end();
}

main().catch((err) => {
  console.error('[migrate] failed:', err.message);
  process.exit(1);
});
