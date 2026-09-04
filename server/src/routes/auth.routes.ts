import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { query, withTransaction } from '../db/pool.js';
import { otpCode, passwordReset } from '../lib/emails.js';
import { env } from '../lib/env.js';
import { badRequest, conflict, unauthorized } from '../lib/http.js';
import { queue, usingRealSmtp } from '../lib/mailer.js';
import { resolveGoogleUser, verifyGoogleIdToken } from '../lib/google.js';
import { issueCode, verifyCode } from '../lib/otp.js';
import {
  clearAuthCookie,
  requireAuth,
  setAuthCookie,
  signToken,
} from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import type { AuthedRequest } from '../types/index.js';

export const authRouter = Router();

// Slows down credential stuffing without inconveniencing real users.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Try again in a few minutes.' },
});

// Resending mails a real person, so it is limited harder than a plain login.
const resendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many code requests. Wait a few minutes.' },
});

const registerSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(8, 'Use at least 8 characters.').max(200),
  firstName: z.string().min(1, 'Required.').max(80),
  lastName: z.string().min(1, 'Required.').max(80),
});

const otpSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  code: z.string().trim().regex(/^\d{6}$/, 'Enter the six-digit code.'),
});

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

interface UserRow {
  id: number;
  email: string;
  password_hash: string | null;
  google_id: string | null;
  avatar_url: string | null;
  email_verified: boolean;
  first_name: string;
  last_name: string;
  phone: string | null;
  role: 'customer' | 'admin';
  created_at: string;
}

const publicUser = (u: UserRow) => ({
  id: u.id,
  email: u.email,
  firstName: u.first_name,
  lastName: u.last_name,
  phone: u.phone,
  role: u.role,
  createdAt: u.created_at,
  avatarUrl: u.avatar_url,
  emailVerified: u.email_verified,
  hasPassword: u.password_hash !== null,
  hasGoogle: u.google_id !== null,
});

const signIn = (res: Parameters<typeof setAuthCookie>[0], user: UserRow) =>
  setAuthCookie(res, signToken({ sub: user.id, email: user.email, role: user.role }));

authRouter.post(
  '/register',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email, password, firstName, lastName } = registerSchema.parse(req.body);

    const existing = await query('SELECT 1 FROM users WHERE lower(email) = lower($1)', [email]);
    if (existing.rowCount) throw conflict('An account with that email already exists.');

    // No user row yet: the pending signup lives on the OTP record, so an
    // abandoned registration never squats the email address.
    const { code, expiresAt } = await issueCode({
      purpose: 'registration',
      email,
      payload: { passwordHash: await bcrypt.hash(password, 12), firstName, lastName },
    });
    queue(otpCode(email, code, 'registration'));

    res.status(202).json({
      verificationRequired: true,
      email: email.toLowerCase(),
      expiresAt,
      message: 'We sent a six-digit code to your email.',
    });
  }),
);

authRouter.post(
  '/verify-registration',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email, code } = otpSchema.parse(req.body);

    const verified = await verifyCode({ purpose: 'registration', email, code });
    const payload = verified.payload as
      | { passwordHash: string; firstName: string; lastName: string }
      | null;
    if (!payload) throw badRequest('That registration expired. Please sign up again.');

    // Re-checked here: someone may have taken the address while the code was
    // in flight.
    const taken = await query('SELECT 1 FROM users WHERE lower(email) = lower($1)', [email]);
    if (taken.rowCount) throw conflict('An account with that email already exists.');

    const { rows } = await query<UserRow>(
      `INSERT INTO users (email, password_hash, first_name, last_name, email_verified)
       VALUES (lower($1), $2, $3, $4, true)
       RETURNING *`,
      [email, payload.passwordHash, payload.firstName, payload.lastName],
    );

    signIn(res, rows[0]);
    res.status(201).json({ user: publicUser(rows[0]) });
  }),
);

