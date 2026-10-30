const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();
router.use(requireAuth); // every route below only ever touches req.userId's own row

router.get('/data', async (req, res) => {
  const result = await pool.query('SELECT date, topics, history FROM user_data WHERE user_id = $1', [req.userId]);
  if (!result.rows.length) return res.json({ date: new Date().toISOString().slice(0, 10), topics: [], history: {} });
  res.json(result.rows[0]);
});

router.put('/data', async (req, res) => {
  const { date, topics, history } = req.body || {};
  if (typeof date !== 'string' || !Array.isArray(topics) || typeof history !== 'object' || history === null) {
    return res.status(400).json({ error: 'Malformed data.' });
  }
  await pool.query(
    `INSERT INTO user_data (user_id, date, topics, history, updated_at)
     VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (user_id) DO UPDATE SET date = $2, topics = $3, history = $4, updated_at = now()`,
    [req.userId, date, JSON.stringify(topics), JSON.stringify(history)]
  );
  res.json({ ok: true });
});

function pad(n) { return String(n).padStart(2, '0'); }

// Each user can only ever export their own row — req.userId comes from their verified session.
router.get('/export', async (req, res) => {
  const result = await pool.query('SELECT date, topics, history FROM user_data WHERE user_id = $1', [req.userId]);
  const row = result.rows[0] || { date: null, topics: [], history: {} };
  const history = { ...row.history };
  if (row.date) history[row.date] = row.topics;

  const d = new Date();
  const filename = `Karyadhara-History-${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.json`;
  const collated = { exportedAt: d.toISOString(), dayCount: Object.keys(history).length, history };

  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(collated, null, 2));
});

module.exports = router;
