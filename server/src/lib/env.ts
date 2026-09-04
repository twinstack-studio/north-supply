import { config } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Anchored to the server package, not process.cwd(): `dotenv/config` resolves
// .env against the working directory, so starting the server from the repo
// root silently loaded no configuration at all -- falling back to the
// development JWT secret and no mail transport, with nothing to indicate it.
config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env') });

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT ?? 4000),
  // Comma-separated: the laptop and the phone reach the app on different
  // origins, and both need to be allowed. The first entry is the canonical
  // one used to build links inside emails.
  clientOrigins: (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  get clientOrigin(): string {
    return this.clientOrigins[0];
  },
  databaseUrl: required(
    'DATABASE_URL',
    'postgresql://northsupply:northsupply@localhost:5432/northsupply',
  ),
  jwtSecret: required('JWT_SECRET', 'dev-only-secret-change-me-b8f2c1a94e7d'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  adminEmail: process.env.ADMIN_EMAIL ?? 'admin@northsupply.test',
  adminPassword: process.env.ADMIN_PASSWORD ?? 'admin1234',

  // Mail. With no SMTP_HOST the mailer writes messages to disk instead of
  // sending them, so the whole flow is exercisable without credentials.
  smtpHost: process.env.SMTP_HOST ?? '',
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: process.env.SMTP_USER ?? '',
  // Google shows App Passwords as "abcd efgh ijkl mnop"; pasting them verbatim
  // is the obvious thing to do, so strip the spaces rather than fail on them.
  smtpPassword: (process.env.SMTP_PASSWORD ?? '').replace(/\s+/g, ''),
  mailFrom: process.env.MAIL_FROM ?? 'NORTH SUPPLY <orders@northsupply.test>',
  mailOutbox: process.env.MAIL_OUTBOX ?? 'server/.mail-outbox',

  /** How long after purchase a customer may open a return. */
  returnWindowDays: Number(process.env.RETURN_WINDOW_DAYS ?? 30),
  /** Password reset links expire this many minutes after being issued. */
  passwordResetTtlMinutes: Number(process.env.PASSWORD_RESET_TTL_MINUTES ?? 60),

  // --- One-time codes ---
  otpTtlMinutes: Number(process.env.OTP_TTL_MINUTES ?? 10),
  otpMaxAttempts: Number(process.env.OTP_MAX_ATTEMPTS ?? 5),
  /** Second factor on password login. Registration always requires a code. */
  requireLoginOtp: process.env.REQUIRE_LOGIN_OTP !== 'false',

  // --- Google sign-in ---
  // Blank disables it: the button is hidden and the endpoint refuses.
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
};

if (env.isProd && env.jwtSecret.startsWith('dev-only-secret')) {
  throw new Error('Refusing to start in production with the development JWT_SECRET.');
}
