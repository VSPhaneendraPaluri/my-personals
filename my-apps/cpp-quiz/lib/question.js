// Turns a template into a concrete question and decides whether a real compiler run confirms it.
const R = require('./rng');

const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
const trimEnd = (s) => String(s).replace(/\s+$/, '');
const numTok = /^-?\d+$/;

function autoWrong(exp) {
  const toks = exp.split(' ');
  const c = [];
  if (toks.length > 1) {
    c.push([...toks].reverse().join(' '));
    c.push([toks[1], toks[0], ...toks.slice(2)].join(' '));
  }
  toks.forEach((t, i) => {
    if (numTok.test(t)) {
      for (const d of [1, -1, 2]) { const a = [...toks]; a[i] = String(Number(t) + d); c.push(a.join(' ')); }
    }
  });
  if (!toks.some((t) => numTok.test(t))) { c.push(exp.toUpperCase()); c.push(exp + ' 0'); }
  return R.shuffle(c);
}

function buildOptions(q) {
  const keep = !!q.keepWhitespace;
  const n = (s) => (keep ? trimEnd(String(s)) : norm(s));
  const exp = n(q.expected);
  const seen = new Set([exp]);
  const wrong = [];
  for (const w of [...R.shuffle(q.wrong || []), ...(keep ? [] : autoWrong(exp))]) {
    const nw = n(w);
    if (nw && !seen.has(nw)) { seen.add(nw); wrong.push(nw); }
    if (wrong.length >= 3) break;
  }
  for (const filler of ['Compilation error', 'No output', 'Undefined behavior']) {
    if (wrong.length >= 3) break;
    if (!seen.has(filler)) { seen.add(filler); wrong.push(filler); }
  }
  if (R.chance(0.3) && !seen.has('Compilation error')) wrong[R.int(0, 2)] = 'Compilation error';
  const all = R.shuffle([exp, ...wrong.slice(0, 3)]);
  return { options: all, correct: all.indexOf(exp) };
}

function build(tpl, S, ctx) {
  const q = tpl.build(R, S, ctx);
  const kind = q.kind || tpl.kind || 'output';
  const base = { tplId: tpl.id, topic: tpl.topic, std: S.key, kind, code: q.code, explain: q.explain, errorRe: q.errorRe || null, keepWhitespace: !!q.keepWhitespace };
  if (kind === 'compile') {
    const options = ['Compiles and runs', 'Compilation error'];
    const flip = R.chance(0.5);
    const opts = flip ? [...options].reverse() : options;
    return { ...base, expected: q.expected, options: opts, correct: opts.indexOf(q.expected === 'ok' ? 'Compiles and runs' : 'Compilation error') };
  }
  const { options, correct } = buildOptions(q);
  return { ...base, expected: q.keepWhitespace ? trimEnd(q.expected) : norm(q.expected), options, correct };
}

// Does the real compiler agree with the answer we intend to publish?
function confirm(q, res) {
  if (q.kind === 'compile') {
    if (q.expected === 'ok') return res.built && (!res.ran || res.exit === 0) && !res.timedOut;
    if (res.built) return false;
    return q.errorRe ? q.errorRe.test(res.stderr) : true;
  }
  if (!res.built || !res.ran || res.exit !== 0) return false;
  return q.keepWhitespace ? trimEnd(res.stdout) === q.expected : norm(res.stdout) === q.expected;
}

module.exports = { build, confirm, norm };
