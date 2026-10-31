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
  const password    = String(req.body.password || '');
  const dateOfBirth = req.body.dateOfBirth || null; // ISO date string, only for child accounts
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
      const hash       = await bcrypt.hash(password, 12);
      const roleValue  = dateOfBirth ? 'child' : 'standalone';
      const result = await pool.query(
        `INSERT INTO users (${column}, password_hash, role, date_of_birth)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [parsed.value, hash, roleValue, dateOfBirth || null]
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
    if (e && e.code === 'EMAIL_NOT_CONFIGURED') {
      return res.status(500).json({ error: 'Email verification is not set up on this server yet. Please contact the site administrator.' });
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
    if (e && e.code === 'EMAIL_NOT_CONFIGURED') {
      return res.status(500).json({ error: 'Email verification is not set up on this server yet. Please contact the site administrator.' });
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
  const result = await pool.query(
    'SELECT id, email, phone, role, date_of_birth FROM users WHERE id = $1',
    [req.userId]
  );
  if (!result.rows.length) return res.status(401).json({ error: 'Not signed in.' });
  const { id, email, phone, role, date_of_birth } = result.rows[0];
  res.json({ id, email, phone, role, dateOfBirth: date_of_birth, identifier: email || phone });
});

// ═══════════════════════════════════════════════════════════════════════════
//  DELETE /api/account
//  Permanently deletes the authenticated user's account.
//
//  Behaviour by role:
//    standalone / child:
//      – Deletes the user row.  CASCADE handles all dependent rows.
//      – If child: notifies each linked parent by email.
//
//    parent:
//      – Finds each verified child.
//      – Children who have NO other verified parent after this deletion are
//        "orphaned" → their accounts are deleted along with the parent's.
//      – Children who have at least one other verified parent keep their
//        accounts; the link to this parent is removed / revoked.
//      – Emails every affected child and every co-parent before deleting.
//
//  DB cascade (ON DELETE CASCADE) already covers:
//    user_data, otp_codes, passkey_credentials, parent_links,
//    notification_prefs, passkey rows.
// ═══════════════════════════════════════════════════════════════════════════
router.delete('/account', requireAuth, async (req, res) => {
  const userId = req.userId;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Fetch the requesting user.
    const { rows: meRows } = await client.query(
      'SELECT id, email, phone, role FROM users WHERE id = $1',
      [userId]
    );
    if (!meRows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Account not found.' });
    }
    const me = meRows[0];

    // 2. If this user is a child, notify their parents before deletion.
    if (me.role === 'child') {
      const { rows: parents } = await client.query(
        `SELECT u.email FROM parent_links pl
         JOIN users u ON u.id = pl.parent_id
         WHERE pl.child_id = $1 AND pl.status = 'verified' AND u.email IS NOT NULL`,
        [userId]
      );
      for (const parent of parents) {
        try {
          await sendAccountDeletionEmail(parent.email, {
            subject: `Karyadhara — child account deleted`,
            body: `The child account ${me.email || me.phone} has been deleted by its owner. The monitoring link has ended.`,
          });
        } catch (_) { /* email failure must not block deletion */ }
      }
    }

    // 3. If this user is a parent, handle their children.
    if (me.role === 'parent') {
      // Fetch all verified children.
      const { rows: children } = await client.query(
        `SELECT u.id, u.email, u.phone FROM parent_links pl
         JOIN users u ON u.id = pl.child_id
         WHERE pl.parent_id = $1 AND pl.status = 'verified'`,
        [userId]
      );

      for (const child of children) {
        // Count other verified parents for this child (excluding the one being deleted).
        const { rows: otherParents } = await client.query(
          `SELECT pl.parent_id, u.email AS parent_email
           FROM parent_links pl
           JOIN users u ON u.id = pl.parent_id
           WHERE pl.child_id = $1 AND pl.parent_id != $2 AND pl.status = 'verified'`,
          [child.id, userId]
        );

        if (otherParents.length === 0) {
          // Orphaned child — delete their account (cascade handles everything).
          await client.query('DELETE FROM users WHERE id = $1', [child.id]);
          // Notify the child (best-effort — account is gone so they can't log in, but email is a courtesy).
          const childContact = child.email || child.phone;
          if (child.email) {
            try {
              await sendAccountDeletionEmail(child.email, {
                subject: 'Karyadhara — your account has been removed',
                body: `Your Karyadhara account (${childContact}) has been removed because your parent deleted their account and you had no other linked parent. If you want to continue using Karyadhara, you can create a new account at any time.`,
              });
            } catch (_) {}
          }
        } else {
          // Child keeps their account — revoke only the link to the departing parent.
          await client.query(
            `UPDATE parent_links SET status = 'revoked'
             WHERE parent_id = $1 AND child_id = $2`,
            [userId, child.id]
          );
          // Also downgrade to 'standalone' if this was their only parent.
          await client.query(
            `UPDATE users SET role = 'standalone'
             WHERE id = $1 AND (
               SELECT COUNT(*) FROM parent_links
               WHERE child_id = $1 AND status = 'verified' AND parent_id != $2
             ) = 0`,
            [child.id, userId]
          );
          // Notify the child that one parent left.
          if (child.email) {
            try {
              await sendAccountDeletionEmail(child.email, {
                subject: 'Karyadhara — a parent account was deleted',
                body: `The Karyadhara account of ${me.email || me.phone} has been deleted. Your account is unaffected — you still have ${otherParents.length} other linked parent(s).`,
              });
            } catch (_) {}
          }
          // Notify remaining co-parents.
          for (const op of otherParents) {
            if (op.parent_email) {
              try {
                await sendAccountDeletionEmail(op.parent_email, {
                  subject: 'Karyadhara — co-parent account deleted',
                  body: `The Karyadhara account of ${me.email || me.phone} (a co-parent of ${child.email || child.phone}) has been deleted. The child's account is unaffected.`,
                });
              } catch (_) {}
            }
          }
        }
      }
    }

    // 4. Delete the requesting user's own account.
    //    CASCADE removes: user_data, otp_codes, passkey_credentials,
    //    parent_links (as parent), notification_prefs.
    await client.query('DELETE FROM users WHERE id = $1', [userId]);

    await client.query('COMMIT');

    // 5. Clear the session cookie and respond.
    clearAuthCookie(res);
    res.json({ ok: true });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('[delete-account]', e);
    res.status(500).json({ error: 'Could not delete account. Please try again.' });
  } finally {
    client.release();
  }
});

