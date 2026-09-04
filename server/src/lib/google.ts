import { OAuth2Client } from 'google-auth-library';
import { query } from '../db/pool.js';
import { env } from './env.js';
import { badRequest, HttpError } from './http.js';

export interface GoogleIdentity {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

export const googleEnabled = () => Boolean(env.googleClientId);

let client: OAuth2Client | null = null;
const oauthClient = () => (client ??= new OAuth2Client(env.googleClientId));

/**
 * Verifies a Google Identity Services ID token.
 *
 * The library checks the RS256 signature against Google's published keys, the
 * issuer, the expiry, and that `aud` is our own client id -- without that last
 * check a token minted for any other site would be accepted here.
 */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleIdentity> {
  if (!googleEnabled()) {
    throw new HttpError(503, 'Google sign-in is not configured on this server.');
  }

  let payload;
  try {
    const ticket = await oauthClient().verifyIdToken({
      idToken,
      audience: env.googleClientId,
    });
    payload = ticket.getPayload();
  } catch {
    throw badRequest('That Google sign-in could not be verified. Try again.');
  }

  if (!payload?.sub || !payload.email) {
    throw badRequest('Google did not return an email address for that account.');
  }

  // Critical: an unverified Google address must never be trusted, because
  // matching it against an existing account would hand over that account.
  if (!payload.email_verified) {
    throw badRequest('Verify your email with Google before using it to sign in.');
  }

  const given = payload.given_name?.trim();
  const family = payload.family_name?.trim();
  const fallback = (payload.name ?? payload.email.split('@')[0]).trim().split(/\s+/);

  return {
    googleId: payload.sub,
    email: payload.email.toLowerCase(),
    firstName: given || fallback[0] || 'Customer',
    lastName: family || fallback.slice(1).join(' ') || '-',
    avatarUrl: payload.picture ?? null,
  };
}


export interface GoogleUserRow {
  id: number;
  email: string;
  google_id: string | null;
}

export interface ResolvedGoogleUser<T> {
  user: T;
  created: boolean;
  linked: boolean;
}

/**
 * Finds or creates the account behind a verified Google identity.
 *
 * Three cases, in priority order:
 *   1. We already know this Google id -> sign in, refresh the avatar.
 *   2. The (Google-verified) email matches a local account -> link them.
 *   3. Otherwise create a passwordless account.
 *
 * Case 2 is only safe because `verifyGoogleIdToken` rejects tokens whose email
 * Google has not itself verified -- otherwise anyone able to mint a token for
 * an arbitrary address could claim a matching local account.
 */
export async function resolveGoogleUser<T extends GoogleUserRow>(
  identity: GoogleIdentity,
): Promise<ResolvedGoogleUser<T>> {
  const byGoogle = await query<T>('SELECT * FROM users WHERE google_id = $1', [identity.googleId]);
  if (byGoogle.rows[0]) {
    const { rows } = await query<T>(
      'UPDATE users SET avatar_url = $1 WHERE id = $2 RETURNING *',
      [identity.avatarUrl, byGoogle.rows[0].id],
    );
    return { user: rows[0], created: false, linked: false };
  }

  const byEmail = await query<T>('SELECT * FROM users WHERE lower(email) = lower($1)', [
    identity.email,
  ]);
  if (byEmail.rows[0]) {
    const { rows } = await query<T>(
      `UPDATE users SET google_id = $1, avatar_url = COALESCE($2, avatar_url), email_verified = true
       WHERE id = $3 RETURNING *`,
      [identity.googleId, identity.avatarUrl, byEmail.rows[0].id],
    );
    return { user: rows[0], created: false, linked: true };
  }

  const { rows } = await query<T>(
    `INSERT INTO users (email, first_name, last_name, google_id, avatar_url, email_verified)
     VALUES (lower($1), $2, $3, $4, $5, true)
     RETURNING *`,
    [identity.email, identity.firstName, identity.lastName, identity.googleId, identity.avatarUrl],
  );
  return { user: rows[0], created: true, linked: false };
}
