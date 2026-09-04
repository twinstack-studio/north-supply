import { createHash, randomInt } from 'node:crypto';
import { query } from '../db/pool.js';
import { env } from './env.js';
import { badRequest } from './http.js';

export type OtpPurpose = 'registration' | 'login';

/** Six digits from a CSPRNG, zero-padded so 000123 stays six characters. */
export const generateCode = () => String(randomInt(0, 1_000_000)).padStart(6, '0');

const hashCode = (code: string) => createHash('sha256').update(code).digest('hex');

export interface IssuedCode {
  code: string;
  expiresAt: string;
}

/**
 * Issues a fresh code, invalidating any outstanding one for the same address
 * and purpose so only the newest email ever works.
 */
export async function issueCode(opts: {
  purpose: OtpPurpose;
  email: string;
  userId?: number | null;
  payload?: Record<string, unknown> | null;
}): Promise<IssuedCode> {
  await query(
    `UPDATE otp_codes SET consumed_at = now()
     WHERE lower(email) = lower($1) AND purpose = $2 AND consumed_at IS NULL`,
    [opts.email, opts.purpose],
  );

  const code = generateCode();
  const { rows } = await query<{ expires_at: string }>(
    `INSERT INTO otp_codes (purpose, email, user_id, code_hash, payload, expires_at)
     VALUES ($1, lower($2), $3, $4, $5, now() + ($6 || ' minutes')::interval)
     RETURNING expires_at`,
    [opts.purpose, opts.email, opts.userId ?? null, hashCode(code),
     opts.payload ? JSON.stringify(opts.payload) : null, env.otpTtlMinutes],
  );

  // Without SMTP the code only exists in a file on disk; surfacing it in the
  // server log keeps local development workable. Never in production.
  if (!env.isProd && !env.smtpHost) {
    console.log(`[otp] ${opts.purpose} code for ${opts.email}: ${code}`);
  }

  return { code, expiresAt: rows[0].expires_at };
}

export interface VerifiedCode {
  id: number;
  email: string;
  userId: number | null;
  payload: Record<string, unknown> | null;
}

/**
 * Checks a submitted code and consumes it on success.
 *
 * Wrong guesses burn an attempt; once the allowance is gone the code is
 * invalidated outright so it cannot be brute-forced across requests.
 */
export async function verifyCode(opts: {
  purpose: OtpPurpose;
  email: string;
  code: string;
}): Promise<VerifiedCode> {
  const { rows } = await query<{
    id: number;
    email: string;
    user_id: number | null;
    code_hash: string;
    payload: Record<string, unknown> | null;
    attempts: number;
    expired: boolean;
  }>(
    `SELECT id, email, user_id, code_hash, payload, attempts, (expires_at <= now()) AS expired
     FROM otp_codes
     WHERE lower(email) = lower($1) AND purpose = $2 AND consumed_at IS NULL
     ORDER BY created_at DESC LIMIT 1`,
    [opts.email, opts.purpose],
  );

  const row = rows[0];
  if (!row) throw badRequest('That code has expired. Ask for a new one.');
  if (row.expired) {
    await query('UPDATE otp_codes SET consumed_at = now() WHERE id = $1', [row.id]);
    throw badRequest('That code has expired. Ask for a new one.');
  }

  if (row.code_hash !== hashCode(opts.code)) {
    const attempts = row.attempts + 1;
    const exhausted = attempts >= env.otpMaxAttempts;
    await query(
      `UPDATE otp_codes SET attempts = $1, consumed_at = CASE WHEN $2 THEN now() ELSE consumed_at END
       WHERE id = $3`,
      [attempts, exhausted, row.id],
    );
    throw badRequest(
      exhausted
        ? 'Too many incorrect codes. Ask for a new one.'
        : `That code is not right. ${env.otpMaxAttempts - attempts} attempt(s) left.`,
    );
  }

  await query('UPDATE otp_codes SET consumed_at = now() WHERE id = $1', [row.id]);
  return { id: row.id, email: row.email, userId: row.user_id, payload: row.payload };
}
