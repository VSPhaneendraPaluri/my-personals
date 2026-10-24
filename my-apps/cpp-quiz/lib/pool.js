// Generates questions, has them confirmed by the compiler backend, and keeps a small
// buffer of verified ones per standard. Unconfirmed questions are thrown away.
const crypto = require('node:crypto');
const R = require('./rng');
const { STANDARDS, byKey, rankOf } = require('./standards');
const TEMPLATES = require('./templates');
const Q = require('./question');

const TARGET = Number(process.env.POOL_TARGET || 5);
const FLAGS  = '-pedantic-errors';

// ── domain & difficulty come from explicit template metadata (lib/templates/meta.js) ──
const matchesDomain = (t, domainKey) => !domainKey || (t.domains || []).includes(domainKey);
const templateDiff = (t) => t.difficulty || 2;
const canBeDiff = (t, d) => !d || (t.diffRange ? t.diffRange[0] <= d && d <= t.diffRange[1] : templateDiff(t) === d);

// goal-based eligibility check on a built question
function eligibleForGoal(q, goal) {
  if (!goal || goal === 'learn') return true;
  if (goal === 'lawyer') return true;          // all kinds; compile-kind weighted in bag
  if (goal === 'interview') return templateDiff({ minStd: q.std }) >= 1; // all diff, skews in bag
  if (goal === 'ub') {
    const hay = ((q.topic || '') + (q.explain || '')).toLowerCase();
    return hay.includes('undefined') || hay.includes('ub') ||
           hay.includes('unspecified') || hay.includes('impl') ||
           hay.includes('behaviour') || hay.includes('behavior');
  }
  return true;
}

class Pool {
  constructor(backend) {
    this.be = backend;
    this.pools   = new Map(STANDARDS.map((s) => [s.key, []]));
    this.waiters = new Map(STANDARDS.map((s) => [s.key, []]));
    this.filling = new Map();
    this.recent  = new Map(STANDARDS.map((s) => [s.key, []]));
    this.seen    = new Set();
    this.stats   = { verified: 0, rejected: 0, infraErrors: 0, lastError: null };
  }

  args(S) { return `-std=${S.flag} ${FLAGS}`; }

  async produce(S, filters = {}) {
    const comp = await this.be.resolveCompiler();
    const { goal = 'learn', domain = '', diff = 0 } = filters;

    // Base eligibility: standard rank + gcc version, then the requested domain and difficulty.
    // A filter that would leave nothing is relaxed (domain first) instead of failing the request.
    const base = TEMPLATES.filter((t) => rankOf(t.minStd) <= S.rank && (t.gcc || 0) <= comp.major);
    let eligible = base.filter((t) => matchesDomain(t, domain) && canBeDiff(t, diff));
    if (!eligible.length) eligible = base.filter((t) => canBeDiff(t, diff));
    if (!eligible.length) eligible = base.filter((t) => matchesDomain(t, domain));
    if (!eligible.length) eligible = base;

    // Recency anti-repeat
    const recent = this.recent.get(S.key);
    const fresh  = eligible.filter((t) => !recent.includes(t.id));
    const list   = fresh.length ? fresh : eligible;

    // Goal-aware weights
    const bag = list.flatMap((t) => {
      let w = t.weight || 1;
      if (goal === 'lawyer')    w *= (t.kind === 'compile' ? 3 : 1);
      if (goal === 'interview') w *= ((t.diffRange ? t.diffRange[1] : templateDiff(t)) >= 2 ? 2 : 1);
      if (goal === 'ub')        w *= (((t.topic || '') + (t.id || '')).toLowerCase().includes('ub') ? 3 : 1);
      return Array(w).fill(t);
    });

    const tpl = R.pick(bag);
    recent.push(tpl.id); if (recent.length > 6) recent.shift();

    let q = Q.build(tpl, S, { gcc: comp.major });
    // A template can span difficulty levels (one per variant): rebuild a few times to honour the filter.
    for (let i = 0; diff && q.difficulty !== diff && i < 8; i++) q = Q.build(tpl, S, { gcc: comp.major });
    if (diff && q.difficulty !== diff) return null;

    // Goal post-build filter (ub mode needs explain text)
    if (!eligibleForGoal(q, goal)) return null;

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
      id:       crypto.randomUUID(),
      actual:   q.kind === 'compile'
                  ? (q.expected === 'ok' ? 'Compiled and ran successfully.' : res.stderr.split('\n').filter(Boolean).slice(0, 4).join('\n'))
                  : res.stdout.trimEnd(),
      compiler: comp.name,
      flags:    this.args(S),
      link:     this.be.shareLink(q.code, this.args(S)),
    };
  }

  push(S, item) {
    const w = this.waiters.get(S.key).shift();
    if (w) w(item); else this.pools.get(S.key).push(item);
  }

  fill(S, filters) {
    // Each unique filter combo gets its own fill key so domain/goal requests don't block the main pool
    const fkey = S.key + '|' + (filters.goal || '') + '|' + (filters.domain || '') + '|' + (filters.diff || '');
    if (this.filling.get(fkey)) return;
    this.filling.set(fkey, true);
    (async () => {
      let fails = 0;
      try {
        while (this.pools.get(S.key).length < TARGET || this.waiters.get(S.key).length) {
          const batch = await Promise.allSettled([this.produce(S, filters), this.produce(S, filters)]);
          for (const r of batch) {
            if (r.status === 'fulfilled' && r.value) { this.push(S, r.value); fails = 0; }
            else {
              fails++;
              if (r.status === 'rejected') { this.stats.infraErrors++; this.stats.lastError = String(r.reason?.message || r.reason); console.error('[infra]', this.stats.lastError); }
            }
          }
          if (fails >= 10) throw new Error(this.stats.lastError || 'too many unverifiable questions');
        }
      } catch (e) {
        this.stats.lastError = e.message;
        for (const w of this.waiters.get(S.key).splice(0)) w(null);
      } finally {
        this.filling.set(fkey, false);
      }
    })();
  }

  async next(key, filters = {}) {
    const S = byKey[key];
    if (!S || !S.enabled) throw Object.assign(new Error('unknown standard'), { status: 400 });
    const pool = this.pools.get(key);
    this.fill(S, filters);
    if (pool.length) return pool.splice(R.int(0, pool.length - 1), 1)[0];
    const item = await new Promise((resolve) => {
      this.waiters.get(key).push(resolve);
      setTimeout(() => resolve(null), 60000);
      this.fill(S, filters);
    });
    if (!item) throw Object.assign(new Error(
      this.stats.lastError
        ? `Could not verify a question right now (${this.stats.lastError}). Please try again.`
        : 'Timed out waiting for Compiler Explorer.'
    ), { status: 503 });
    return item;
  }
}

module.exports = { Pool };
