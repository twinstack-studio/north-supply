import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import nodemailer, { type Transporter } from 'nodemailer';
import { env } from './env.js';

export interface Mail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Two transports:
 *
 *  - SMTP, when SMTP_HOST is configured.
 *  - A file outbox otherwise, which writes each message to disk and logs the
 *    path. That keeps every email path runnable with no credentials, and makes
 *    the content assertable in tests.
 *
 * Nothing in the app awaits delivery on the request path -- see `queue`.
 */
let transporter: Transporter | null = null;

function smtpTransport(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPassword } : undefined,
    });
  }
  return transporter;
}

/**
 * A host alone is not enough: a half-filled .env (host set, credentials still
 * blank) must fall back to the file outbox rather than fail every send
 * silently. Hosts that genuinely need no auth can set SMTP_USER only.
 */
export const usingRealSmtp = () =>
  Boolean(env.smtpHost) && (!env.smtpUser || Boolean(env.smtpPassword));

// Anchored to the server package rather than process.cwd(), so the outbox
// lands in the same place whether started via npm scripts or tsx directly.
const SERVER_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

async function writeToOutbox(mail: Mail): Promise<string> {
  const dir = isAbsolute(env.mailOutbox)
    ? env.mailOutbox
    : resolve(SERVER_ROOT, env.mailOutbox.replace(/^server\//, ''));
  await mkdir(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const slug = mail.subject.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  const path = join(dir, `${stamp}__${mail.to.replace(/[^a-z0-9@.]/gi, '_')}__${slug}.html`);

  await writeFile(
    path,
    `<!-- To: ${mail.to}\n     From: ${env.mailFrom}\n     Subject: ${mail.subject} -->\n${mail.html}`,
    'utf8',
  );
  return path;
}

export async function send(mail: Mail): Promise<void> {
  if (usingRealSmtp()) {
    await smtpTransport().sendMail({ from: env.mailFrom, ...mail });
    console.log(`[mail] sent "${mail.subject}" to ${mail.to}`);
    return;
  }
  const path = await writeToOutbox(mail);
  console.log(`[mail] (no SMTP configured) wrote "${mail.subject}" for ${mail.to} -> ${path}`);
}

/**
 * Fire-and-forget send.
 *
 * A customer's order must not fail because the mail server is down, so
 * delivery happens off the request path and failures are logged rather than
 * thrown. A production build would put this on a real queue with retries.
 */
export function queue(mail: Mail): void {
  void send(mail).catch((err) => {
    console.error(`[mail] FAILED "${mail.subject}" to ${mail.to}:`, err?.message ?? err);
  });
}


/** Logged once at boot so the active transport is never a mystery. */
export function describeTransport(): string {
  if (usingRealSmtp()) return `SMTP ${env.smtpHost}:${env.smtpPort} as "${env.mailFrom}"`;
  if (env.smtpHost) {
    return `file outbox (SMTP_HOST is set to "${env.smtpHost}" but SMTP_PASSWORD is empty)`;
  }
  return 'file outbox (no SMTP_HOST configured)';
}