// Thin email helper local to this file (reuses Brevo / SMTP path from notify.js).
const { sendOverdueDigestEmail: _unused, ...notifyExports } = require('../lib/notify');
async function sendAccountDeletionEmail(toEmail, { subject, body }) {
  const { sendFamilyLinkEmail: _f, sendOtpEmail: _o, sendOtpSms: _s, sendOverdueDigestEmail: _d, ...rest } = require('../lib/notify');
  // notify.js doesn't export a generic sendMail, so we use Brevo/SMTP directly.
  const useBrevo = !!process.env.BREVO_API_KEY;
  const sender   = process.env.MAIL_FROM || process.env.SMTP_USER;
  if (!sender) return; // silently skip if email is not configured

  const html = `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
    <h2 style="font-size:1.4rem;font-weight:800;margin:0 0 4px">Karyadhara</h2>
    <p style="color:#6c6784;font-size:.85rem;margin:0 0 24px">कार्यधारा · a steady stream of work</p>
    <p style="margin:0 0 16px">${body.replace(/\n/g, '<br>')}</p>
  </div>`;

  if (useBrevo) {
    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ sender: { name: 'Karyadhara', email: sender }, to: [{ email: toEmail }], subject, textContent: body, htmlContent: html }),
      signal: AbortSignal.timeout(12_000),
    });
  } else if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    const nodemailer = require('nodemailer');
    const t = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: false, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 10_000,
    });
    await t.sendMail({ from: `"Karyadhara" <${process.env.SMTP_USER}>`, to: toEmail, subject, text: body, html });
  }
}

module.exports = router;
