'use strict';
const express = require('express');
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');
const { pool } = require('../db');
const { setAuthCookie, requireAuth } = require('../auth');
const { parseIdentifier, identifierHint, MOBILE_SIGNUP_ENABLED } = require('../lib/identifier');
const rateLimit = require('express-rate-limit');

const router = express.Router();

const RP_NAME = process.env.RP_NAME || 'Karyadhara';
const RP_ID   = process.env.RP_ID;      // e.g. karyadhara.onrender.com
const ORIGIN  = process.env.ORIGIN;     // e.g. https://karyadhara.onrender.com

if (!RP_ID || !ORIGIN) {
  console.warn('[passkey] RP_ID or ORIGIN not set — passkey routes will error at runtime.');
}

// Per-IP rate limit for passkey endpoints
const pkLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.' }
});

// ── In-process challenge store ─────────────────────────────────────────────
// Challenges are short-lived (~60 s). For a single-instance free-tier app
// this Map is sufficient. For multi-instance deploys: move to Redis or DB.
const challenges = new Map();
const CHALLENGE_TTL_MS = 90_000;

function storeChallenge(key, value) {
  challenges.set(key, { value, expires: Date.now() + CHALLENGE_TTL_MS });
}
function consumeChallenge(key) {
  const entry = challenges.get(key);
  if (!entry) return null;
  challenges.delete(key);
  if (Date.now() > entry.expires) return null;
  return entry.value;
}
// Prune stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of challenges) { if (now > v.expires) challenges.delete(k); }
}, 5 * 60 * 1000);

// ── Helper: encode Buffer/Uint8Array to base64url ─────────────────────────
function toBase64url(buf) {
  return Buffer.from(buf).toString('base64url');
}

// ═══════════════════════════════════════════════════════════════════════════
//  REGISTRATION  (only for users already signed in via password/OTP)
// ═══════════════════════════════════════════════════════════════════════════

// POST /api/passkey/register/begin
// Returns WebAuthn PublicKeyCredentialCreationOptions
router.post('/passkey/register/begin', pkLimit, requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT email, phone FROM users WHERE id = $1', [req.userId]
    );
    if (!rows.length) return res.status(401).json({ error: 'User not found.' });
    const user = rows[0];
    const label = user.email || user.phone || `user-${req.userId}`;

    // Exclude credentials the user already registered (prevent duplicates)
    const existing = await pool.query(
      'SELECT id, transports FROM passkey_credentials WHERE user_id = $1',
      [req.userId]
    );

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userID: Uint8Array.from(Buffer.from(String(req.userId))),
      userName: label,
      userDisplayName: label,
      attestationType: 'none',
      excludeCredentials: existing.rows.map(c => ({
        id: c.id,
        transports: c.transports ?? [],
      })),
      authenticatorSelection: {
        residentKey: 'preferred',      // enables username-less login where supported
        userVerification: 'preferred', // biometric / PIN when possible
      },
    });

    storeChallenge(`reg_${req.userId}`, options.challenge);
    res.json(options);
  } catch (e) {
    console.error('[passkey/register/begin]', e);
    res.status(500).json({ error: 'Could not start passkey registration.' });
  }
});

