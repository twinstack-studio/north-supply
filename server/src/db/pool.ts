import pg from 'pg';
import { env } from '../lib/env.js';

// NUMERIC columns arrive as strings by default so that arbitrary precision
// survives the wire. Every money column here fits comfortably in a double,
// so parse them into numbers and keep the API responses JSON-clean.
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (value) => parseFloat(value));

export const pool = new pg.Pool({
  connectionString: env.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
});

pool.on('error', (err) => {
  console.error('[db] unexpected idle client error', err);
});

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params as never[]);
}

/** Runs `fn` inside a transaction, rolling back on any thrown error. */
export async function withTransaction<T>(
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
