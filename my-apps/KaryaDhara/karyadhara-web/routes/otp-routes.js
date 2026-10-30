'use strict';
const express   = require('express');
const rateLimit = require('express-rate-limit');
const { pool }  = require('../db');
const { setAuthCookie } = require('../auth');
const { parseIdentifier, identifierHint } = require('../lib/identifier');
const { createAndSendOtp, verifyOtp } = require('../lib/otp');

const router = express.Router();

// ── Rate limiting ──────────────────────────────────────────────────────────
// Tight limit on /send to prevent email-bombing / SMS-bombing
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

// ═══════════════════════════════════════════════════════════════════════════
//  POST /api/otp/send
//  Body: { identifier }
//  Sends a 6-digit login code to the given email or mobile number — an
//  optional passwordless / second-factor sign-in path for an *existing,
//  already-verified* account. (First-time verification after sign-up is
//  handled by /api/register and /api/register/verify instead.)
// ═══════════════════════════════════════════════════════════════════════════
router.post('/otp/send', sendLimit, async (req, res) => {
  const identifier = req.body.identifier || req.body.email || req.body.phone;
  const parsed = parseIdentifier(identifier);
  if (!parsed) return res.status(400).json({ error: identifierHint() });

  try {
    const column = parsed.type === 'email' ? 'email' : 'phone';
    const { rows } = await pool.query(
      `SELECT id, ${column}_verified AS verified FROM users WHERE ${column} = $1`,
      [parsed.value]
    );

    // Silently succeed if there's no account, or it was never verified —
    // never reveal account existence, and don't hand out a "login" code
    // for an identity that hasn't completed sign-up verification yet.
    if (!rows.length || !rows[0].verified) {
      return res.json({ ok: true });
    }

    await createAndSendOtp({
      userId: rows[0].id,
      purpose: 'login',
      channel: parsed.type,
      destination: parsed.value,
    });

    res.json({ ok: true });
  } catch (e) {
    console.error('[otp/send]', e);
    res.status(500).json({ error: 'Could not send code. Please try again.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  POST /api/otp/verify
//  Body: { identifier, code }
//  Verifies a login code sent by /api/otp/send and sets a session cookie.
// ═══════════════════════════════════════════════════════════════════════════
router.post('/otp/verify', verifyLimit, async (req, res) => {
  const identifier = req.body.identifier || req.body.email || req.body.phone;
  const code = String(req.body.code || '').trim().replace(/\s/g, '');
  const parsed = parseIdentifier(identifier);

  if (!parsed || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: 'Invalid request.' });
  }

  try {
    const column = parsed.type === 'email' ? 'email' : 'phone';
    const { rows } = await pool.query(`SELECT id FROM users WHERE ${column} = $1`, [parsed.value]);
    const userId = rows.length ? rows[0].id : null;

    const valid = await verifyOtp({ userId, purpose: 'login', code });
    if (!valid) return res.status(401).json({ error: 'Invalid or expired code.' });

    setAuthCookie(res, userId);
    res.json({ ok: true });
  } catch (e) {
    console.error('[otp/verify]', e);
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
});

module.exports = router;