// POST /api/passkey/register/complete
// Body: { credential: PublicKeyCredential (JSON), name?: string }
router.post('/passkey/register/complete', pkLimit, requireAuth, async (req, res) => {
  const challenge = consumeChallenge(`reg_${req.userId}`);
  if (!challenge) return res.status(400).json({ error: 'Registration session expired. Please try again.' });

  try {
    const verification = await verifyRegistrationResponse({
      response: req.body.credential,
      expectedChallenge: challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: false, // allow PIN fallback on older devices
    });

    if (!verification.verified || !verification.registrationInfo) {
      return res.status(400).json({ error: 'Passkey verification failed.' });
    }

    const {
      credentialID,
      credentialPublicKey,
      counter,
      credentialDeviceType,
      credentialBackedUp,
    } = verification.registrationInfo;

    const credName = (req.body.name || '').slice(0, 64) || 'My passkey';

    await pool.query(
      `INSERT INTO passkey_credentials
         (id, user_id, public_key, counter, device_type, backed_up, transports, name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO NOTHING`,
      [
        toBase64url(credentialID),
        req.userId,
        credentialPublicKey,       // Buffer / Uint8Array — pg stores as bytea
        counter,
        credentialDeviceType,
        credentialBackedUp,
        req.body.credential?.response?.transports ?? [],
        credName,
      ]
    );

    res.json({ ok: true });
  } catch (e) {
    console.error('[passkey/register/complete]', e);
    res.status(400).json({ error: e.message || 'Passkey registration failed.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  AUTHENTICATION  (login with passkey)
// ═══════════════════════════════════════════════════════════════════════════

// POST /api/passkey/login/begin
// Body: { identifier: string } (email or mobile number)
router.post('/passkey/login/begin', pkLimit, async (req, res) => {
  const raw = req.body.identifier ?? req.body.email ?? req.body.phone;
  const parsed = parseIdentifier(raw);
  if (!parsed) return res.status(400).json({ error: identifierHint() });

  try {
    const column = parsed.type === 'email' ? 'email' : 'phone';
    const { rows } = await pool.query(
      `SELECT id FROM users WHERE ${column} = $1`, [parsed.value]
    );
    if (!rows.length) return res.status(404).json({ error: MOBILE_SIGNUP_ENABLED ? 'No account with that email or mobile number.' : 'No account with that email.' });

    const userId = rows[0].id;
    const creds = await pool.query(
      'SELECT id, transports FROM passkey_credentials WHERE user_id = $1',
      [userId]
    );

    if (!creds.rows.length) {
      return res.status(400).json({ error: 'No passkeys registered for this account.' });
    }

    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      userVerification: 'preferred',
      allowCredentials: creds.rows.map(c => ({
        id: c.id,
        transports: c.transports ?? [],
      })),
    });

    storeChallenge(`auth_${userId}`, options.challenge);
    // Return userId so the frontend can pass it back in /complete
    res.json({ ...options, userId });
  } catch (e) {
    console.error('[passkey/login/begin]', e);
    res.status(500).json({ error: 'Could not start passkey login.' });
  }
});

// POST /api/passkey/login/complete
// Body: { userId: number, credential: AuthenticationResponseJSON }
router.post('/passkey/login/complete', pkLimit, async (req, res) => {
  const userId = parseInt(req.body.userId, 10);
  if (!userId) return res.status(400).json({ error: 'Missing userId.' });

  const challenge = consumeChallenge(`auth_${userId}`);
  if (!challenge) return res.status(400).json({ error: 'Authentication session expired. Please try again.' });

  try {
    const credId = req.body.credential?.id;
    const { rows } = await pool.query(
      'SELECT * FROM passkey_credentials WHERE id = $1 AND user_id = $2',
      [credId, userId]
    );
    if (!rows.length) return res.status(401).json({ error: 'Credential not found.' });

    const stored = rows[0];

    const verification = await verifyAuthenticationResponse({
      response: req.body.credential,
      expectedChallenge: challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: stored.id,
        publicKey: stored.public_key,   // Uint8Array from pg bytea
        counter: Number(stored.counter),
        transports: stored.transports ?? [],
      },
      requireUserVerification: false,
    });

    if (!verification.verified) {
      return res.status(401).json({ error: 'Passkey authentication failed.' });
    }

    // Update signature counter (replay-attack protection)
    await pool.query(
      'UPDATE passkey_credentials SET counter = $1 WHERE id = $2',
      [verification.authenticationInfo.newCounter, stored.id]
    );

    setAuthCookie(res, userId);
    res.json({ ok: true });
  } catch (e) {
    console.error('[passkey/login/complete]', e);
    res.status(401).json({ error: e.message || 'Passkey authentication failed.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  CREDENTIAL MANAGEMENT  (list / delete — authenticated users only)
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/passkeys  — list the current user's registered passkeys
router.get('/passkeys', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, name, device_type, backed_up, created_at
     FROM passkey_credentials WHERE user_id = $1 ORDER BY created_at`,
    [req.userId]
  );
  res.json({ passkeys: rows });
});

// DELETE /api/passkeys/:id  — remove one passkey
router.delete('/passkeys/:id', requireAuth, async (req, res) => {
  const result = await pool.query(
    'DELETE FROM passkey_credentials WHERE id = $1 AND user_id = $2 RETURNING id',
    [req.params.id, req.userId]
  );
  if (!result.rows.length) return res.status(404).json({ error: 'Credential not found.' });
  res.json({ ok: true });
});

module.exports = router;
