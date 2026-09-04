import { env } from '../lib/env.js';
import { describeTransport, send, usingRealSmtp } from '../lib/mailer.js';

/**
 * Sends one real email and explains, in plain terms, what happened.
 *
 *   npm run mail:test -- you@example.com
 *
 * Provider errors are cryptic by default, so the common causes are decoded
 * below rather than dumping a raw SMTP response.
 */

const to = process.argv[2];

if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
  console.error('Usage: npm run mail:test -- you@example.com');
  process.exit(1);
}

console.log(`\n  transport : ${describeTransport()}`);
console.log(`  from      : ${env.mailFrom}`);
console.log(`  to        : ${to}\n`);

if (!usingRealSmtp()) {
  console.error('  Mail is NOT being delivered — it is written to disk.');
  console.error(
    env.smtpHost
      ? `  SMTP_HOST is "${env.smtpHost}" but SMTP_PASSWORD is empty. Paste your\n` +
        '  App Password into server/.env and run this again.'
      : '  Set SMTP_HOST (and credentials) in server/.env, then run this again.',
  );
  console.error('\n  Sending to the file outbox anyway so you can see the message...\n');
}

/** Turns a provider error into something actionable. */
function explain(message: string): string | null {
  const m = message.toLowerCase();
  const gmail = env.smtpHost.includes('gmail');

  if (m.includes('535') || m.includes('authentication') || m.includes('invalid login')) {
    return gmail
      ? 'Gmail rejected the credentials. Two usual causes:\n' +
        '    - SMTP_PASSWORD must be a 16-character App Password, not your normal\n' +
        '      Gmail password. Create one at https://myaccount.google.com/apppasswords\n' +
        '    - App Passwords only exist once 2-Step Verification is on:\n' +
        '      https://myaccount.google.com/signinoptions/two-step-verification'
      : 'The server rejected those credentials. Check SMTP_USER and SMTP_PASSWORD.';
  }
  if (gmail && (m.includes('sender') || m.includes('not allowed') || m.includes('553'))) {
    return `Gmail requires the sender to be the account you authenticated as.\n` +
           `  Set MAIL_FROM to use ${env.smtpUser}.`;
  }
  if (m.includes('domain') || m.includes('not verified') || m.includes('403')) {
    return 'The provider refused the sender or recipient — usually an unverified sending domain.';
  }
  if (m.includes('econnrefused') || m.includes('enotfound') || m.includes('timeout')) {
    return 'Could not reach the mail server. Check SMTP_HOST/SMTP_PORT and your network.';
  }
  return null;
}

try {
  await send({
    to,
    subject: 'NORTH SUPPLY mail test',
    html:
      '<div style="font-family:Helvetica,Arial,sans-serif;padding:24px;">' +
      '<h1 style="font-size:20px;margin:0 0 12px;">Mail is working</h1>' +
      '<p style="margin:0;color:#555;">If you are reading this in your inbox, ' +
      'order confirmations, one-time codes, password resets and return updates ' +
      'will all be delivered.</p></div>',
    text: 'Mail is working. Order confirmations, one-time codes, password resets and return updates will all be delivered.',
  });

  console.log(
    usingRealSmtp()
      ? `  Sent. Check ${to} (including spam).\n`
      : '  Written to the outbox — open the file above in a browser.\n',
  );
  process.exit(0);
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\n  FAILED: ${message}\n`);
  const hint = explain(message);
  if (hint) console.error(`  ${hint}\n`);
  process.exit(1);
}
