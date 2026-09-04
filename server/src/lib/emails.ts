import { env } from './env.js';
import type { Mail } from './mailer.js';

/* --------------------------------------------------------------------------
 * Transactional email templates.
 *
 * Deliberately table-based with inline styles: email clients strip <style>
 * blocks and have no flexbox or grid worth relying on. Every message ships a
 * plain-text alternative alongside the HTML.
 * ----------------------------------------------------------------------- */

const INK = '#0b0b0c';
const BLAZE = '#ff4a1c';
const MUTED = '#75726c';
const LINE = '#e2ded7';
const PAPER = '#faf9f7';

const money = (n: number) =>
  `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const escape = (v: string) =>
  String(v).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c] as string);

function layout(opts: { preheader: string; heading: string; body: string; cta?: { label: string; url: string } }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${escape(opts.heading)}</title></head>
<body style="margin:0;padding:0;background:${PAPER};">
  <!-- Preheader: shown in the inbox preview, hidden in the message body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escape(opts.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${LINE};">
        <tr><td style="background:${INK};padding:22px 28px;">
          <span style="font-family:Helvetica,Arial,sans-serif;font-size:17px;font-weight:800;letter-spacing:.5px;color:#ffffff;text-transform:uppercase;">
            NORTH<span style="color:${BLAZE};">&middot;</span>SUPPLY
          </span>
        </td></tr>
        <tr><td style="padding:32px 28px 8px;">
          <h1 style="margin:0 0 14px;font-family:Helvetica,Arial,sans-serif;font-size:24px;line-height:1.2;font-weight:800;color:${INK};text-transform:uppercase;letter-spacing:-.5px;">
            ${escape(opts.heading)}
          </h1>
        </td></tr>
        <tr><td style="padding:0 28px 28px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:${INK};">
          ${opts.body}
          ${opts.cta ? `
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 4px;">
            <tr><td style="background:${INK};">
              <a href="${opts.cta.url}" style="display:inline-block;padding:14px 28px;font-size:13px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#ffffff;text-decoration:none;">
                ${escape(opts.cta.label)}
              </a>
            </td></tr>
          </table>
          <p style="margin:14px 0 0;font-size:12px;color:${MUTED};word-break:break-all;">
            Or paste this into your browser:<br>${escape(opts.cta.url)}
          </p>` : ''}
        </td></tr>
        <tr><td style="border-top:1px solid ${LINE};padding:20px 28px;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:${MUTED};">
          NORTH SUPPLY &middot; a demo storefront. Payments are simulated and no card is ever charged.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

interface OrderLike {
  orderNumber: string;
  email: string;
  total: number;
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  shippingAddress: Record<string, string>;
  items: Array<{ productName: string; size: string; color: string; quantity: number; unitPrice: number }>;
}

function itemsTable(items: OrderLike['items']) {
  const rows = items.map((i) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid ${LINE};font-size:14px;">
        <strong>${escape(i.productName)}</strong><br>
        <span style="color:${MUTED};font-size:12px;text-transform:uppercase;letter-spacing:1px;">
          ${escape(i.size)} &middot; ${escape(i.color)} &middot; Qty ${i.quantity}
        </span>
      </td>
      <td style="padding:10px 0;border-bottom:1px solid ${LINE};font-size:14px;text-align:right;white-space:nowrap;">
        ${money(i.unitPrice * i.quantity)}
      </td>
    </tr>`).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;">${rows}</table>`;
}

function totalsTable(o: OrderLike) {
  const row = (label: string, value: string, bold = false) => `
    <tr>
      <td style="padding:4px 0;font-size:14px;${bold ? 'font-weight:700;' : `color:${MUTED};`}">${label}</td>
      <td style="padding:4px 0;font-size:14px;text-align:right;${bold ? 'font-weight:700;' : ''}">${value}</td>
    </tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    ${row('Subtotal', money(o.subtotal))}
    ${o.discount > 0 ? row('Discount', `-${money(o.discount)}`) : ''}
    ${row('Shipping', o.shipping === 0 ? 'Free' : money(o.shipping))}
    ${row('Tax', money(o.tax))}
    ${row('Total', money(o.total), true)}
  </table>`;
}

