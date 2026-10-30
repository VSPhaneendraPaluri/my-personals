'use strict';
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { sendOtpEmail, sendOtpSms } = require('./notify');

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const DUMMY_HASH = '$2b$10$invalidhashfortimingneutrality0000000000000000';

function generateCode() {
  // Cryptographically random 6-digit code
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(100000 + (buf[0] % 900000));
}

// Creates a fresh OTP for (userId, purpose), invalidating any earlier
// unused one for that purpose, and delivers it over the right channel:
// channel === 'email' -> email inbox, channel === 'phone' -> SMS.
async function createAndSendOtp({ userId, purpose, channel, destination }) {
  await pool.query(
    'UPDATE otp_codes SET used = true WHERE user_id = $1 AND purpose = $2 AND used = false',
    [userId, purpose]
  );

  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await pool.query(
    'INSERT INTO otp_codes (user_id, code_hash, purpose, channel, expires_at) VALUES ($1, $2, $3, $4, $5)',
    [userId, codeHash, purpose, channel, expiresAt]
  );

  if (channel === 'phone') {
    await sendOtpSms(destination, code, { purpose });
  } else {
    await sendOtpEmail(destination, code, { purpose });
  }
}

// Verifies a submitted code for (userId, purpose). Always runs bcrypt.compare
// even on a miss, so response timing doesn't reveal whether the user/code
// exists — important since this is reachable pre-login.
async function verifyOtp({ userId, purpose, code }) {
  let otpRow = null;
  if (userId) {
    const { rows } = await pool.query(
      `SELECT id, code_hash FROM otp_codes
       WHERE user_id = $1 AND purpose = $2 AND used = false AND expires_at > now()
       ORDER BY id DESC LIMIT 1`,
      [userId, purpose]
    );
    otpRow = rows[0] ?? null;
  }

  const hashToCheck = otpRow ? otpRow.code_hash : DUMMY_HASH;
  const valid = await bcrypt.compare(code, hashToCheck);

  if (!valid || !userId || !otpRow) return false;

  await pool.query('UPDATE otp_codes SET used = true WHERE id = $1', [otpRow.id]);
  return true;
}

module.exports = { createAndSendOtp, verifyOtp };
