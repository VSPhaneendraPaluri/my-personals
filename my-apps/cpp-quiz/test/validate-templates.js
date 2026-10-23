// Runs every template many times against a real compiler and reports any question whose
// intended answer the compiler does not confirm.  Usage:
//   VERIFY_BACKEND=local node test/validate-templates.js [iterations] [templateIdFilter]
// (With the default backend it uses godbolt.org instead.)
const { createBackend } = require('../lib/backends');
const { STANDARDS, rankOf } = require('../lib/standards');
const TEMPLATES = require('../lib/templates');
const Q = require('../lib/question');

const iters = Number(process.argv[2] || 6);
const filter = process.argv[3];
const FLAGS = '-pedantic-errors';

(async () => {
  const be = createBackend();
  const c = await be.resolveCompiler();
  console.log(`compiler: ${c.name} (gcc ${c.major})  iterations/template/std: ${iters}`);
  const jobs = [];
  for (const S of STANDARDS) {
    for (const t of TEMPLATES) {
      if (filter && !t.id.includes(filter)) continue;
      if (S.rank < rankOf(t.minStd)) continue;
      if ((t.gcc || 0) > c.major) continue;
      for (let i = 0; i < (t.id === 'feature-availability' ? iters * 6 : iters); i++) jobs.push({ S, t });
    }
  }
  let ok = 0, bad = 0; const fails = new Map(); const per = new Map();
  let idx = 0;
  const worker = async () => {
    while (idx < jobs.length) {
      const { S, t } = jobs[idx++];
      let q;
      try { q = Q.build(t, S, { gcc: c.major }); } catch (e) { bad++; fails.set(`${t.id}@${S.key} BUILD`, e.stack); continue; }
      let flag = S.flag;
      if (flag === 'c++2c' && c.major < 14) flag = 'c++2b';
      const res = await be.run(q.code, `-std=${flag} ${FLAGS}`);
      const key = `${t.id}@${S.key}`;
      const rec = per.get(key) || { ok: 0, bad: 0 }; per.set(key, rec);
      if (Q.confirm(q, res)) { ok++; rec.ok++; }
      else {
        bad++; rec.bad++;
        if (!fails.has(key)) fails.set(key, `expected: ${JSON.stringify(q.expected)}\n--- code ---\n${q.code}\n--- built=${res.built} ran=${res.ran} exit=${res.exit}\nstdout: ${JSON.stringify(res.stdout)}\nstderr: ${res.stderr.split('\n').slice(0, 6).join('\n')}`);
      }
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  console.log(`\nconfirmed ${ok}, rejected ${bad}`);
  for (const [k, v] of fails) console.log(`\n=== FAIL ${k} (${per.get(k.replace(' BUILD', '')) ? JSON.stringify(per.get(k)) : ''}) ===\n${v}`);
  process.exit(bad ? 1 : 0);
})();
