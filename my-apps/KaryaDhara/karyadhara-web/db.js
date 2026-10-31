const { Pool } = require('pg');

// Neon requires SSL always; never conditional.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initSchema() {
  // ── Existing tables ────────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id           SERIAL PRIMARY KEY,
      email        TEXT UNIQUE,
      password_hash TEXT,                  -- NULL for passwordless (passkey-only) accounts
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // ── Migration: email/mobile registration + verification ───────────────────
  await pool.query(`ALTER TABLE users ALTER COLUMN email DROP NOT NULL;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT UNIQUE;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT false;`);
  await pool.query(`
    DO $$
    BEGIN
      ALTER TABLE users ADD CONSTRAINT users_email_or_phone_chk CHECK (email IS NOT NULL OR phone IS NOT NULL);
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);

  // ── Parent/Child monitoring columns ───────────────────────────────────────
  // role: 'standalone' (default) | 'parent' | 'child'
  // A 'parent' can also own their own tasks — role merely signals "has linked children".
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'standalone';`);
  // Required for child accounts; used to auto-expire monitoring when they turn 18.
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;`);

  // ── user_data ─────────────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_data (
      user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      date       TEXT NOT NULL,
      topics     JSONB NOT NULL DEFAULT '[]'::jsonb,
      history    JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // ── Passkey credentials ────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS passkey_credentials (
      id          TEXT PRIMARY KEY,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      public_key  BYTEA NOT NULL,
      counter     BIGINT NOT NULL DEFAULT 0,
      device_type TEXT,
      backed_up   BOOLEAN DEFAULT false,
      transports  TEXT[],
      name        TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // ── OTP codes (email + SMS) ──────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS otp_codes (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code_hash  TEXT NOT NULL,
      purpose    TEXT NOT NULL DEFAULT 'login',
      channel    TEXT NOT NULL DEFAULT 'email',
      expires_at TIMESTAMPTZ NOT NULL,
      used       BOOLEAN NOT NULL DEFAULT false
    );
  `);
  await pool.query(`ALTER TABLE otp_codes ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'email';`);

  // ── Parent–child links ────────────────────────────────────────────────────
  // One row per (parent, child) pair.  Multiple parents per child are supported
  // (see §2 of the plan).  'status' drives the verification flow and will host
  // the future unlink/revoke feature without a schema change.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS parent_links (
      id          SERIAL PRIMARY KEY,
      parent_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      child_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status      TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'verified' | 'revoked'
      created_by  TEXT NOT NULL,                    -- 'parent' | 'child' (who initiated)
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      verified_at TIMESTAMPTZ,
      UNIQUE (parent_id, child_id)
    );
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_parent_links_child  ON parent_links(child_id);
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_parent_links_parent ON parent_links(parent_id);
  `);

  // ── Notification preferences ──────────────────────────────────────────────
  // (user_id, watcher_id): watcher receives notifications about user_id's tasks.
  // For a standalone account's own digest: watcher_id = user_id.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notification_prefs (
      user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      watcher_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      overdue_digest   BOOLEAN NOT NULL DEFAULT true,
      per_task_alerts  BOOLEAN NOT NULL DEFAULT false,
      PRIMARY KEY (user_id, watcher_id)
    );
  `);

  // ── Indexes ───────────────────────────────────────────────────────────────
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_otp_user_active
    ON otp_codes (user_id, purpose, used, expires_at);
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_passkey_user
    ON passkey_credentials (user_id);
  `);
}

module.exports = { pool, initSchema };
