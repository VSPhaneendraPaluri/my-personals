'use strict';
const nodemailer = require('nodemailer');

// ── Email transport ──────────────────────────────────────────────────────────
let mailTransporter;
function getMailTransporter() {
  if (!mailTransporter) {
    mailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 10_000,
      greetingTimeout:   10_000,
      socketTimeout:     10_000,
    });
  }
  return mailTransporter;
}

// ── Brevo HTTPS sender ────────────────────────────────────────────────────────
// Render's free tier blocks outbound SMTP; use Brevo's HTTPS API instead.
async function sendViaBrevo({ email, subject, text, html }) {
  const sender = process.env.MAIL_FROM || process.env.SMTP_USER;
  if (!sender) {
    const err = new Error('MAIL_FROM is not set.');
    err.code = 'EMAIL_NOT_CONFIGURED';
    throw err;
  }
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key':      process.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
      'Accept':       'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'Karyadhara', email: sender },
      to: [{ email }],
      subject,
      textContent: text,
      htmlContent: html,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const err  = new Error(`Brevo rejected the email (${res.status}): ${body || res.statusText}`);
    err.code   = 'EMAIL_SEND_FAILED';
    throw err;
  }
}

// Low-level dispatcher: Brevo if configured, SMTP otherwise.
async function sendMail({ email, subject, text, html }) {
  const useApi = !!process.env.BREVO_API_KEY;
  if (!useApi && (!process.env.SMTP_USER || !process.env.SMTP_PASS)) {
    const err = new Error('Email is not configured on this server.');
    err.code = 'EMAIL_NOT_CONFIGURED';
    throw err;
  }
  if (useApi) return sendViaBrevo({ email, subject, text, html });
  await getMailTransporter().sendMail({
    from: `"Karyadhara" <${process.env.SMTP_USER}>`,
    to: email,
    subject,
    text,
    html,
  });
}

// ── HTML shell ────────────────────────────────────────────────────────────────
function emailShell(bodyHtml) {
  return `
    <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
      <h2 style="font-size:1.6rem;font-weight:800;margin:0 0 4px">Karyadhara</h2>
      <p style="color:#6c6784;margin:0 0 28px;font-size:.9rem">कार्यधारा · a steady stream of work</p>
      ${bodyHtml}
      <p style="color:#a39fb8;font-size:.75rem;margin:32px 0 0">
        You are receiving this email because you have a Karyadhara account.<br>
        Manage notification preferences inside the app.
      </p>
    </div>`;
}

// ── OTP email ─────────────────────────────────────────────────────────────────
async function sendOtpEmail(email, code, { purpose } = {}) {
  const heading = purpose === 'register' ? 'Verify your email' : 'Your sign-in code';
  const intro   = purpose === 'register'
    ? 'Enter this code to finish creating your Karyadhara account:'
    : 'Your one-time sign-in code:';

  const subject = `${code} — ${heading}`;
  const text    = [intro, code, '', 'Valid for 10 minutes. Do not share it with anyone.',
                   '', 'If you did not request this, you can safely ignore this email.'].join('\n');
  const html    = emailShell(`
    <p style="margin:0 0 16px">${intro}</p>
    <div style="font-size:2.4rem;font-weight:800;letter-spacing:.18em;background:#f3f2fa;border-radius:14px;padding:20px 28px;display:inline-block;margin-bottom:24px">${code}</div>
    <p style="color:#6c6784;font-size:.9rem;margin:0">Valid for <strong>10 minutes</strong>. Do not share this code.</p>
    <p style="color:#a39fb8;font-size:.8rem;margin:12px 0 0">If you did not request this, you can safely ignore this email.</p>
  `);

  await sendMail({ email, subject, text, html });
}

