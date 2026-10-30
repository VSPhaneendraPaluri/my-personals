'use strict';

// ── Shared email/phone detection & validation ───────────────────────────────
// Used by registration, login and OTP routes so "what kind of identifier is
// this?" is decided in exactly one place.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Accepts "+91 98765 43210", "+1 (415) 555-0132", "9876543210", etc.
// Normalizes to E.164-ish "+<countrycode><number>" (digits only, leading +).
function normalizePhone(raw) {
  const trimmed = String(raw || '').trim();
  const hadPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/[^\d]/g, '');
  if (!digits) return null;
  // Require a country code: either an explicit "+", or a number long enough
  // (>10 digits) to already include one. Bare 10-digit local numbers are
  // rejected rather than silently guessing a country.
  if (!hadPlus && digits.length <= 10) return null;
  if (digits.length < 8 || digits.length > 15) return null;
  return `+${digits}`;
}

function isEmail(raw) {
  return EMAIL_RE.test(String(raw || '').trim());
}

function isPhone(raw) {
  return normalizePhone(raw) !== null;
}

// Classifies a raw identifier the user typed into the single "Email or
// mobile number" field. Returns { type: 'email'|'phone', value } where
// value is normalized (lowercased email, or E.164-ish phone), or null if
// neither an email nor a phone number could be recognized.
function classifyIdentifier(raw) {
  const trimmed = String(raw || '').trim();
  if (isEmail(trimmed)) {
    return { type: 'email', value: trimmed.toLowerCase() };
  }
  const phone = normalizePhone(trimmed);
  if (phone) {
    return { type: 'phone', value: phone };
  }
  return null;
}

// ── Feature flag: mobile/SMS sign-up ────────────────────────────────────────
// The SMS side (lib/notify.js sendOtpSms, the phone columns in db.js, the
// /otp and /register routes' phone handling) is fully built, just switched
// off for now. Flip this to `true` to re-enable it everywhere at once —
// every route below reads identifiers through parseIdentifier(), so nothing
// else needs to change.
const MOBILE_SIGNUP_ENABLED = false;

// The one function routes should call to read a raw "identifier" field from
// a request. Returns the same shape as classifyIdentifier(), but only ever
// recognizes email addresses while mobile sign-up is disabled.
function parseIdentifier(raw) {
  if (MOBILE_SIGNUP_ENABLED) return classifyIdentifier(raw);
  const trimmed = String(raw || '').trim();
  return isEmail(trimmed) ? { type: 'email', value: trimmed.toLowerCase() } : null;
}

// User-facing copy for "that wasn't a valid identifier" errors, consistent
// across routes and in sync with whether mobile sign-up is on.
function identifierHint() {
  return MOBILE_SIGNUP_ENABLED
    ? 'Enter a valid email address or mobile number.'
    : 'Enter a valid email address.';
}

module.exports = {
  EMAIL_RE, isEmail, isPhone, normalizePhone, classifyIdentifier,
  MOBILE_SIGNUP_ENABLED, parseIdentifier, identifierHint,
};
