'use strict';
const express    = require('express');
const bcrypt     = require('bcryptjs');
const nodemailer = require('nodemailer');
const rateLimit  = require('express-rate-limit');
const { pool }   = require('../db');
const { setAuthCookie } = require('../auth');

const router = express.Router();

// ── Nodemailer transporter (Gmail App Password — free) ─────────────────────
let transporter;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: false,   // STARTTLS on port 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

// ── Rate limiting ──────────────────────────────────────────────────────────
// Tight limit on /send to prevent email-bombing
const sendLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many code requests. Please wait 15 minutes.' }
});
const verifyLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please request a new code.' }
});

// ── Helpers ────────────────────────────────────────────────────────────────
function generateCode() {
  // Cryptographically random 6-digit code
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(100000 + (buf[0] % 900000));
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ═══════════════════════════════════════════════════════════════════════════
//  POST /api/otp/send
//  Body: { email }
//  Sends a 6-digit OTP to the given email. Works for login AND register.
// ═══════════════════════════════════════════════════════════════════════════
router.post('/otp/send', sendLimit, async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });

  try {
    const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (!rows.length) {
      // Silently succeed — never reveal whether an account exists
      return res.json({ ok: true, created: false });
    }
    const userId = rows[0].id;

    // Invalidate any previous active OTP for this user
    await pool.query(
      "UPDATE otp_codes SET used = true WHERE user_id = $1 AND purpose = 'login' AND used = false",
      [userId]
    );

    const code      = generateCode();
    const codeHash  = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await pool.query(
      "INSERT INTO otp_codes (user_id, code_hash, purpose, expires_at) VALUES ($1, $2, 'login', $3)",
      [userId, codeHash, expiresAt]
    );

    await getTransporter().sendMail({
      from: `"Karyadhara" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `${code} — your Karyadhara sign-in code`,
      text: [
        `Your one-time sign-in code is: ${code}`,
        '',
        'Valid for 10 minutes. Do not share it with anyone.',
        '',
        'If you did not request this, you can safely ignore this email.',
      ].join('\n'),
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
          <h2 style="font-size:1.6rem;font-weight:800;margin:0 0 8px">Karyadhara</h2>
          <p style="color:#6c6784;margin:0 0 28px">कार्यधारा · a steady stream of work</p>
          <p style="margin:0 0 16px">Your one-time sign-in code:</p>
          <div style="font-size:2.4rem;font-weight:800;letter-spacing:.18em;background:#f3f2fa;border-radius:14px;padding:20px 28px;display:inline-block;margin-bottom:24px">${code}</div>
          <p style="color:#6c6784;font-size:.9rem;margin:0">Valid for <strong>10 minutes</strong>. Do not share this code.</p>
          <p style="color:#a39fb8;font-size:.8rem;margin:24px 0 0">If you did not request this, you can safely ignore this email.</p>
        </div>
      `,
    });

    res.json({ ok: true });
  } catch (e) {
    console.error('[otp/send]', e);
    res.status(500).json({ error: 'Could not send code. Please try again.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  POST /api/otp/verify
//  Body: { email, code }
//  Verifies the OTP and sets a session cookie on success.
// ═══════════════════════════════════════════════════════════════════════════
router.post('/otp/verify', verifyLimit, async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const code  = String(req.body.code  || '').trim().replace(/\s/g, '');

  if (!EMAIL_RE.test(email) || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: 'Invalid request.' });
  }

  try {
    const { rows: userRows } = await pool.query(
      'SELECT id FROM users WHERE email = $1', [email]
    );
    // Constant-time path: always run bcrypt even if user not found to prevent timing attacks
    const dummyHash = '$2b$10$invalidhashfortimingneutrality0000000000000000';
    const userId = userRows.length ? userRows[0].id : null;

    let otpRow = null;
    if (userId) {
      const { rows: otpRows } = await pool.query(
        `SELECT id, code_hash FROM otp_codes
         WHERE user_id = $1 AND purpose = 'login'
           AND used = false AND expires_at > now()
         ORDER BY id DESC LIMIT 1`,
        [userId]
      );
      otpRow = otpRows[0] ?? null;
    }

    const hashToCheck = otpRow ? otpRow.code_hash : dummyHash;
    const valid = await bcrypt.compare(code, hashToCheck);

    if (!valid || !userId || !otpRow) {
      return res.status(401).json({ error: 'Invalid or expired code.' });
    }

    // Mark code as used
    await pool.query('UPDATE otp_codes SET used = true WHERE id = $1', [otpRow.id]);

    setAuthCookie(res, userId);
    res.json({ ok: true });
  } catch (e) {
    console.error('[otp/verify]', e);
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
});

module.exports = router;
