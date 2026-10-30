const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { pool } = require('../db');
const { setAuthCookie, clearAuthCookie, requireAuth } = require('../auth');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Slow down brute-force guessing on login/register, per IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.' }
});

router.post('/register', authLimiter, async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length) return res.status(409).json({ error: 'An account with that email already exists.' });

  const hash = await bcrypt.hash(password, 12);
  const result = await pool.query(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
    [email, hash]
  );
  const userId = result.rows[0].id;

  const today = new Date().toISOString().slice(0, 10);
  await pool.query(
    'INSERT INTO user_data (user_id, date, topics, history) VALUES ($1, $2, $3, $4)',
    [userId, today, JSON.stringify([]), JSON.stringify({})]
  );

  setAuthCookie(res, userId);
  res.json({ ok: true, email });
});

router.post('/login', authLimiter, async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  const result = await pool.query('SELECT id, password_hash FROM users WHERE email = $1', [email]);
  if (!result.rows.length) return res.status(401).json({ error: 'Incorrect email or password.' });

  const user = result.rows[0];
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Incorrect email or password.' });

  setAuthCookie(res, user.id);
  res.json({ ok: true, email });
});

router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

router.get('/me', requireAuth, async (req, res) => {
  const result = await pool.query('SELECT email FROM users WHERE id = $1', [req.userId]);
  if (!result.rows.length) return res.status(401).json({ error: 'Not signed in.' });
  res.json({ email: result.rows[0].email });
});

module.exports = router;