const addressBlock = (a: Record<string, string>) => `
  <p style="margin:18px 0 0;font-size:14px;line-height:1.6;">
    <strong>Shipping to</strong><br>
    <span style="color:${MUTED};">
      ${escape(a.fullName ?? '')}<br>
      ${escape(a.line1 ?? '')}<br>
      ${a.line2 ? `${escape(a.line2)}<br>` : ''}
      ${escape(a.city ?? '')}, ${escape(a.state ?? '')} ${escape(a.postalCode ?? '')}<br>
      ${escape(a.country ?? '')}
    </span>
  </p>`;

const plainItems = (items: OrderLike['items']) =>
  items.map((i) => `  - ${i.productName} (${i.size} / ${i.color}) x${i.quantity}  ${money(i.unitPrice * i.quantity)}`).join('\n');

/* ------------------------------------------------------------- templates --- */

export function orderConfirmation(order: OrderLike): Mail {
  const url = `${env.clientOrigin}/order/${order.orderNumber}?email=${encodeURIComponent(order.email)}`;
  return {
    to: order.email,
    subject: `Order ${order.orderNumber} confirmed`,
    html: layout({
      preheader: `We've got your order — ${money(order.total)} total.`,
      heading: 'Order confirmed',
      body: `
        <p style="margin:0;">Thanks — we're picking your order now. Here's what's coming.</p>
        <p style="margin:16px 0 0;font-size:13px;color:${MUTED};">
          Order <strong style="color:${INK};font-family:monospace;">${escape(order.orderNumber)}</strong>
        </p>
        ${itemsTable(order.items)}
        ${totalsTable(order)}
        ${addressBlock(order.shippingAddress)}`,
      cta: { label: 'Track your order', url },
    }),
    text: `Order confirmed — ${order.orderNumber}

Thanks, we're picking your order now.

${plainItems(order.items)}

Subtotal ${money(order.subtotal)}
${order.discount > 0 ? `Discount -${money(order.discount)}\n` : ''}Shipping ${order.shipping === 0 ? 'Free' : money(order.shipping)}
Tax ${money(order.tax)}
Total ${money(order.total)}

Track it: ${url}`,
  };
}

export function shippingNotification(order: OrderLike): Mail {
  const url = `${env.clientOrigin}/order/${order.orderNumber}?email=${encodeURIComponent(order.email)}`;
  return {
    to: order.email,
    subject: `Order ${order.orderNumber} has shipped`,
    html: layout({
      preheader: 'Your NORTH SUPPLY order is on its way.',
      heading: 'On its way',
      body: `
        <p style="margin:0;">Your order has left the warehouse.</p>
        <p style="margin:16px 0 0;font-size:13px;color:${MUTED};">
          Order <strong style="color:${INK};font-family:monospace;">${escape(order.orderNumber)}</strong>
        </p>
        ${itemsTable(order.items)}
        ${addressBlock(order.shippingAddress)}`,
      cta: { label: 'View your order', url },
    }),
    text: `Your order ${order.orderNumber} has shipped.\n\n${plainItems(order.items)}\n\nView it: ${url}`,
  };
}

export function passwordReset(to: string, token: string): Mail {
  const url = `${env.clientOrigin}/reset-password?token=${encodeURIComponent(token)}`;
  const mins = env.passwordResetTtlMinutes;
  return {
    to,
    subject: 'Reset your NORTH SUPPLY password',
    html: layout({
      preheader: `This link works for ${mins} minutes.`,
      heading: 'Reset your password',
      body: `
        <p style="margin:0;">Use the button below to choose a new password. The link works once and expires in ${mins} minutes.</p>
        <p style="margin:16px 0 0;color:${MUTED};font-size:14px;">
          If you didn't ask for this, ignore this email — your password stays as it is.
        </p>`,
      cta: { label: 'Choose a new password', url },
    }),
    text: `Reset your NORTH SUPPLY password.

Open this link to choose a new one. It works once and expires in ${mins} minutes:
${url}

If you didn't ask for this, ignore this email.`,
  };
}

interface ReturnLike {
  rmaNumber: string;
  orderNumber: string;
  email: string;
  status: string;
  staffNote?: string;
  refundAmount?: number | null;
  items: Array<{ productName: string; size: string; color: string; quantity: number }>;
}

const returnItemsList = (items: ReturnLike['items']) =>
  `<ul style="margin:16px 0;padding-left:20px;font-size:14px;line-height:1.7;">${items
    .map((i) => `<li>${escape(i.productName)} — ${escape(i.size)} / ${escape(i.color)} &times;${i.quantity}</li>`)
    .join('')}</ul>`;

