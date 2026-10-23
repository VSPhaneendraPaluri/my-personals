// Generates questions, has them confirmed by the compiler backend, and keeps a small
// buffer of verified ones per standard. Unconfirmed questions are thrown away.
const crypto = require('node:crypto');
const R = require('./rng');
const { STANDARDS, byKey, rankOf } = require('./standards');
const TEMPLATES = require('./templates');
const Q = require('./question');

const TARGET = Number(process.env.POOL_TARGET || 5);
const FLAGS = '-pedantic-errors';

class Pool {
  constructor(backend) {
    this.be = backend;
    this.pools = new Map(STANDARDS.map((s) => [s.key, []]));
    this.waiters = new Map(STANDARDS.map((s) => [s.key, []]));
    this.filling = new Map();
    this.recent = new Map(STANDARDS.map((s) => [s.key, []]));
    this.seen = new Set();
    this.stats = { verified: 0, rejected: 0, infraErrors: 0, lastError: null };
  }

  args(S) { return `-std=${S.flag} ${FLAGS}`; }

  async produce(S) {
    const comp = await this.be.resolveCompiler();
    const eligible = TEMPLATES.filter((t) => rankOf(t.minStd) <= S.rank && (t.gcc || 0) <= comp.major);
    const recent = this.recent.get(S.key);
    const fresh = eligible.filter((t) => !recent.includes(t.id));
    const list = fresh.length ? fresh : eligible;
    const bag = list.flatMap((t) => Array(t.weight || 1).fill(t));
    const tpl = R.pick(bag);
    recent.push(tpl.id); if (recent.length > 6) recent.shift();

    const q = Q.build(tpl, S, { gcc: comp.major });
    const h = crypto.createHash('sha1').update(S.key + q.code + q.options.join('|')).digest('hex');
    if (this.seen.has(h)) return null;
    this.seen.add(h); if (this.seen.size > 20000) this.seen.clear();

    const res = await this.be.run(q.code, this.args(S));
    if (!Q.confirm(q, res)) {
      this.stats.rejected++;
      console.warn(`[reject] ${tpl.id} @C++${S.key}: expected ${JSON.stringify(q.expected)}, got built=${res.built} exit=${res.exit} stdout=${JSON.stringify(res.stdout.slice(0, 80))}`);
      return null;
    }
    this.stats.verified++;
    return {
      ...q,
      id: crypto.randomUUID(),
      actual: q.kind === 'compile' ? (q.expected === 'ok' ? 'Compiled and ran successfully.' : res.stderr.split('\n').filter(Boolean).slice(0, 4).join('\n')) : res.stdout.trimEnd(),
      compiler: comp.name,
      flags: this.args(S),
      link: this.be.shareLink(q.code, this.args(S)),
    };
  }

  push(S, item) {
    const w = this.waiters.get(S.key).shift();
    if (w) w(item); else this.pools.get(S.key).push(item);
  }

  fill(S) {
    if (this.filling.get(S.key)) return;
    this.filling.set(S.key, true);
    (async () => {
      let fails = 0;
      try {
        while (this.pools.get(S.key).length < TARGET || this.waiters.get(S.key).length) {
          const batch = await Promise.allSettled([this.produce(S), this.produce(S)]);
          for (const r of batch) {
            if (r.status === 'fulfilled' && r.value) { this.push(S, r.value); fails = 0; }
            else {
              fails++;
              if (r.status === 'rejected') { this.stats.infraErrors++; this.stats.lastError = String(r.reason && r.reason.message || r.reason); console.error('[infra]', this.stats.lastError); }
            }
          }
          if (fails >= 10) throw new Error(this.stats.lastError || 'too many unverifiable questions');
        }
      } catch (e) {
        this.stats.lastError = e.message;
        for (const w of this.waiters.get(S.key).splice(0)) w(null);
      } finally {
        this.filling.set(S.key, false);
      }
    })();
  }

  async next(key) {
    const S = byKey[key];
    if (!S || !S.enabled) throw Object.assign(new Error('unknown standard'), { status: 400 });
    const pool = this.pools.get(key);
    this.fill(S);
    if (pool.length) return pool.splice(R.int(0, pool.length - 1), 1)[0];
    const item = await new Promise((resolve) => {
      this.waiters.get(key).push(resolve);
      setTimeout(() => resolve(null), 60000);
      this.fill(S);
    });
    if (!item) throw Object.assign(new Error(this.stats.lastError ? `Could not verify a question right now (${this.stats.lastError}). Please try again.` : 'Timed out waiting for Compiler Explorer.'), { status: 503 });
    return item;
  }
}

module.exports = { Pool };
