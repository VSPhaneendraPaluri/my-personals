const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { createBackend } = require('./lib/backends');
const { Pool } = require('./lib/pool');
const { STANDARDS } = require('./lib/standards');
const TEMPLATES = require('./lib/templates');

const PORT = Number(process.env.PORT || 3000);
const backend = createBackend();
const pool = new Pool(backend);
const served = new Map(); // id -> question (answers stay on the server until revealed)

setInterval(() => {
  const cutoff = Date.now() - 2 * 3600e3;
  for (const [id, q] of served) if (q.t < cutoff) served.delete(id);
}, 600e3).unref();

// very small per-IP rate limiter
const hits = new Map();
setInterval(() => hits.clear(), 60e3).unref();
const limited = (ip) => { const n = (hits.get(ip) || 0) + 1; hits.set(ip, n); return n > 90; };

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const send = (res, code, body, type = 'application/json') => {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  try {
    if (url.pathname === '/healthz') return send(res, 200, 'ok', 'text/plain');
    if (url.pathname.startsWith('/api/')) {
      if (limited(ip)) return send(res, 429, { error: 'Too many requests, slow down a little.' });
      if (url.pathname === '/api/standards') {
        let compiler = null;
        try { compiler = (await backend.resolveCompiler()).name; } catch { /* reported later */ }
        return send(res, 200, { standards: STANDARDS.map(({ key, label, flag }) => ({ key, label, flag })), compiler, templates: TEMPLATES.length });
      }
      if (url.pathname === '/api/stats') return send(res, 200, pool.stats);
      if (url.pathname === '/api/question' && req.method === 'GET') {
        const q = await pool.next(url.searchParams.get('std'));
        q.t = Date.now(); served.set(q.id, q);
        return send(res, 200, { id: q.id, std: q.std, kind: q.kind, topic: q.topic, code: q.code, options: q.options, flags: q.flags, compiler: q.compiler, keepWhitespace: q.keepWhitespace, stats: pool.stats });
      }
      if (url.pathname === '/api/answer' && req.method === 'POST') {
        let raw = ''; for await (const c of req) { raw += c; if (raw.length > 5000) break; }
        const { id, choice } = JSON.parse(raw || '{}');
        const q = served.get(id);
        if (!q) return send(res, 410, { error: 'This question has expired. Load a new one.' });
        return send(res, 200, { correct: Number(choice) === q.correct, answer: q.correct, explain: q.explain, actual: q.actual, link: q.link, compiler: q.compiler, flags: q.flags });
      }
      return send(res, 404, { error: 'not found' });
    }
    const file = path.join(__dirname, 'public', url.pathname === '/' ? 'index.html' : path.normalize(url.pathname).replace(/^(\.\.[/\\])+/, ''));
    if (!file.startsWith(path.join(__dirname, 'public'))) return send(res, 403, 'forbidden', 'text/plain');
    fs.readFile(file, (err, data) => {
      if (err) return send(res, 404, 'not found', 'text/plain');
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
    });
  } catch (e) {
    console.error(e);
    send(res, e.status || 500, { error: e.message || 'server error' });
  }
});

server.listen(PORT, () => console.log(`C++ quiz listening on :${PORT} (${process.env.VERIFY_BACKEND === 'local' ? 'local g++' : 'godbolt.org'})`));
