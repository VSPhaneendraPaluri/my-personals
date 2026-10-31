'use strict';
/**
 * family-routes.js — Parent/Child monitoring & linking
 *
 * POST   /api/family/invite           parent invites a child by email, or
 *                                     a child requests to link to a parent email
 * POST   /api/family/link/accept      approve a pending link (either side)
 * GET    /api/family/children         list verified children + today's summary
 * GET    /api/family/children/:id/tasks  parent view of one child's tasks
 * GET    /api/family/parents          list verified parents (used by child UI)
 * GET    /api/family/pending          pending link requests for current user
 * DELETE /api/family/link/:id         placeholder — returns 501 until designed
 */

const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../auth');
const { sendOverdueDigestEmail, sendFamilyLinkEmail } = require('../lib/notify');

const router = express.Router();
router.use(requireAuth);

// ── POST /api/family/invite ──────────────────────────────────────────────────
// A parent can invite a child by that child's email.
// A child can request linking by supplying a parent's email.
// 'initiator' is inferred from the current user's role or from the payload.
router.post('/family/invite', async (req, res, next) => {
  try {
    const { targetEmail, initiatedAs } = req.body || {};
    if (!targetEmail || typeof targetEmail !== 'string') {
      return res.status(400).json({ error: 'targetEmail is required.' });
    }
    // initiatedAs: 'parent' means current user is the parent inviting a child.
    //              'child'  means current user is the child requesting a parent.
    const createdBy = initiatedAs === 'child' ? 'child' : 'parent';

    // Look up the target user.
    const targetResult = await pool.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      [targetEmail.trim().toLowerCase()]
    );
    if (!targetResult.rows.length) {
      // Don't reveal whether the email exists; just say "invitation sent".
      // In a real deploy you'd queue an email to that address inviting them to sign up.
      return res.json({ ok: true, status: 'invited_pending_signup' });
    }
    const target = targetResult.rows[0];

    let parentId, childId;
    if (createdBy === 'parent') {
      parentId = req.userId;
      childId  = target.id;
    } else {
      parentId = target.id;
      childId  = req.userId;
    }

    if (parentId === childId) {
      return res.status(400).json({ error: 'Cannot link an account to itself.' });
    }

    // Insert or ignore if row already exists.
    const existing = await pool.query(
      'SELECT id, status FROM parent_links WHERE parent_id = $1 AND child_id = $2',
      [parentId, childId]
    );
    if (existing.rows.length) {
      const s = existing.rows[0].status;
      if (s === 'verified') return res.json({ ok: true, status: 'already_linked' });
      if (s === 'pending')  return res.json({ ok: true, status: 'already_pending' });
      if (s === 'revoked')  {
        // Re-open a revoked link.
        await pool.query(
          `UPDATE parent_links SET status = 'pending', created_by = $1, created_at = now(), verified_at = NULL
           WHERE parent_id = $2 AND child_id = $3`,
          [createdBy, parentId, childId]
        );
        return res.json({ ok: true, status: 'pending' });
      }
    }

    await pool.query(
      `INSERT INTO parent_links (parent_id, child_id, status, created_by)
       VALUES ($1, $2, 'pending', $3)`,
      [parentId, childId, createdBy]
    );

    // Notify the other side by email (best-effort; don't fail the request).
    try {
      const meResult = await pool.query('SELECT email FROM users WHERE id = $1', [req.userId]);
      const myEmail  = meResult.rows[0]?.email;
      if (target.email && myEmail) {
        await sendFamilyLinkEmail(target.email, {
          fromEmail: myEmail,
          initiatedAs: createdBy,
        });
      }
    } catch (_) { /* email failure is non-fatal */ }

    res.json({ ok: true, status: 'pending' });
  } catch (err) { next(err); }
});

// ── POST /api/family/link/accept ─────────────────────────────────────────────
// Approve a pending link.  The approver must be the *other* party from whoever
// created the link (if parent created it → child must accept; and vice-versa).
router.post('/family/link/accept', async (req, res, next) => {
  try {
    const { linkId } = req.body || {};
    if (!linkId) return res.status(400).json({ error: 'linkId is required.' });

    const linkResult = await pool.query(
      'SELECT * FROM parent_links WHERE id = $1',
      [linkId]
    );
    if (!linkResult.rows.length) {
      return res.status(404).json({ error: 'Link not found.' });
    }
    const link = linkResult.rows[0];

    if (link.status !== 'pending') {
      return res.status(400).json({ error: `Link is already ${link.status}.` });
    }

    // Verify the current user is the expected approver.
    const expectedApprover = link.created_by === 'parent' ? link.child_id : link.parent_id;
    if (req.userId !== expectedApprover) {
      return res.status(403).json({ error: 'You are not the expected approver for this link.' });
    }

    await pool.query(
      `UPDATE parent_links SET status = 'verified', verified_at = now() WHERE id = $1`,
      [linkId]
    );

    // Upgrade the child's role to 'child' and the parent's to 'parent'.
    await pool.query(
      `UPDATE users SET role = 'child'  WHERE id = $1 AND role = 'standalone'`,
      [link.child_id]
    );
    await pool.query(
      `UPDATE users SET role = 'parent' WHERE id = $1 AND role = 'standalone'`,
      [link.parent_id]
    );

    res.json({ ok: true, status: 'verified' });
  } catch (err) { next(err); }
});