authRouter.post(
  '/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);

    const { rows } = await query<UserRow>(
      'SELECT * FROM users WHERE lower(email) = lower($1)',
      [email],
    );
    const user = rows[0];

    // An account created through Google has no local password to check.
    if (user && user.password_hash === null) {
      throw badRequest('That account uses Google sign-in. Continue with Google instead.');
    }

    // Same message either way -- don't leak which emails have accounts.
    if (!user || !(await bcrypt.compare(password, user.password_hash as string))) {
      throw unauthorized('Email or password is incorrect.');
    }

    if (!env.requireLoginOtp) {
      signIn(res, user);
      res.json({ user: publicUser(user) });
      return;
    }

    // Password verified, but no cookie is issued until the emailed code is.
    const { code, expiresAt } = await issueCode({
      purpose: 'login',
      email: user.email,
      userId: user.id,
    });
    queue(otpCode(user.email, code, 'login'));

    res.status(202).json({
      verificationRequired: true,
      email: user.email,
      expiresAt,
      message: 'We sent a six-digit code to your email.',
    });
  }),
);

authRouter.post(
  '/verify-login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email, code } = otpSchema.parse(req.body);

    const verified = await verifyCode({ purpose: 'login', email, code });
    const { rows } = await query<UserRow>('SELECT * FROM users WHERE id = $1', [
      verified.userId,
    ]);
    const user = rows[0];
    if (!user) throw unauthorized('That account no longer exists.');

    signIn(res, user);
    res.json({ user: publicUser(user) });
  }),
);

/** Re-sends a code for an in-flight registration or login. */
authRouter.post(
  '/resend-code',
  resendLimiter,
  asyncHandler(async (req, res) => {
    const { email, purpose } = z
      .object({
        email: z.string().email(),
        purpose: z.enum(['registration', 'login']),
      })
      .parse(req.body);

    // Only reissue when a challenge is genuinely outstanding, so this cannot
    // be used to mail arbitrary addresses.
    const { rows } = await query<{ user_id: number | null; payload: Record<string, unknown> | null }>(
      `SELECT user_id, payload FROM otp_codes
       WHERE lower(email) = lower($1) AND purpose = $2 AND consumed_at IS NULL
         AND expires_at > now()
       ORDER BY created_at DESC LIMIT 1`,
      [email, purpose],
    );

    if (rows[0]) {
      const { code, expiresAt } = await issueCode({
        purpose,
        email,
        userId: rows[0].user_id,
        payload: rows[0].payload,
      });
      queue(otpCode(email, code, purpose));
      res.json({ ok: true, expiresAt });
      return;
    }

    res.json({ ok: true, message: 'If a code was pending, a new one is on its way.' });
  }),
);

authRouter.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

authRouter.get(
  '/me',
  asyncHandler(async (req: AuthedRequest, res) => {
    if (!req.user) {
      res.json({ user: null });
      return;
    }
    const { rows } = await query<UserRow>('SELECT * FROM users WHERE id = $1', [req.user.sub]);
    res.json({ user: rows[0] ? publicUser(rows[0]) : null });
  }),
);

authRouter.patch(
  '/me',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const schema = z.object({
      firstName: z.string().min(1).max(80),
      lastName: z.string().min(1).max(80),
      phone: z.string().max(40).optional().nullable(),
    });
    const { firstName, lastName, phone } = schema.parse(req.body);

    const { rows } = await query<UserRow>(
      `UPDATE users SET first_name = $1, last_name = $2, phone = $3
       WHERE id = $4 RETURNING *`,
      [firstName, lastName, phone ?? null, req.user!.sub],
    );
    res.json({ user: publicUser(rows[0]) });
  }),
);

