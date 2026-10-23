const inc = (...h) => h.map((x) => `#include <${x}>`).join('\n') + '\n\n';
const NL = '\\n'; // a C++ newline escape, for use inside JS template strings
const num = (x) => String(x === 0 ? 0 : x);

const pad = (s, w, align, fill = ' ') => {
  const n = Math.max(0, w - s.length);
  if (align === '<') return s + fill.repeat(n);
  if (align === '>') return fill.repeat(n) + s;
  const l = Math.floor(n / 2);
  return fill.repeat(l) + s + fill.repeat(n - l);
};

// One random std::format replacement field with the text it must produce.
function fmtItem(R) {
  const words = ['ab', 'cpp', 'gcc', 'ok', 'abc', 'xyz', 'hi'];
  switch (R.int(0, 8)) {
    case 0: { const w = R.int(5, 8), s = R.pick(words); return { spec: `{:>${w}}`, arg: `"${s}"`, out: pad(s, w, '>') }; }
    case 1: { const w = R.int(5, 8), s = R.pick(words); return { spec: `{:<${w}}`, arg: `"${s}"`, out: pad(s, w, '<') }; }
    case 2: { const w = R.int(5, 9), s = R.pick(words); return { spec: `{:^${w}}`, arg: `"${s}"`, out: pad(s, w, '^') }; }
    case 3: { const w = R.int(4, 6), n = R.int(1, 999); return { spec: `{:0${w}}`, arg: `${n}`, out: String(n).padStart(w, '0') }; }
    case 4: { const n = R.int(10, 255); return { spec: '{:x}', arg: `${n}`, out: n.toString(16) }; }
    case 5: { const n = R.int(10, 255); return { spec: '{:#X}', arg: `${n}`, out: '0X' + n.toString(16).toUpperCase() }; }
    case 6: { const n = R.int(2, 63); return { spec: '{:b}', arg: `${n}`, out: n.toString(2) }; }
    case 7: {
      const d3 = R.pick([1, 2, 3, 4, 6, 7, 8, 9]);
      const v = (R.int(1, 99) * 10 + R.int(0, 9)) / 100 + d3 / 1000;
      const s = v.toFixed(3);
      return { spec: '{:.2f}', arg: s, out: Number(s).toFixed(2) };
    }
    default: { const w = R.int(5, 8), s = R.pick(['ab', 'cpp', 'ok']); return { spec: `{:*^${w}}`, arg: `"${s}"`, out: pad(s, w, '^', '*') }; }
  }
}

module.exports = { inc, NL, num, pad, fmtItem };
