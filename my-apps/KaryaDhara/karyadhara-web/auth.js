const jwt = require('jsonwebtoken');

const SECRET = process.env.SESSION_SECRET;
if (!SECRET) {
  // Fail loudly rather than silently signing tokens with an insecure default.
  throw new Error('SESSION_SECRET environment variable is not set. Refusing to start.');
}

const COOKIE_NAME = 'karyadhara_token';
const LEGACY_COOKIE_NAME = 'dailydeck_token'; // pre-rename sessions keep working until they expire
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function signToken(userId) {
  return jwt.sign({ uid: userId }, SECRET, { expiresIn: '30d' });
}

function setAuthCookie(res, userId) {
  res.clearCookie(LEGACY_COOKIE_NAME, { path: '/' });
  res.cookie(COOKIE_NAME, signToken(userId), {
    httpOnly: true,       // not readable by client-side JS — blocks token theft via XSS
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE_MS,
    path: '/'
  });
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.clearCookie(LEGACY_COOKIE_NAME, { path: '/' });
}

// Every protected route uses this; it is the one place that enforces
// "you only ever see your own data" — req.userId comes only from a verified token.
function requireAuth(req, res, next) {
  const token = req.cookies && (req.cookies[COOKIE_NAME] || req.cookies[LEGACY_COOKIE_NAME]);
  if (!token) return res.status(401).json({ error: 'Not signed in.' });
  try {
    const payload = jwt.verify(token, SECRET);
    req.userId = payload.uid;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Session expired. Please sign in again.' });
  }
}

module.exports = { setAuthCookie, clearAuthCookie, requireAuth };
