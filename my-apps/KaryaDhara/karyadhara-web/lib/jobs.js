'use strict';
/**
 * jobs.js — Scheduled background jobs
 *
 * Exported functions (called from server.js after DB is ready):
 *   startJobs()  — registers all cron-like intervals
 *
 * Jobs:
 *   1. Daily overdue digest  — runs once per day at 07:00 local time.
 *      For each user with overdue tasks, sends a digest to them and to
 *      each verified parent whose notification_prefs allow it.
 *
 *   2. Daily age-out check   — piggybacks on the same daily tick.
 *      Any child account that has turned 18 today or earlier is promoted
 *      to 'standalone', all parent_links rows flipped to 'revoked', and
 *      both the former child and each parent are emailed.
 *
 * No external cron library is used: a self-scheduling setTimeout
 * approach keeps the dependency list minimal and is perfectly adequate
 * for a single-process deployment on Render.
 */

const { pool }                  = require('../db');
const { sendOverdueDigestEmail } = require('./notify');
const nodemailer                 = require('nodemailer'); // re-used for age-out email

// ── Utilities ─────────────────────────────────────────────────────────────────
function msUntilNext7AM() {
  const now  = new Date();
  const next = new Date(now);
  next.setHours(7, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next - now;
}

function scheduleDailyAt7AM(fn) {
  setTimeout(async () => {
    try { await fn(); } catch (e) { console.error('[jobs] daily job error:', e); }
    // Re-schedule for the next day.
    setInterval(async () => {
      try { await fn(); } catch (e) { console.error('[jobs] daily job error:', e); }
    }, 24 * 60 * 60 * 1000);
  }, msUntilNext7AM());
}

// ── Job 1: daily overdue digest ───────────────────────────────────────────────
async function runOverdueDigest() {
  console.log('[jobs] running overdue digest');
  const today = new Date().toISOString().slice(0, 10);

  // Fetch all user_data rows that have at least one open (not done) topic
  // whose due-date is before today, or simply has an old date column.
  // "Overdue" definition: the user_data.date is in the past AND topics still
  // have undone items.  We send the digest regardless of due-date per task
  // (due-date per task is a future feature; for now all undone tasks on a
  // past date count as overdue).
  const { rows: userData } = await pool.query(`
    SELECT ud.user_id, ud.date, ud.topics, u.email, u.role
    FROM user_data ud
    JOIN users u ON u.id = ud.user_id
    WHERE ud.date < $1
      AND u.email IS NOT NULL
  `, [today]);

  for (const row of userData) {
    const topics   = row.topics || [];
    const overdue  = topics.filter(t => !t.done);
    if (overdue.length === 0) continue;

    const items = overdue.map(t => ({ text: t.text || t.title || '(task)', dueDate: row.date }));

    // 1a. Check if the user wants their own digest.
    const { rows: selfPref } = await pool.query(
      `SELECT overdue_digest FROM notification_prefs
       WHERE user_id = $1 AND watcher_id = $1`,
      [row.user_id]
    );
    // Default is true when no row exists.
    const selfWants = selfPref.length === 0 ? true : selfPref[0].overdue_digest;

    if (selfWants && row.email) {
      try {
        await sendOverdueDigestEmail(row.email, { forName: row.email, items });
      } catch (e) {
        console.error(`[jobs] digest email failed for user ${row.user_id}:`, e.message);
      }
    }

    // 1b. Send digest to each verified parent who has opted in.
    if (row.role === 'child') {
      const { rows: parents } = await pool.query(`
        SELECT pl.parent_id, u.email AS parent_email, np.overdue_digest
        FROM parent_links pl
        JOIN users u ON u.id = pl.parent_id
        LEFT JOIN notification_prefs np
          ON np.user_id = pl.child_id AND np.watcher_id = pl.parent_id
        WHERE pl.child_id = $1 AND pl.status = 'verified'
          AND u.email IS NOT NULL
      `, [row.user_id]);

      for (const parent of parents) {
        // Default is true when no pref row exists.
        const wants = parent.overdue_digest === null ? true : parent.overdue_digest;
        if (!wants) continue;
        try {
          await sendOverdueDigestEmail(parent.parent_email, {
            forName: row.email,
            items,
          });
        } catch (e) {
          console.error(`[jobs] digest email to parent ${parent.parent_id} failed:`, e.message);
        }
      }
    }
  }

  console.log(`[jobs] overdue digest done — checked ${userData.length} rows`);
}

// ── Job 2: age-out monitoring at 18 ──────────────────────────────────────────
async function runAgeOut() {
  console.log('[jobs] running age-out check');
  const today = new Date().toISOString().slice(0, 10);

  // Find all child accounts that are now 18 or older.
  const { rows: aged } = await pool.query(`
    SELECT u.id, u.email, u.date_of_birth
    FROM users u
    WHERE u.role = 'child'
      AND u.date_of_birth IS NOT NULL
      AND (u.date_of_birth + INTERVAL '18 years') <= $1::date
  `, [today]);

  for (const child of aged) {
    try {
      // Promote to standalone and revoke all parent links.
      await pool.query(
        `UPDATE users SET role = 'standalone' WHERE id = $1`,
        [child.id]
      );
      const { rows: links } = await pool.query(
        `UPDATE parent_links SET status = 'revoked'
         WHERE child_id = $1 AND status = 'verified'
         RETURNING parent_id`,
        [child.id]
      );

      // Notify the former child.
      if (child.email) {
        await sendAgeOutEmail(child.email, { isChild: true });
      }

      // Notify each former parent.
      for (const link of links) {
        const { rows: parentRows } = await pool.query(
          'SELECT email FROM users WHERE id = $1',
          [link.parent_id]
        );
        if (parentRows[0]?.email) {
          await sendAgeOutEmail(parentRows[0].email, {
            isChild:     false,
            childEmail:  child.email,
          });
        }
      }

      console.log(`[jobs] aged out user ${child.id} (${child.email}), revoked ${links.length} links`);
    } catch (e) {
      console.error(`[jobs] age-out failed for user ${child.id}:`, e.message);
    }
  }

  console.log(`[jobs] age-out done — processed ${aged.length} account(s)`);
}

// Simple plain-text age-out notification (reuses the same Brevo/SMTP path
// via notify.js for consistency).
const { sendMail: _sendMail } = (() => {
  // We import only what we need; notify.js does not export sendMail directly,
  // so we replicate the tiny dispatcher here.
  const { sendOverdueDigestEmail: _o, ...rest } = require('./notify');
  // Re-export the internal sendMail by building a thin wrapper around the
  // exported functions.  In practice we just call sendOverdueDigestEmail
  // with a synthetic single item for the age-out message — this reuses the
  // Brevo/SMTP routing without duplicating it.
  return {};
})();

async function sendAgeOutEmail(toEmail, { isChild, childEmail }) {
  // We send the age-out notification by reusing sendOverdueDigestEmail's
  // underlying channel (Brevo/SMTP) but with bespoke content.
  // Since notify.js doesn't expose sendMail directly, we use the
  // nodemailer / Brevo path directly here.  (A future refactor can export
  // sendMail from notify.js to clean this up.)
  const subject = 'Karyadhara — monitoring period ended';
  const body = isChild
    ? 'You have turned 18. Your Karyadhara account is now independent — no parents can monitor your tasks any longer.'
    : `The Karyadhara account of ${childEmail} has turned 18. Monitoring has ended automatically as required.`;

  // Best-effort: use Brevo if available, else SMTP.
  try {
    if (process.env.BREVO_API_KEY) {
      const sender = process.env.MAIL_FROM || process.env.SMTP_USER;
      if (!sender) return;
      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'Karyadhara', email: sender },
          to: [{ email: toEmail }],
          subject,
          textContent: body,
          htmlContent: `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px"><h2 style="font-size:1.4rem;font-weight:800">Karyadhara</h2><p>${body}</p></div>`,
        }),
        signal: AbortSignal.timeout(15_000),
      });
    } else if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      const t = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        connectionTimeout: 10_000,
      });
      await t.sendMail({ from: `"Karyadhara" <${process.env.SMTP_USER}>`, to: toEmail, subject, text: body });
    }
  } catch (e) {
    console.error('[jobs] sendAgeOutEmail failed:', e.message);
  }
}

// ── Entry point ───────────────────────────────────────────────────────────────
function startJobs() {
  scheduleDailyAt7AM(async () => {
    await runOverdueDigest();
    await runAgeOut();
  });
  console.log('[jobs] daily jobs scheduled (next run at 07:00)');
}

module.exports = { startJobs };