authRouter.post(
  '/change-password',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const schema = z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8, 'Use at least 8 characters.').max(200),
    });
    const { currentPassword, newPassword } = schema.parse(req.body);

    const { rows } = await query<UserRow>('SELECT * FROM users WHERE id = $1', [req.user!.sub]);
    const user = rows[0];
    if (user?.password_hash === null) {
      throw badRequest(
        'This account signs in with Google. Use "Forgot password" to set a local password first.',
      );
    }
    if (!user || !(await bcrypt.compare(currentPassword, user.password_hash as string))) {
      throw badRequest('Your current password is incorrect.');
    }

    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [
      await bcrypt.hash(newPassword, 12),
      user.id,
    ]);
    res.json({ ok: true });
  }),
);


/* ------------------------------------------------------------ password reset --- */

/** Only the hash is stored, so a leaked table cannot be replayed. */
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

// Tighter than the general auth limiter: this endpoint sends mail.
const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many reset requests. Try again later.' },
});

authRouter.post(
  '/forgot-password',
  resetLimiter,
  asyncHandler(async (req, res) => {
    const { email } = z
      .object({ email: z.string().email('Enter a valid email address.') })
      .parse(req.body);

    const { rows } = await query<{ id: number; email: string }>(
      'SELECT id, email FROM users WHERE lower(email) = lower($1)',
      [email],
    );
    const user = rows[0];

    if (user) {
      // Any earlier link stops working the moment a new one is issued.
      await query(
        `UPDATE password_resets SET used_at = now()
         WHERE user_id = $1 AND used_at IS NULL`,
        [user.id],
      );

      const token = randomBytes(32).toString('hex');
      await query(
        `INSERT INTO password_resets (user_id, token_hash, expires_at)
         VALUES ($1, $2, now() + ($3 || ' minutes')::interval)`,
        [user.id, hashToken(token), env.passwordResetTtlMinutes],
      );
      queue(passwordReset(user.email, token));
    }

    // Always the same answer: revealing which emails have accounts would turn
    // this into an account-enumeration oracle.
    res.json({
      ok: true,
      message: 'If that email has an account, a reset link is on its way.',
    });
  }),
);

authRouter.post(
  '/reset-password',
  resetLimiter,
  asyncHandler(async (req, res) => {
    const { token, password } = z
      .object({
        token: z.string().min(32).max(200),
        password: z.string().min(8, 'Use at least 8 characters.').max(200),
      })
      .parse(req.body);

    const { rows } = await query<{ id: number; user_id: number }>(
      `SELECT id, user_id FROM password_resets
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()`,
      [hashToken(token)],
    );
    const reset = rows[0];
    if (!reset) throw badRequest('That reset link is invalid or has expired.');

    await withTransaction(async (client) => {
      await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [
        await bcrypt.hash(password, 12),
        reset.user_id,
      ]);
      await client.query('UPDATE password_resets SET used_at = now() WHERE id = $1', [reset.id]);
    });

    // Not signed in automatically -- whoever holds the link may not be the
    // account owner until they have also proved they can log in.
    res.json({ ok: true });
  }),
);

/** Lets the reset page show a useful error before the user types a password. */
authRouter.get(
  '/reset-password/:token',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT 1 FROM password_resets
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()`,
      [hashToken(req.params.token)],
    );
    res.json({ valid: rows.length > 0 });
  }),
);


/** What the sign-in UI needs to know before rendering. */
authRouter.get('/config', (_req, res) => {
  res.json({
    googleClientId: env.googleClientId || null,
    loginOtpRequired: env.requireLoginOtp,
    otpTtlMinutes: env.otpTtlMinutes,
    // False means codes are written to disk, not delivered. The UI says so
    // rather than claiming an email was sent that never leaves the machine.
    mailDelivery: usingRealSmtp(),
  });
});

/* --------------------------------------------------------------- google --- */

authRouter.post(
  '/google',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { credential } = z
      .object({ credential: z.string().min(20).max(8000) })
      .parse(req.body);

    const identity = await verifyGoogleIdToken(credential);
    const { user, created, linked } = await resolveGoogleUser<UserRow>(identity);

    signIn(res, user);
    res.status(created ? 201 : 200).json({ user: publicUser(user), created, linked });
  }),
);