export function returnRequested(ret: ReturnLike): Mail {
  const url = `${env.clientOrigin}/account/returns`;
  return {
    to: ret.email,
    subject: `Return ${ret.rmaNumber} received`,
    html: layout({
      preheader: 'We have your return request.',
      heading: 'Return requested',
      body: `
        <p style="margin:0;">We've got your request for order
          <strong style="font-family:monospace;">${escape(ret.orderNumber)}</strong>.
          We'll review it within one business day and email you a prepaid label once it's approved.</p>
        <p style="margin:16px 0 0;font-size:13px;color:${MUTED};">
          Return <strong style="color:${INK};font-family:monospace;">${escape(ret.rmaNumber)}</strong>
        </p>
        ${returnItemsList(ret.items)}`,
      cta: { label: 'View your returns', url },
    }),
    text: `Return ${ret.rmaNumber} received for order ${ret.orderNumber}.

${ret.items.map((i) => `  - ${i.productName} (${i.size} / ${i.color}) x${i.quantity}`).join('\n')}

We'll review within one business day. ${url}`,
  };
}

const RETURN_COPY: Record<string, { heading: string; line: string }> = {
  approved: { heading: 'Return approved', line: "Your return is approved. Post the items back with the prepaid label and we'll refund you once they land." },
  rejected: { heading: 'Return declined', line: "We couldn't approve this return." },
  received: { heading: 'Return received', line: "Your items are back with us and we're checking them over. Your refund follows shortly." },
  refunded: { heading: 'Refund issued', line: 'Your refund is on its way back to the original payment method.' },
};

export function returnStatusChanged(ret: ReturnLike): Mail {
  const copy = RETURN_COPY[ret.status] ?? { heading: 'Return updated', line: `Your return is now ${ret.status}.` };
  const url = `${env.clientOrigin}/account/returns`;
  return {
    to: ret.email,
    subject: `Return ${ret.rmaNumber}: ${copy.heading.toLowerCase()}`,
    html: layout({
      preheader: copy.line,
      heading: copy.heading,
      body: `
        <p style="margin:0;">${escape(copy.line)}</p>
        ${ret.refundAmount ? `<p style="margin:16px 0 0;font-size:16px;font-weight:700;">Refund: ${money(ret.refundAmount)}</p>` : ''}
        ${ret.staffNote ? `<p style="margin:16px 0 0;padding:12px 14px;background:${PAPER};border-left:3px solid ${BLAZE};font-size:14px;">${escape(ret.staffNote)}</p>` : ''}
        <p style="margin:16px 0 0;font-size:13px;color:${MUTED};">
          Return <strong style="color:${INK};font-family:monospace;">${escape(ret.rmaNumber)}</strong>
          &middot; order <strong style="color:${INK};font-family:monospace;">${escape(ret.orderNumber)}</strong>
        </p>
        ${returnItemsList(ret.items)}`,
      cta: { label: 'View your returns', url },
    }),
    text: `${copy.heading} — ${ret.rmaNumber}

${copy.line}
${ret.refundAmount ? `Refund: ${money(ret.refundAmount)}\n` : ''}${ret.staffNote ? `Note: ${ret.staffNote}\n` : ''}
${url}`,
  };
}

export function otpCode(to: string, code: string, purpose: 'registration' | 'login'): Mail {
  const minutes = env.otpTtlMinutes;
  const heading = purpose === 'registration' ? 'Confirm your email' : 'Your sign-in code';
  const intro =
    purpose === 'registration'
      ? 'Enter this code to finish creating your NORTH SUPPLY account.'
      : 'Enter this code to finish signing in.';

  return {
    to,
    subject: `${code} is your NORTH SUPPLY code`,
    html: layout({
      preheader: `${code} — expires in ${minutes} minutes.`,
      heading,
      body: `
        <p style="margin:0;">${intro}</p>
        <p style="margin:26px 0;text-align:center;">
          <span style="display:inline-block;padding:18px 28px;background:${PAPER};border:1px solid ${LINE};
                       font-family:monospace;font-size:34px;font-weight:700;letter-spacing:10px;color:${INK};">
            ${escape(code)}
          </span>
        </p>
        <p style="margin:0;color:${MUTED};font-size:14px;">
          It expires in ${minutes} minutes and can only be used once.
          If you didn't ask for it, you can ignore this email.
        </p>`,
    }),
    text: `${heading}

${intro}

    ${code}

Expires in ${minutes} minutes, single use. If you didn't ask for it, ignore this email.`,
  };
}
