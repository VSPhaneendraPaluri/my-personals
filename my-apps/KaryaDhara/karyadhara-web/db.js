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
      email        TEXT UNIQUE NOT NULL,
      password_hash TEXT,                  -- NULL for passwordless (passkey-only) accounts
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

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
  // One user can have multiple credentials (phone, laptop, YubiKey, …)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS passkey_credentials (
      id          TEXT PRIMARY KEY,          -- base64url credential ID from authenticator
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      public_key  BYTEA NOT NULL,            -- CBOR-encoded public key
      counter     BIGINT NOT NULL DEFAULT 0, -- replay-attack prevention
      device_type TEXT,                      -- 'singleDevice' | 'multiDevice'
      backed_up   BOOLEAN DEFAULT false,     -- synced to iCloud/Google keychain?
      transports  TEXT[],                    -- ['internal','hybrid','usb', …]
      name        TEXT,                      -- user-chosen label, e.g. "iPhone 16"
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // ── OTP codes (email fallback) ─────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS otp_codes (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code_hash  TEXT NOT NULL,               -- bcrypt of 6-digit code
      purpose    TEXT NOT NULL DEFAULT 'login',
      expires_at TIMESTAMPTZ NOT NULL,
      used       BOOLEAN NOT NULL DEFAULT false
    );
  `);

  // Index: fast lookup of active OTPs per user
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_otp_user_active
    ON otp_codes (user_id, purpose, used, expires_at);
  `);

  // Index: fast lookup of credentials per user
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_passkey_user
    ON passkey_credentials (user_id);
  `);
}

module.exports = { pool, initSchema };
