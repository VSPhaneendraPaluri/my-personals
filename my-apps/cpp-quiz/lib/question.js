// Turns a template into a concrete question and decides whether a real compiler run confirms it.
const R = require('./rng');

const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
const trimEnd = (s) => String(s).replace(/\s+$/, '');
const numTok = /^-?\d+$/;

// Generic reasons for distractors a template did not explain itself.
const WHY = {
  auto: 'A plausible-looking variation of the real output (off by one or reordered). Trace the code step by step: the real output is shown below.',
  noCompile: 'This program is well-formed for the selected standard, so it compiles and runs; the real output is shown below.',
  noOutput: 'The program does print to standard output; the real output is shown below.',
  ub: 'Nothing in this program has undefined behavior: every operation is well defined for the selected standard.',
  compiles: 'The compiler rejects this program for the selected standard; the diagnostic is shown below.',
  compilesNot: 'The program is well-formed, so the compiler accepts it.',
};

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

// Options for an output question. Template-authored distractors (with their reasons) always come first;
// mechanical variations and fillers are only used when the template supplied fewer than three.
// `sources` records where each wrong option came from, so quality can be measured (test/validate-distractors.js).
function buildOptions(q) {
  const keep = !!q.keepWhitespace;
  const n = (s) => (keep ? trimEnd(String(s)) : norm(s));
  const exp = n(q.expected);
  const seen = new Set([exp]);
  const wrong = [];
  const own = (q.wrong || []).map((text, i) => ({ text, why: (q.wrongWhy || [])[i] || null, src: 'template' }));
  const cands = [...R.shuffle(own), ...(keep ? [] : autoWrong(exp).map((text) => ({ text, why: WHY.auto, src: 'auto' })))];
  for (const w of cands) {
    const nw = n(w.text);
    if (nw && !seen.has(nw)) { seen.add(nw); wrong.push({ text: nw, why: w.why || WHY.auto, src: w.src }); }
    if (wrong.length >= 3) break;
  }
  for (const [filler, why] of [['Compilation error', WHY.noCompile], ['No output', WHY.noOutput], ['Undefined behavior', WHY.ub]]) {
    if (wrong.length >= 3) break;
    if (!seen.has(filler)) { seen.add(filler); wrong.push({ text: filler, why, src: 'filler' }); }
  }
  // Occasionally swap one weak (mechanical) distractor for "Compilation error": it is only a meaningful
  // option when the question leaves some doubt, so never replace a distractor the template wrote itself.
  const weak = wrong.map((w, i) => (w.src !== 'template' ? i : -1)).filter((i) => i >= 0);
  if (weak.length && R.chance(0.12) && !seen.has('Compilation error')) {
    wrong[R.pick(weak)] = { text: 'Compilation error', why: WHY.noCompile, src: 'filler' };
  }
  const all = R.shuffle([{ text: exp, why: null, src: 'correct' }, ...wrong.slice(0, 3)]);
  return {
    options: all.map((o) => o.text),
    correct: all.findIndex((o) => o.src === 'correct'),
    reasons: all.map((o) => o.why),
    sources: all.map((o) => o.src),
  };
}

function difficultyOf(tpl, q) {
  const lo = (tpl.diffRange || [tpl.difficulty || 2, tpl.difficulty || 2])[0];
  const hi = (tpl.diffRange || [tpl.difficulty || 2, tpl.difficulty || 2])[1];
  const d = Number.isInteger(q.difficulty) ? q.difficulty : tpl.difficulty || lo;
  return Math.min(hi, Math.max(lo, d));
}

function build(tpl, S, ctx) {
  const q = tpl.build(R, S, ctx);
  const kind = q.kind || tpl.kind || 'output';
  const base = {
    tplId: tpl.id, topic: tpl.topic, std: S.key, kind, code: q.code, explain: q.explain,
    errorRe: q.errorRe || null, keepWhitespace: !!q.keepWhitespace,
    domains: tpl.domains || [], difficulty: difficultyOf(tpl, q), reference: q.reference || tpl.reference || null, ub: tpl.ub || false,
  };
  if (kind === 'compile') {
    const options = ['Compiles and runs', 'Compilation error'];
    const flip = R.chance(0.5);
    const opts = flip ? [...options].reverse() : options;
    const correctText = q.expected === 'ok' ? 'Compiles and runs' : 'Compilation error';
    const reasons = opts.map((o) => (o === correctText ? null : (q.expected === 'ok' ? WHY.compilesNot : WHY.compiles)));
    return { ...base, expected: q.expected, options: opts, correct: opts.indexOf(correctText), reasons, sources: opts.map((o) => (o === correctText ? 'correct' : 'template')) };
  }
  const { options, correct, reasons, sources } = buildOptions(q);
  return { ...base, expected: q.keepWhitespace ? trimEnd(q.expected) : norm(q.expected), options, correct, reasons, sources };
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

// Is any distractor identical to what the program really printed? (It must never be.)
function distractorCollision(q, res) {
  if (q.kind === 'compile') return false;
  const real = q.keepWhitespace ? trimEnd(res.stdout) : norm(res.stdout);
  return q.options.some((o, i) => i !== q.correct && (q.keepWhitespace ? trimEnd(o) : norm(o)) === real);
}

module.exports = { build, confirm, norm, distractorCollision, WHY };
