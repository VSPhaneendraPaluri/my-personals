'use strict';
const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();
router.use(requireAuth);

// ── Helper: check whether req.userId may access targetUserId's data ──────────
// A user can always access their own data.
// A parent can access a child's data when a verified parent_links row exists.
async function canAccess(requesterId, targetId) {
  if (requesterId === targetId) return true;
  const { rows } = await pool.query(
    `SELECT 1 FROM parent_links
     WHERE parent_id = $1 AND child_id = $2 AND status = 'verified'
     LIMIT 1`,
    [requesterId, targetId]
  );
  return rows.length > 0;
}

// ── GET /api/data  — own data ─────────────────────────────────────────────────
router.get('/data', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT date, topics, history FROM user_data WHERE user_id = $1',
      [req.userId]
    );
    if (!result.rows.length) {
      return res.json({ date: new Date().toISOString().slice(0, 10), topics: [], history: {} });
    }
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// ── PUT /api/data  — own data ─────────────────────────────────────────────────
router.put('/data', async (req, res, next) => {
  try {
    const { date, topics, history } = req.body || {};
    if (typeof date !== 'string' || !Array.isArray(topics) || typeof history !== 'object' || history === null) {
      return res.status(400).json({ error: 'Malformed data.' });
    }
    // Stamp each topic with added_by / assigned_to defaults for own data.
    const stamped = topics.map(t => ({
      ...t,
      added_by:    t.added_by    || { userId: req.userId, role: 'standalone' },
      assigned_to: t.assigned_to !== undefined ? t.assigned_to : req.userId,
    }));
    await pool.query(
      `INSERT INTO user_data (user_id, date, topics, history, updated_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (user_id) DO UPDATE SET date = $2, topics = $3, history = $4, updated_at = now()`,
      [req.userId, date, JSON.stringify(stamped), JSON.stringify(history)]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ── GET /api/children/:id/data  — parent reads a child's data ────────────────
router.get('/children/:id/data', async (req, res, next) => {
  try {
    const childId = parseInt(req.params.id, 10);
    if (!(await canAccess(req.userId, childId))) {
      return res.status(403).json({ error: 'Not authorised to view this child\'s data.' });
    }
    const result = await pool.query(
      'SELECT date, topics, history FROM user_data WHERE user_id = $1',
      [childId]
    );
    if (!result.rows.length) {
      return res.json({ date: new Date().toISOString().slice(0, 10), topics: [], history: {} });
    }
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// ── PUT /api/children/:id/data  — parent writes to a child's data ────────────
router.put('/children/:id/data', async (req, res, next) => {
  try {
    const childId = parseInt(req.params.id, 10);
    if (!(await canAccess(req.userId, childId))) {
      return res.status(403).json({ error: 'Not authorised to edit this child\'s data.' });
    }
    const { date, topics, history } = req.body || {};
    if (typeof date !== 'string' || !Array.isArray(topics) || typeof history !== 'object' || history === null) {
      return res.status(400).json({ error: 'Malformed data.' });
    }
    // Tag any new tasks added by this parent with their identity.
    const parentInfo = await pool.query('SELECT role FROM users WHERE id = $1', [req.userId]);
    const parentRole = parentInfo.rows[0]?.role || 'parent';
    const stamped = topics.map(t => ({
      ...t,
      added_by:    t.added_by    || { userId: req.userId, role: parentRole },
      assigned_to: t.assigned_to !== undefined ? t.assigned_to : childId,
    }));
    await pool.query(
      `INSERT INTO user_data (user_id, date, topics, history, updated_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (user_id) DO UPDATE SET date = $2, topics = $3, history = $4, updated_at = now()`,
      [childId, date, JSON.stringify(stamped), JSON.stringify(history)]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ── GET /api/export  — export own history ─────────────────────────────────────
function pad(n) { return String(n).padStart(2, '0'); }

router.get('/export', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT date, topics, history FROM user_data WHERE user_id = $1',
      [req.userId]
    );
    const row = result.rows[0] || { date: null, topics: [], history: {} };
    const history = { ...row.history };
    if (row.date) history[row.date] = row.topics;

    const d = new Date();
    const filename = `Karyadhara-History-${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.json`;
    const collated = { exportedAt: d.toISOString(), dayCount: Object.keys(history).length, history };

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(collated, null, 2));
  } catch (err) { next(err); }
});

module.exports = router;
