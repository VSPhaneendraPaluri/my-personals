const http = require('node:http');
const fs   = require('node:fs');
const path = require('node:path');
const { createBackend } = require('./lib/backends');
const { Pool }          = require('./lib/pool');
const { STANDARDS }     = require('./lib/standards');
const TEMPLATES         = require('./lib/templates');

const PORT = Number(process.env.PORT || 3000);
const backend = createBackend();
const pool    = new Pool(backend);
const served  = new Map(); // id -> question

// ── domain taxonomy (10 tags) maps template topics via keyword list ──────────
const DOMAIN_KEYWORDS = {
  lifetime:    ['unique_ptr','shared_ptr','weak_ptr','raii','ownership','smart pointer','dangle','leak','destructor','copy','move','rule of'],
  move:        ['move','rvalue','&&','copy vs move','value category','forward','perfect'],
  classes:     ['virtual','override','vtable','constructor','destructor','class','struct','oop','slicing','inheritance','polymorphism','overrid','hiding','abstract','dynamic_cast','hierarchy','base class','derived'],
  templates:   ['template','generic','variadic','sfinae','enable_if','concept','deduction','specialization','auto parameter'],
  constexpr:   ['constexpr','static_assert','compile-time','type_traits','consteval','constant'],
  types:       ['auto','decltype','cast','const','type','nullptr','enum','scoped enum','conversion','sizeof','fundamental'],
  expressions: ['operator','precedence','evaluation order','overload','adl','increment','decrement','arithmetic','bitwise','ternary'],
  stl:         ['vector','map','set','string','array','algorithm','iterator','sort','find','container','push_back','emplace'],
  lambdas:     ['lambda','capture','closure','std::function','callable','generic lambda','init-capture'],
  concurrency: ['thread','atomic','mutex','noexcept','exception','throw','unwinding','volatile'],
};

function questionMatchesDomain(q, domainKey) {
  if (!domainKey) return true;
  const kws = DOMAIN_KEYWORDS[domainKey] || [];
  const hay = ((q.topic || '') + ' ' + (q.code || '')).toLowerCase();
  return kws.some((k) => hay.includes(k));
}

// ── difficulty bands — mapped from template minStd as a proxy ───────────────
// Until templates carry an explicit difficulty field, derive it:
// 1 = topic exists in C++98/03  2 = C++11/14 topic  3 = C++17 topic
function templateDifficulty(t) {
  const s = t.minStd || '98';
  if (s === '98' || s === '03') return 1;
  if (s === '11' || s === '14') return 2;
  return 3; // 17+
}

// ── cleanup stale served questions every 10 min ──────────────────────────────
setInterval(() => {
  const cut = Date.now() - 2 * 3600e3;
  for (const [id, q] of served) if (q.t < cut) served.delete(id);
}, 600e3).unref();

// ── simple per-IP rate limiter ───────────────────────────────────────────────
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
  const ip  = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  try {
    if (url.pathname === '/healthz') return send(res, 200, 'ok', 'text/plain');

    if (url.pathname.startsWith('/api/')) {
      if (limited(ip)) return send(res, 429, { error: 'Too many requests, slow down a little.' });

      // ── GET /api/standards ───────────────────────────────────────────────
      if (url.pathname === '/api/standards') {
        let compiler = null;
        try { compiler = (await backend.resolveCompiler()).name; } catch {}
        return send(res, 200, {
          standards: STANDARDS.map(({ key, label, flag }) => ({ key, label, flag })),
          compiler,
          templates: TEMPLATES.length,
        });
      }

      if (url.pathname === '/api/stats') return send(res, 200, pool.stats);

      // ── GET /api/question ────────────────────────────────────────────────
      if (url.pathname === '/api/question' && req.method === 'GET') {
        const stdKey  = url.searchParams.get('std');
        const goal    = url.searchParams.get('goal')   || 'learn';
        const domain  = url.searchParams.get('domain') || '';
        const diff    = Number(url.searchParams.get('diff') || 0);

        // Goal-based question filtering:
        // lawyer  → compile-kind questions weighted up
        // ub      → only questions whose topic contains UB signals (also pulls tcompile UB entries)
        // interview → difficulty 2-3, skip trivial outputs
        // learn   → no filter (full pool, easiest first)
        const filters = { goal, domain, diff };
        const q = await pool.next(stdKey, filters);
        q.t = Date.now(); served.set(q.id, q);
        return send(res, 200, {
          id: q.id, std: q.std, kind: q.kind, topic: q.topic,
          code: q.code, options: q.options, flags: q.flags,
          compiler: q.compiler, keepWhitespace: q.keepWhitespace,
          stats: pool.stats,
        });
      }

      // ── POST /api/answer ─────────────────────────────────────────────────
      if (url.pathname === '/api/answer' && req.method === 'POST') {
        let raw = ''; for await (const c of req) { raw += c; if (raw.length > 5000) break; }
        const { id, choice } = JSON.parse(raw || '{}');
        const q = served.get(id);
        if (!q) return send(res, 410, { error: 'This question has expired. Load a new one.' });
        return send(res, 200, { correct: Number(choice) === q.correct, answer: q.correct, explain: q.explain, actual: q.actual, link: q.link, compiler: q.compiler, flags: q.flags });
      }

      return send(res, 404, { error: 'not found' });
    }

    // ── static files ─────────────────────────────────────────────────────────
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

server.listen(PORT, () => console.log(
  `C++ quiz listening on :${PORT} — scope: C++98-C++17 — ${TEMPLATES.length} templates — ` +
  (process.env.VERIFY_BACKEND === 'local' ? 'local g++' : 'godbolt.org')
));

module.exports = { DOMAIN_KEYWORDS, questionMatchesDomain, templateDifficulty };