// ── Family link notification email ───────────────────────────────────────────
// Sent to the *other* party when a link is initiated, so they know to open the
// app and approve it.
async function sendFamilyLinkEmail(toEmail, { fromEmail, initiatedAs }) {
  const who    = initiatedAs === 'parent' ? 'a parent' : 'a child';
  const action = initiatedAs === 'parent'
    ? 'A parent has invited you to link your account so they can monitor your tasks.'
    : 'A child account has requested to be linked to your Karyadhara account.';

  const subject = 'Karyadhara — family link request';
  const text = [
    action,
    `Requested by: ${fromEmail}`,
    '',
    'Open Karyadhara and go to Family → Pending Requests to approve or ignore this request.',
    '',
    'If you do not recognise this request, you can safely ignore this email.',
  ].join('\n');
  const html = emailShell(`
    <p style="margin:0 0 16px">${action}</p>
    <p style="margin:0 0 16px;color:#6c6784">Requested by: <strong>${fromEmail}</strong></p>
    <p style="margin:0 0 16px">Open <strong>Karyadhara</strong> and go to
      <em>Family → Pending Requests</em> to approve or ignore.</p>
    <p style="color:#a39fb8;font-size:.85rem;margin:0">If you do not recognise this, ignore the email.</p>
  `);

  await sendMail({ email: toEmail, subject, text, html });
}

// ── Daily overdue digest email ────────────────────────────────────────────────
// forName: whose tasks these are (display name or email)
// items:   array of { text, dueDate } (task objects)
async function sendOverdueDigestEmail(toEmail, { forName, items }) {
  if (!items || items.length === 0) return;

  const listText = items.map((t, i) => `${i + 1}. ${t.text}${t.dueDate ? ` (due ${t.dueDate})` : ''}`).join('\n');
  const listHtml = items.map(t =>
    `<li style="margin-bottom:6px">${escHtml(t.text)}${t.dueDate ? ` <span style="color:#6c6784;font-size:.85em">(due ${escHtml(t.dueDate)})</span>` : ''}</li>`
  ).join('');

  const subject = `Karyadhara — ${items.length} overdue task${items.length !== 1 ? 's' : ''} for ${forName}`;
  const text = [
    `Overdue tasks for ${forName}:`,
    '',
    listText,
    '',
    'Open Karyadhara to catch up.',
  ].join('\n');
  const html = emailShell(`
    <p style="margin:0 0 16px">These tasks for <strong>${escHtml(forName)}</strong> are overdue:</p>
    <ul style="padding-left:20px;margin:0 0 24px">${listHtml}</ul>
    <p style="margin:0">
      <a href="${process.env.ORIGIN || 'https://karyadhara.onrender.com'}"
         style="background:#6c6784;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:700;display:inline-block">
        Open Karyadhara
      </a>
    </p>
  `);

  await sendMail({ email: toEmail, subject, text, html });
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── SMS (SMS Gateway for Android) ────────────────────────────────────────────
function getSmsGatewayConfig() {
  const user    = process.env.SMS_GATEWAY_USER;
  const pass    = process.env.SMS_GATEWAY_PASS;
  const baseUrl = (process.env.SMS_GATEWAY_BASE_URL || 'https://api.sms-gate.app/3rdparty/v1').replace(/\/+$/, '');
  if (!user || !pass) return null;
  return { user, pass, baseUrl };
}

async function sendOtpSms(phone, code, { purpose } = {}) {
  const config = getSmsGatewayConfig();
  if (!config) {
    const err = new Error('SMS is not configured on this server.');
    err.code  = 'SMS_NOT_CONFIGURED';
    throw err;
  }
  const verb = purpose === 'register' ? 'Verify your number' : 'Sign-in code';
  const text = `Karyadhara — ${verb}: ${code}. Valid for 10 minutes. Do not share it with anyone.`;
  const auth = Buffer.from(`${config.user}:${config.pass}`).toString('base64');

  const res = await fetch(`${config.baseUrl}/messages`, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ textMessage: { text }, phoneNumbers: [phone] }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const err  = new Error(`SMS gateway rejected the message (${res.status}): ${body || res.statusText}`);
    err.code   = 'SMS_SEND_FAILED';
    throw err;
  }
}

module.exports = { sendOtpEmail, sendOtpSms, sendOverdueDigestEmail, sendFamilyLinkEmail };
