// ── constants ────────────────────────────────────────────────────────────────
const GOALS = {
  learn:     { label: 'Learn',           icon: '📖', desc: 'Learn mode' },
  interview: { label: 'Interview Prep',  icon: '💼', desc: 'Interview Prep' },
  lawyer:    { label: 'Language Lawyer', icon: '⚖️',  desc: 'Language Lawyer' },
  ub:        { label: 'UB Hunter',       icon: '💣', desc: 'UB Hunter' },
};

// Domain taxonomy from the org doc (10 domains; tags map to template topics via keyword match server-side)
const DOMAINS = [
  { key: 'lifetime',    label: 'Lifetime & Ownership' },
  { key: 'move',        label: 'Move Semantics' },
  { key: 'classes',     label: 'Classes & OOP' },
  { key: 'templates',   label: 'Templates & Generics' },
  { key: 'constexpr',   label: 'Compile-time' },
  { key: 'types',       label: 'Type System' },
  { key: 'expressions', label: 'Expressions & Lookup' },
  { key: 'stl',         label: 'STL' },
  { key: 'lambdas',     label: 'Lambdas' },
  { key: 'concurrency', label: 'Concurrency & Exceptions' },
];

// ── helpers ───────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const J = async (u, o) => {
  const r = await fetch(u, o);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
  return j;
};
const status = (html, err) => {
  const s = $('status'); s.hidden = !html;
  s.className = 'status' + (err ? ' err' : '');
  s.innerHTML = html || '';
};
const load = (std, goal, domain, diff) => {
  const p = new URLSearchParams({ std });
  if (goal)   p.set('goal', goal);
  if (domain) p.set('domain', domain);
  if (diff)   p.set('diff', diff);
  return J('/api/question?' + p);
};

// ── state ─────────────────────────────────────────────────────────────────────
const st = {
  goal: '', std: '', domain: '', diff: '',
  q: null, next: null, answered: false,
  score: { n: 0, c: 0, s: 0 },
  standards: [],
};

// ── start screen ──────────────────────────────────────────────────────────────
function showStartScreen() {
  $('start-screen').hidden = false;
  $('filter-bar').hidden   = true;
  $('card').hidden         = true;
  status('');
  st.goal = ''; st.std = ''; st.domain = ''; st.diff = '';
  st.score = { n: 0, c: 0, s: 0 };
  $('score').hidden = true;
  document.querySelectorAll('.goal-card').forEach((b) => b.classList.remove('selected'));
}

function selectGoal(goal) {
  st.goal = goal; st.next = null;
  document.querySelectorAll('.goal-card').forEach((b) => b.classList.toggle('selected', b.dataset.goal === goal));
  $('start-screen').hidden = false; // keep visible so user can switch
  $('filter-bar').hidden = false;
  $('goal-chip').textContent = GOALS[goal]?.label || goal;
  // pick first available standard automatically
  const first = st.standards[0];
  if (first && !st.std) setStd(first.key);
  else if (st.std) startQuestion();
}

function setStd(key) {
  st.std = key; st.next = null;
  document.querySelectorAll('#std-chips .chip-btn').forEach((b) => b.classList.toggle('active', b.dataset.std === key));
  $('std-chip').textContent = st.standards.find((s) => s.key === key)?.label || key;
  try { localStorage.setItem('std', key); } catch {}
  if (st.goal) startQuestion();
}

function setDomain(key) {
  st.domain = key; st.next = null;
  document.querySelectorAll('#domain-chips .chip-btn').forEach((b) => b.classList.toggle('active', b.dataset.domain === key));
  if (st.goal && st.std) startQuestion();
}

function setDiff(key) {
  st.diff = key; st.next = null;
  document.querySelectorAll('#diff-chips .chip-btn').forEach((b) => b.classList.toggle('active', b.dataset.diff === key));
  if (st.goal && st.std) startQuestion();
}