// ── GET /api/family/pending ───────────────────────────────────────────────────
// Returns pending link requests relevant to the current user (as parent or child).
router.get('/family/pending', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT pl.id, pl.created_by, pl.created_at,
              p.email AS parent_email,
              c.email AS child_email
       FROM parent_links pl
       JOIN users p ON p.id = pl.parent_id
       JOIN users c ON c.id = pl.child_id
       WHERE pl.status = 'pending'
         AND (pl.parent_id = $1 OR pl.child_id = $1)`,
      [req.userId]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// ── GET /api/family/children ──────────────────────────────────────────────────
// List verified children with today's task completion summary.
router.get('/family/children', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.date_of_birth,
              ud.date AS today_date, ud.topics AS today_topics
       FROM parent_links pl
       JOIN users u ON u.id = pl.child_id
       LEFT JOIN user_data ud ON ud.user_id = u.id
       WHERE pl.parent_id = $1 AND pl.status = 'verified'
       ORDER BY u.email`,
      [req.userId]
    );

    const children = rows.map(r => {
      const topics = r.today_topics || [];
      const total  = topics.length;
      const done   = topics.filter(t => t.done).length;
      return {
        id:           r.id,
        email:        r.email,
        dateOfBirth:  r.date_of_birth,
        todayDate:    r.today_date,
        completionTotal:  total,
        completionDone:   done,
        completionStatus: total === 0 ? 'empty' : done === total ? 'complete' : done > 0 ? 'partial' : 'none',
      };
    });

    res.json(children);
  } catch (err) { next(err); }
});

// ── GET /api/family/parents ───────────────────────────────────────────────────
// Used by the child's UI to show the "Monitored by …" badge.
router.get('/family/parents', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.date_of_birth AS child_dob
       FROM parent_links pl
       JOIN users u ON u.id = pl.parent_id
       WHERE pl.child_id = $1 AND pl.status = 'verified'
       ORDER BY u.email`,
      [req.userId]
    );
    // Include child's own DOB for computing expiry date shown in the badge.
    const dobResult = await pool.query(
      'SELECT date_of_birth FROM users WHERE id = $1',
      [req.userId]
    );
    res.json({
      parents: rows,
      childDateOfBirth: dobResult.rows[0]?.date_of_birth || null,
    });
  } catch (err) { next(err); }
});

// ── GET /api/family/children/:id/tasks ───────────────────────────────────────
// Parent viewing one child's current task list.
// Actual read is handled by /api/children/:id/data in data-routes.js; this
// endpoint exists for future pagination / metadata needs.
router.get('/family/children/:id/tasks', async (req, res, next) => {
  try {
    const childId = parseInt(req.params.id, 10);
    const access = await pool.query(
      `SELECT 1 FROM parent_links WHERE parent_id = $1 AND child_id = $2 AND status = 'verified'`,
      [req.userId, childId]
    );
    if (!access.rows.length) {
      return res.status(403).json({ error: 'Not authorised.' });
    }
    const result = await pool.query(
      'SELECT date, topics, history FROM user_data WHERE user_id = $1',
      [childId]
    );
    const row = result.rows[0] || { date: new Date().toISOString().slice(0, 10), topics: [], history: {} };
    res.json(row);
  } catch (err) { next(err); }
});

// ── GET /api/family/notification-prefs ───────────────────────────────────────
router.get('/family/notification-prefs', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT user_id, watcher_id, overdue_digest, per_task_alerts
       FROM notification_prefs
       WHERE watcher_id = $1`,
      [req.userId]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// ── PUT /api/family/notification-prefs ───────────────────────────────────────
router.put('/family/notification-prefs', async (req, res, next) => {
  try {
    const { userId, overdueDigest, perTaskAlerts } = req.body || {};
    // watcher is always the current user; userId is whose tasks they watch.
    const targetUserId = userId || req.userId;

    // Verify the current user is allowed to set prefs for targetUserId.
    // They can always set their own; parents can set for their verified children.
    if (targetUserId !== req.userId) {
      const access = await pool.query(
        `SELECT 1 FROM parent_links WHERE parent_id = $1 AND child_id = $2 AND status = 'verified'`,
        [req.userId, targetUserId]
      );
      if (!access.rows.length) {
        return res.status(403).json({ error: 'Not authorised.' });
      }
    }

    await pool.query(
      `INSERT INTO notification_prefs (user_id, watcher_id, overdue_digest, per_task_alerts)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, watcher_id) DO UPDATE
         SET overdue_digest = $3, per_task_alerts = $4`,
      [targetUserId, req.userId,
       overdueDigest !== undefined ? overdueDigest : true,
       perTaskAlerts !== undefined ? perTaskAlerts : false]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ── DELETE /api/family/link/:id  (placeholder — §7 open item) ────────────────
router.delete('/family/link/:id', (_req, res) => {
  res.status(501).json({
    error: 'Unlink/revoke is not yet designed. See §7 of the implementation plan.',
  });
});

module.exports = router;
