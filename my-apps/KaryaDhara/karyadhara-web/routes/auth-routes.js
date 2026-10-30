const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { pool } = require('../db');
const { setAuthCookie, clearAuthCookie, requireAuth } = require('../auth');
const { parseIdentifier, identifierHint, MOBILE_SIGNUP_ENABLED } = require('../lib/identifier');
const { createAndSendOtp, verifyOtp } = require('../lib/otp');

const router = express.Router();

// Slow down brute-force guessing on login/register, per IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.' }
});
const otpSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many code requests. Please wait 15 minutes.' }
});
const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please request a new code.' }
});

function userColumnFor(type) {
  return type === 'email' ? 'email' : 'phone';
}

async function seedUserData(userId) {
  const today = new Date().toISOString().slice(0, 10);
  await pool.query(
    'INSERT INTO user_data (user_id, date, topics, history) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id) DO NOTHING',
    [userId, today, JSON.stringify([]), JSON.stringify({})]
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  POST /api/register
//  Body: { identifier, password }
//  identifier may be an email address or a mobile number. The account is
//  created in an UNVERIFIED state and a 6-digit code is sent to that same
//  email/mobile number — the browser is NOT logged in until the code is
//  confirmed via /api/register/verify.
// ═══════════════════════════════════════════════════════════════════════════
router.post('/register', authLimiter, otpSendLimiter, async (req, res) => {
  const raw = req.body.identifier ?? req.body.email ?? req.body.phone;
  const password = String(req.body.password || '');
  const parsed = parseIdentifier(raw);

  if (!parsed) return res.status(400).json({ error: identifierHint() });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

  const column = userColumnFor(parsed.type);
  const verifiedColumn = `${column}_verified`;

  try {
    const existing = await pool.query(
      `SELECT id, ${verifiedColumn} AS verified FROM users WHERE ${column} = $1`,
      [parsed.value]
    );

    let userId;
    if (existing.rows.length) {
      if (existing.rows[0].verified) {
        return res.status(409).json({ error: `An account with that ${parsed.type === 'email' ? 'email' : 'mobile number'} already exists.` });
      }
      // Unverified account from a previous, abandoned sign-up attempt —
      // update the password and resend a fresh code rather than blocking.
      userId = existing.rows[0].id;
      const hash = await bcrypt.hash(password, 12);
      await pool.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [hash, userId]);
    } else {
      const hash = await bcrypt.hash(password, 12);
      const result = await pool.query(
        `INSERT INTO users (${column}, password_hash) VALUES ($1, $2) RETURNING id`,
        [parsed.value, hash]
      );
      userId = result.rows[0].id;
      await seedUserData(userId);
    }

    await createAndSendOtp({
      userId,
      purpose: 'register',
      channel: parsed.type,
      destination: parsed.value,
    });

    res.json({ ok: true, pending: true, channel: parsed.type, destination: parsed.value });
  } catch (e) {
    if (e && e.code === 'SMS_NOT_CONFIGURED') {
      return res.status(500).json({ error: 'SMS verification is not set up on this server yet. Please sign up with email instead.' });
    }
    console.error('[register]', e);
    res.status(500).json({ error: 'Could not create account. Please try again.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  POST /api/register/resend
//  Body: { identifier }
//  Resends the first-time verification code for an account that already
//  exists but hasn't completed verification yet (password unchanged).
// ═══════════════════════════════════════════════════════════════════════════
router.post('/register/resend', otpSendLimiter, async (req, res) => {
  const raw = req.body.identifier ?? req.body.email ?? req.body.phone;
  const parsed = parseIdentifier(raw);
  if (!parsed) return res.status(400).json({ error: identifierHint() });

  const column = userColumnFor(parsed.type);
  const verifiedColumn = `${column}_verified`;

  try {
    const { rows } = await pool.query(
      `SELECT id, ${verifiedColumn} AS verified FROM users WHERE ${column} = $1`,
      [parsed.value]
    );
    // Don't reveal account existence either way.
    if (!rows.length || rows[0].verified) {
      return res.json({ ok: true, pending: true, channel: parsed.type, destination: parsed.value });
    }

    await createAndSendOtp({
      userId: rows[0].id,
      purpose: 'register',
      channel: parsed.type,
      destination: parsed.value,
    });

    res.json({ ok: true, pending: true, channel: parsed.type, destination: parsed.value });
  } catch (e) {
    if (e && e.code === 'SMS_NOT_CONFIGURED') {
      return res.status(500).json({ error: 'SMS verification is not set up on this server yet.' });
    }
    console.error('[register/resend]', e);
    res.status(500).json({ error: 'Could not resend code. Please try again.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  POST /api/register/verify
//  Body: { identifier, code }
//  Confirms the code sent by /api/register, marks the account verified, and
//  logs the user in for the first time.
// ═══════════════════════════════════════════════════════════════════════════
router.post('/register/verify', otpVerifyLimiter, async (req, res) => {
  const raw = req.body.identifier ?? req.body.email ?? req.body.phone;
  const code = String(req.body.code || '').trim().replace(/\s/g, '');
  const parsed = parseIdentifier(raw);

  if (!parsed || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: 'Invalid request.' });
  }

  const column = userColumnFor(parsed.type);
  const verifiedColumn = `${column}_verified`;

  try {
    const { rows } = await pool.query(`SELECT id FROM users WHERE ${column} = $1`, [parsed.value]);
    const userId = rows.length ? rows[0].id : null;

    const valid = await verifyOtp({ userId, purpose: 'register', code });
    if (!valid) return res.status(401).json({ error: 'Invalid or expired code.' });

    await pool.query(`UPDATE users SET ${verifiedColumn} = true WHERE id = $1`, [userId]);

    setAuthCookie(res, userId);
    res.json({ ok: true });
  } catch (e) {
    console.error('[register/verify]', e);
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  POST /api/login
//  Body: { identifier, password }
//  If the account hasn't completed first-time verification yet, this sends
//  a fresh code instead of granting a session, so the OTP step can never be
//  skipped by just logging back in with the password.
// ═══════════════════════════════════════════════════════════════════════════
router.post('/login', authLimiter, async (req, res) => {
  const raw = req.body.identifier ?? req.body.email ?? req.body.phone;
  const password = String(req.body.password || '');
  const parsed = parseIdentifier(raw);

  if (!parsed) return res.status(400).json({ error: identifierHint() });

  const column = userColumnFor(parsed.type);
  const verifiedColumn = `${column}_verified`;

  const result = await pool.query(
    `SELECT id, password_hash, ${verifiedColumn} AS verified FROM users WHERE ${column} = $1`,
    [parsed.value]
  );
  if (!result.rows.length) return res.status(401).json({ error: MOBILE_SIGNUP_ENABLED ? 'Incorrect email/mobile number or password.' : 'Incorrect email or password.' });

  const user = result.rows[0];
  const ok = user.password_hash ? await bcrypt.compare(password, user.password_hash) : false;
  if (!ok) return res.status(401).json({ error: MOBILE_SIGNUP_ENABLED ? 'Incorrect email/mobile number or password.' : 'Incorrect email or password.' });

  if (!user.verified) {
    try {
      await createAndSendOtp({
        userId: user.id,
        purpose: 'register',
        channel: parsed.type,
        destination: parsed.value,
      });
    } catch (e) {
      console.error('[login/verify-resend]', e);
      return res.status(500).json({ error: 'Could not send verification code. Please try again.' });
    }
    return res.json({ ok: true, pending: true, channel: parsed.type, destination: parsed.value });
  }

  setAuthCookie(res, user.id);
  res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

router.get('/me', requireAuth, async (req, res) => {
  const result = await pool.query('SELECT email, phone FROM users WHERE id = $1', [req.userId]);
  if (!result.rows.length) return res.status(401).json({ error: 'Not signed in.' });
  const { email, phone } = result.rows[0];
  res.json({ email, phone, identifier: email || phone });
});

module.exports = router;