// ── init ──────────────────────────────────────────────────────────────────────
async function init() {
  const info = await J('/api/standards');
  st.standards = info.standards;

  // Build standard chips
  const stdRow = $('std-chips');
  for (const s of info.standards) {
    const b = document.createElement('button');
    b.className = 'chip-btn'; b.dataset.std = s.key;
    b.textContent = s.label;
    b.onclick = () => setStd(s.key);
    stdRow.append(b);
  }

  // Build domain chips
  const domRow = $('domain-chips');
  const allBtn = document.createElement('button');
  allBtn.className = 'chip-btn active'; allBtn.dataset.domain = '';
  allBtn.textContent = 'All Topics'; allBtn.onclick = () => setDomain('');
  domRow.append(allBtn);
  for (const d of DOMAINS) {
    const b = document.createElement('button');
    b.className = 'chip-btn'; b.dataset.domain = d.key;
    b.textContent = d.label; b.onclick = () => setDomain(d.key);
    domRow.append(b);
  }

  // Difficulty chips
  document.querySelectorAll('#diff-chips .chip-btn').forEach((b) => {
    b.onclick = () => setDiff(b.dataset.diff);
  });

  // Goal cards
  document.querySelectorAll('.goal-card').forEach((b) => {
    b.onclick = () => selectGoal(b.dataset.goal);
  });

  $('back-btn').onclick = showStartScreen;

  $('foot').textContent = info.compiler
    ? `Verified with ${info.compiler} · flags: -std=… -pedantic-errors · ${info.templates} question templates loaded`
    : 'Compiler Explorer is not reachable right now.';

  // Restore last session
  try {
    const lastGoal = localStorage.getItem('goal');
    const lastStd  = localStorage.getItem('std');
    if (lastGoal && GOALS[lastGoal]) selectGoal(lastGoal);
    if (lastStd && info.standards.some((s) => s.key === lastStd)) setStd(lastStd);
  } catch {}
}

// ── question flow ─────────────────────────────────────────────────────────────
async function startQuestion() {
  $('card').hidden = true; st.next = null;
  try { localStorage.setItem('goal', st.goal); } catch {}
  show(await fetchNext());
}

async function fetchNext() {
  const { goal, std, domain, diff } = st;
  status('<span class="spin"></span>Generating a question and verifying it on godbolt.org…');
  try {
    const q = st.next ? await st.next : await load(std, goal, domain, diff);
    st.next = null;
    if (std !== st.std || goal !== st.goal) return null;
    return q;
  } catch (e) {
    st.next = null;
    status(`${e.message}<br><br><button class="primary" id="retry">Try again</button>`, true);
    $('retry').onclick = startQuestion;
    return null;
  }
}

function show(q) {
  if (!q) return;
  status(''); st.q = q; st.answered = false;
  $('card').hidden = false; $('result').hidden = true;
  $('topic').textContent = q.topic;
  $('flags').textContent = `g++ ${q.flags}`;
  $('prompt').textContent = q.kind === 'compile'
    ? `Does this program compile with ${q.flags}?`
    : 'What is the output of this program?';
  const code = $('code'); code.textContent = q.code; code.removeAttribute('data-highlighted');
  if (window.hljs) hljs.highlightElement(code);
  const box = $('options'); box.innerHTML = '';
  q.options.forEach((t, i) => {
    const b = document.createElement('button'); b.className = 'opt';
    b.innerHTML = `<b>${'ABCD'[i]}</b>`; b.append(document.createTextNode(t));
    b.onclick = () => answer(i); box.append(b);
  });
  $('foot').textContent =
    `Verified with ${q.compiler} · ${q.stats.verified} confirmed, ${q.stats.rejected} rejected so far`;
  // Prefetch next question
  st.next = load(st.std, st.goal, st.domain, st.diff).catch(() => null);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function answer(i) {
  if (st.answered) return; st.answered = true;
  let r;
  try {
    r = await J('/api/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: st.q.id, choice: i }),
    });
  } catch (e) { st.answered = false; return status(e.message, true); }

  [...$('options').children].forEach((b, k) => {
    b.disabled = true;
    if (k === r.answer) b.classList.add('right');
    else if (k === i) b.classList.add('wrong');
  });

  const s = st.score; s.n++; if (r.correct) { s.c++; s.s++; } else s.s = 0;
  $('sc-c').textContent = s.c; $('sc-n').textContent = s.n; $('sc-s').textContent = s.s;
  $('score').hidden = false;
  $('verdict').textContent = r.correct ? '✓ Correct' : '✗ Not quite';
  $('verdict').className = r.correct ? 'ok' : 'bad';
  $('explain').textContent = r.explain;
  $('actual-title').textContent = st.q.kind === 'compile' ? 'Compiler Explorer result' : 'Real output';
  $('actual').textContent = r.actual || '(no output)';
  const l = $('link'); l.hidden = !r.link; if (r.link) l.href = r.link;
  $('result').hidden = false; $('next').focus();
  if ($('auto').checked) setTimeout(() => st.answered && nextQ(), 4000);
}

async function nextQ() { $('card').hidden = true; show(await fetchNext()); }

$('next').onclick = nextQ;
document.addEventListener('keydown', (e) => {
  if (!st.q || $('card').hidden) return;
  const k = 'abcd'.indexOf(e.key.toLowerCase());
  if (!st.answered && k >= 0 && k < st.q.options.length) answer(k);
});

init().catch((e) => status(e.message, true));
