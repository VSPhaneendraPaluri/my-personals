'use strict';
const nodemailer = require('nodemailer');

// ── Email (Gmail App Password / any SMTP) ───────────────────────────────────
let mailTransporter;
function getMailTransporter() {
  if (!mailTransporter) {
    mailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: false, // STARTTLS on port 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      // Fail within ~10s instead of hanging if the SMTP host/port is
      // unreachable (e.g. the host blocks outbound SMTP) — a slow, silent
      // hang is worse than a clear error the UI can show.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 10_000,
    });
  }
  return mailTransporter;
}

async function sendOtpEmail(email, code, { purpose } = {}) {
  const useApi = !!process.env.BREVO_API_KEY;
  if (!useApi && (!process.env.SMTP_USER || !process.env.SMTP_PASS)) {
    const err = new Error('Email is not configured on this server.');
    err.code = 'EMAIL_NOT_CONFIGURED';
    throw err;
  }

  const heading = purpose === 'register' ? 'Verify your email' : 'Your sign-in code';
  const intro = purpose === 'register'
    ? 'Enter this code to finish creating your Karyadhara account:'
    : 'Your one-time sign-in code:';

  const subject = `${code} — ${heading}`;
  const text = [
      intro,
      code,
      '',
      'Valid for 10 minutes. Do not share it with anyone.',
      '',
      'If you did not request this, you can safely ignore this email.',
    ].join('\n');
  const html = `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <h2 style="font-size:1.6rem;font-weight:800;margin:0 0 8px">Karyadhara</h2>
        <p style="color:#6c6784;margin:0 0 28px">कार्यधारा · a steady stream of work</p>
        <p style="margin:0 0 16px">${intro}</p>
        <div style="font-size:2.4rem;font-weight:800;letter-spacing:.18em;background:#f3f2fa;border-radius:14px;padding:20px 28px;display:inline-block;margin-bottom:24px">${code}</div>
        <p style="color:#6c6784;font-size:.9rem;margin:0">Valid for <strong>10 minutes</strong>. Do not share this code.</p>
        <p style="color:#a39fb8;font-size:.8rem;margin:24px 0 0">If you did not request this, you can safely ignore this email.</p>
      </div>
    `;

  if (useApi) return sendViaBrevo({ email, subject, text, html });

  await getMailTransporter().sendMail({
    from: `"Karyadhara" <${process.env.SMTP_USER}>`,
    to: email,
    subject,
    text,
    html,
  });
}

// HTTPS email API (Brevo). Render's free tier blocks outbound SMTP (ports
// 25/465/587), so this goes over port 443 instead. Free plan: 300 emails/day.
// MAIL_FROM must be a sender verified in Brevo (Senders & IP → Senders).
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
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
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
    const err = new Error(`Brevo rejected the email (${res.status}): ${body || res.statusText}`);
    err.code = 'EMAIL_SEND_FAILED';
    throw err;
  }
}

// ── SMS (SMS Gateway for Android — free, open-source, self-hosted) ─────────
// https://github.com/capcom6/android-sms-gateway (Apache-2.0)
//
// There is no SMS "operator" that terminates messages onto the phone network
// for free — someone always pays the carrier a fraction of a cent per text.
// This integration avoids paying a *middleman* (Twilio/Vonage/etc.) for that:
// an old Android phone + its own SIM card becomes the gateway, and the open-
// source "SMS Gateway for Android" app exposes it over a small REST API.
// Most prepaid/postpaid SIM plans already bundle free or near-free local SMS,
// so the marginal cost per OTP is typically ₹0.
//
// Setup (see .env.example for the full walkthrough):
//   1. Install the app from https://github.com/capcom6/android-sms-gateway/releases
//   2. Turn on "Cloud Server" mode in the app and go Online — it hands you a
//      username/password and your messages relay through the free public
//      relay at api.sms-gate.app (itself open-source and self-hostable too,
//      see "Private Server" mode in the docs if you'd rather run that part
//      yourself as well).
//   3. Put those credentials in SMS_GATEWAY_USER / SMS_GATEWAY_PASS below.
function getSmsGatewayConfig() {
  const user = process.env.SMS_GATEWAY_USER;
  const pass = process.env.SMS_GATEWAY_PASS;
  const baseUrl = (process.env.SMS_GATEWAY_BASE_URL || 'https://api.sms-gate.app/3rdparty/v1').replace(/\/+$/, '');
  if (!user || !pass) return null;
  return { user, pass, baseUrl };
}

async function sendOtpSms(phone, code, { purpose } = {}) {
  const config = getSmsGatewayConfig();
  if (!config) {
    const err = new Error('SMS is not configured on this server.');
    err.code = 'SMS_NOT_CONFIGURED';
    throw err;
  }

  const verb = purpose === 'register' ? 'Verify your number' : 'Sign-in code';
  const text = `Karyadhara — ${verb}: ${code}. Valid for 10 minutes. Do not share it with anyone.`;
  const auth = Buffer.from(`${config.user}:${config.pass}`).toString('base64');

  const res = await fetch(`${config.baseUrl}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      textMessage: { text },
      phoneNumbers: [phone],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const err = new Error(`SMS gateway rejected the message (${res.status}): ${body || res.statusText}`);
    err.code = 'SMS_SEND_FAILED';
    throw err;
  }
}

module.exports = { sendOtpEmail, sendOtpSms };
