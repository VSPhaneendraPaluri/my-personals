const $ = (id) => document.getElementById(id);
const st = { std: '', q: null, next: null, answered: false, score: { n: 0, c: 0, s: 0 } };
const J = async (u, o) => { const r = await fetch(u, o); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`); return j; };
const status = (html, err) => { const s = $('status'); s.hidden = !html; s.className = 'status' + (err ? ' err' : ''); s.innerHTML = html || ''; };
const load = (std) => J('/api/question?std=' + encodeURIComponent(std));

async function init() {
  const info = await J('/api/standards');
  for (const s of info.standards) $('std').add(new Option(s.label + (s.key === '26' ? ' (-std=c++2c)' : ''), s.key));
  $('foot').textContent = info.compiler ? `Verified with ${info.compiler} · flags: -std=… -pedantic-errors` : 'Compiler Explorer is not reachable right now.';
  try { const last = localStorage.getItem('std'); if (last && [...$('std').options].some((o) => o.value === last)) { $('std').value = last; start(); } } catch {}
}

async function start() {
  st.std = $('std').value; st.next = null;
  try { localStorage.setItem('std', st.std); } catch {}
  $('card').hidden = true;
  if (!st.std) return status('');
  show(await fetchNext());
}

async function fetchNext() {
  const std = st.std;
  status('<span class="spin"></span>Generating a question and verifying it on godbolt.org…');
  try {
    const q = st.next ? await st.next : await load(std);
    st.next = null;
    if (std !== st.std) return null;
    return q;
  } catch (e) { st.next = null; status(`${e.message} <br><br><button class="primary" id="retry">Try again</button>`, true); $('retry').onclick = start; return null; }
}

function show(q) {
  if (!q) return;
  status(''); st.q = q; st.answered = false;
  $('card').hidden = false; $('result').hidden = true;
  $('topic').textContent = q.topic; $('flags').textContent = `g++ ${q.flags}`;
  $('prompt').textContent = q.kind === 'compile' ? `Does this program compile with ${q.flags}? ` : 'What is the output of this program?';
  const code = $('code'); code.textContent = q.code; code.removeAttribute('data-highlighted');
  if (window.hljs) hljs.highlightElement(code);
  const box = $('options'); box.innerHTML = '';
  q.options.forEach((t, i) => {
    const b = document.createElement('button'); b.className = 'opt';
    b.innerHTML = `<b>${'ABCD'[i]}</b>`; b.append(document.createTextNode(t));
    b.onclick = () => answer(i); box.append(b);
  });
  $('foot').textContent = `Verified with ${q.compiler} · ${q.stats.verified} questions confirmed, ${q.stats.rejected} rejected by the compiler so far`;
  st.next = load(st.std).catch(() => null); // prefetch the next one
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function answer(i) {
  if (st.answered) return; st.answered = true;
  let r;
  try { r = await J('/api/answer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: st.q.id, choice: i }) }); }
  catch (e) { st.answered = false; return status(e.message, true); }
  [...$('options').children].forEach((b, k) => { b.disabled = true; if (k === r.answer) b.classList.add('right'); else if (k === i) b.classList.add('wrong'); });
  const s = st.score; s.n++; if (r.correct) { s.c++; s.s++; } else s.s = 0;
  $('sc-c').textContent = s.c; $('sc-n').textContent = s.n; $('sc-s').textContent = s.s; $('score').hidden = false;
  $('verdict').textContent = r.correct ? '✓ Correct' : '✗ Not quite'; $('verdict').className = r.correct ? 'ok' : 'bad';
  $('explain').textContent = r.explain;
  $('actual-title').textContent = st.q.kind === 'compile' ? 'Compiler Explorer result' : 'Real output from Compiler Explorer';
  $('actual').textContent = r.actual || '(no output)';
  const l = $('link'); l.hidden = !r.link; if (r.link) l.href = r.link;
  $('result').hidden = false; $('next').focus();
  if ($('auto').checked) setTimeout(() => st.answered && next(), 4000);
}

async function next() { $('card').hidden = true; show(await fetchNext()); }

$('std').onchange = start; $('next').onclick = next;
document.addEventListener('keydown', (e) => {
  if (!st.q || $('card').hidden) return;
  const k = 'abcd'.indexOf(e.key.toLowerCase());
  if (!st.answered && k >= 0 && k < st.q.options.length) answer(k);
});
init().catch((e) => status(e.message, true));
