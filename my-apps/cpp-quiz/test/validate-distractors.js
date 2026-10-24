// Offline quality gate for the question bank (no compiler needed):
//   node test/validate-distractors.js [iterationsPerTemplatePerStd] [templateIdFilter]
//
// Checks every generated question for:
//   - structure:   2 options (compile) / 4 distinct options (output); `correct` points at the expected answer
//   - reasons:     every wrong option carries a reason; the correct one does not; reasons are not blank
//   - metadata:    difficulty inside the template's range, at least one domain, a cppreference link
//   - distractors: how many wrong options the template authored itself vs. mechanical/filler fallbacks.
//                  An output template whose authored share is below MIN_AUTHORED fails the gate.
// The compiler-backed counterpart (a distractor must never equal the real output) lives in
// test/validate-templates.js.
const { STANDARDS, rankOf } = require('../lib/standards');
const TEMPLATES = require('../lib/templates');
const Q = require('../lib/question');

const iters = Number(process.argv[2] || 40);
const filter = process.argv[3];
const MIN_AUTHORED = Number(process.env.MIN_AUTHORED || 0.66); // share of wrong options written by the template

const problems = [];
const report = [];
const note = (t, S, msg) => { if (problems.length < 60) problems.push(`${t.id}@${S.key}: ${msg}`); };

for (const t of TEMPLATES) {
  if (filter && !t.id.includes(filter)) continue;
  let total = 0, authored = 0, builds = 0, byDiff = {};
  for (const S of STANDARDS) {
    if (S.rank < rankOf(t.minStd)) continue;
    for (let i = 0; i < iters; i++) {
      let q;
      try { q = Q.build(t, S, { gcc: 13 }); } catch (e) { note(t, S, 'build threw: ' + e.message); continue; }
      builds++;
      const want = q.kind === 'compile' ? 2 : 4;
      if (q.options.length !== want) note(t, S, `expected ${want} options, got ${q.options.length}`);
      const normd = q.options.map((o) => (q.keepWhitespace ? o.replace(/\s+$/, '') : Q.norm(o)));
      if (new Set(normd).size !== normd.length) note(t, S, 'duplicate options: ' + JSON.stringify(q.options));
      const expectedNorm = q.kind === 'compile' ? (q.expected === 'ok' ? 'Compiles and runs' : 'Compilation error') : normd[q.correct];
      if (normd[q.correct] !== (q.kind === 'compile' ? expectedNorm : (q.keepWhitespace ? q.expected : Q.norm(q.expected)))) note(t, S, '`correct` does not point at the expected answer');
      if (!Array.isArray(q.reasons) || q.reasons.length !== q.options.length) { note(t, S, 'reasons missing/misaligned'); continue; }
      q.reasons.forEach((r, k) => {
        if (k === q.correct) { if (r !== null) note(t, S, 'the correct option has a reason'); }
        else if (typeof r !== 'string' || r.trim().length < 20) note(t, S, `option ${k} has no useful reason: ${JSON.stringify(r)}`);
      });
      if (!q.domains.length) note(t, S, 'no domains');
      if (!/^https:\/\/en\.cppreference\.com\/w\/cpp\//.test(q.reference || '')) note(t, S, 'bad reference: ' + q.reference);
      const [lo, hi] = t.diffRange;
      if (q.difficulty < lo || q.difficulty > hi) note(t, S, `difficulty ${q.difficulty} outside ${lo}-${hi}`);
      byDiff[q.difficulty] = (byDiff[q.difficulty] || 0) + 1;
      if (q.kind !== 'compile') {
        q.sources.forEach((s, k) => { if (k !== q.correct) { total++; if (s === 'template') authored++; } });
      }
    }
  }
  if (builds) report.push({ id: t.id, kind: t.kind || 'output', share: total ? authored / total : null, diff: Object.keys(byDiff).sort().join('/'), builds });
}

const outputs = report.filter((r) => r.share !== null).sort((a, b) => a.share - b.share);
console.log('Authored-distractor share (output templates, weakest first):');
for (const r of outputs.slice(0, 12)) console.log(`  ${(100 * r.share).toFixed(0).padStart(3)}%  ${r.id}  (difficulty ${r.diff})`);
const weak = outputs.filter((r) => r.share < MIN_AUTHORED);
const avg = outputs.reduce((a, r) => a + r.share, 0) / (outputs.length || 1);
console.log(`\ntemplates checked: ${report.length}, mean authored share: ${(100 * avg).toFixed(0)}%, below ${(100 * MIN_AUTHORED).toFixed(0)}%: ${weak.length}`);
if (weak.length) console.log('  weak: ' + weak.map((r) => r.id).join(', '));
if (problems.length) { console.log('\nPROBLEMS:'); problems.forEach((p) => console.log('  ' + p)); }
process.exit(problems.length || weak.length ? 1 : 0);
