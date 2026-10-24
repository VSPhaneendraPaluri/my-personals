const { inc, NL, fmtItem } = require('./common');

module.exports = [
  {
    id: 'concept-overloads', topic: 'Concepts & constrained overloads', minStd: '20',
    build(R) {
      const pool = [['1', 'integral'], ['2.5', 'floating'], ["'c'", 'integral'], ['3.0f', 'floating'], ['std::string("s")', 'generic'], ['true', 'integral'], ['nullptr', 'generic']];
      const picks = R.sample(pool, 4);
      return {
        kind: 'output',
        code: `${inc('concepts', 'iostream', 'string')}template <typename T>\nconst char* f(T) { return "generic"; }\n\ntemplate <std::integral T>\nconst char* f(T) { return "integral"; }\n\ntemplate <std::floating_point T>\nconst char* f(T) { return "floating"; }\n\nint main() {\n${picks.map((p) => `    std::cout << f(${p[0]}) << " ";`).join('\n')}\n    std::cout << "${NL}";\n}\n`,
        expected: picks.map((p) => p[1]).join(' '),
        wrong: [picks.map((p) => 'generic').join(' '), picks.map((p) => (p[1] === 'generic' ? 'integral' : p[1])).join(' '), picks.map((p) => (p[0] === "'c'" || p[0] === 'true' ? 'generic' : p[1])).join(' ')],
        explain: 'When several templates match, the more constrained one wins over the unconstrained one. char and bool satisfy std::integral; std::string and nullptr_t satisfy neither concept.',
      };
    },
  },
  {
    id: 'ranges-pipeline', topic: 'Ranges & views', minStd: '20',
    build(R) {
      const lo = R.int(1, 5), hi = lo + R.int(8, 14);
      const mod = R.int(2, 4), rem = R.int(0, mod - 1);
      const useFilter = R.chance(0.7);
      const tf = R.pick(['x * x', 'x + 10', 'x * 3']);
      const tfn = tf === 'x * x' ? (x) => x * x : tf === 'x + 10' ? (x) => x + 10 : (x) => x * 3;
      const rev = R.chance(0.4), take = R.chance(0.6) ? R.int(2, 4) : 0, drop = R.chance(0.3) ? R.int(1, 2) : 0;
      let arr = []; for (let x = lo; x < hi; x++) arr.push(x);
      let pipe = `std::views::iota(${lo}, ${hi})`;
      if (useFilter) { arr = arr.filter((x) => x % mod === rem); pipe += ` | std::views::filter([](int x) { return x % ${mod} == ${rem}; })`; }
      arr = arr.map(tfn); pipe += ` | std::views::transform([](int x) { return ${tf}; })`;
      if (rev) { arr = [...arr].reverse(); pipe += ' | std::views::reverse'; }
      if (drop) { arr = arr.slice(drop); pipe += ` | std::views::drop(${drop})`; }
      if (take) { arr = arr.slice(0, take); pipe += ` | std::views::take(${take})`; }
      return {
        kind: 'output',
        code: `${inc('iostream', 'ranges')}int main() {\n    auto r = ${pipe.replace(/ \| /g, '\n           | ')};\n    for (int x : r) std::cout << x << " ";\n    std::cout << "${NL}";\n}\n`,
        expected: arr.join(' '),
        wrong: [[...arr].reverse().join(' '), arr.map((x) => x + 1).join(' '), arr.slice(1).join(' ')],
        explain: 'Views are lazy: the pipeline is applied to each element in order. iota produces [lo, hi), filter keeps matches, transform maps, reverse/drop/take reshape the result.',
      };
    },
  },
  {
    id: 'spaceship-default', topic: 'Defaulted <=> comparison', minStd: '20',
    build(R) {
      const fields = R.shuffle(['major', 'minor', 'patch']);
      const mk = () => Object.fromEntries(fields.map((f) => [f, R.int(0, 2)]));
      const a = mk(), b = R.chance(0.3) ? { ...a } : mk();
      const cmp = (x, y) => { for (const f of fields) { if (x[f] !== y[f]) return x[f] < y[f] ? -1 : 1; } return 0; };
      const c = cmp(a, b);
      const lit = (o) => `{${fields.map((f) => o[f]).join(', ')}}`;
      return {
        kind: 'output',
        code: `${inc('compare', 'iostream')}struct Version {\n${fields.map((f) => `    int ${f};`).join('\n')}\n    auto operator<=>(const Version&) const = default;\n};\n\nint main() {\n    Version a${lit(a)};\n    Version b${lit(b)};\n    std::cout << (a < b) << (a == b) << (a >= b) << "${NL}";\n}\n`,
        expected: `${c < 0 ? 1 : 0}${c === 0 ? 1 : 0}${c >= 0 ? 1 : 0}`,
        wrong: [`${c > 0 ? 1 : 0}${c === 0 ? 1 : 0}${c < 0 ? 1 : 0}`, `${c <= 0 ? 1 : 0}${c === 0 ? 1 : 0}${c > 0 ? 1 : 0}`, `${c < 0 ? 1 : 0}${c === 0 ? 0 : 1}${c >= 0 ? 1 : 0}`],
        explain: `A defaulted <=> compares members lexicographically in declaration order (${fields.join(', ')}); it also gives you ==, <, <=, > and >=.`,
      };
    },
  },
  {
    id: 'designated-init', topic: 'Designated initializers', minStd: '20',
    build(R) {
      const names = ['w', 'h', 'd', 'v'];
      const chosen = names.filter(() => R.chance(0.55));
      if (chosen.length === 0) chosen.push(R.pick(names));
      const vals = {}; for (const n of chosen) vals[n] = n === 'v' ? 1 : R.int(2, 9);
      const out = names.map((n) => (n in vals ? vals[n] : 0));
      return {
        kind: 'output',
        code: `${inc('iostream')}struct Cfg {\n    int w;\n    int h;\n    int d;\n    bool v;\n};\n\nint main() {\n    Cfg c{${chosen.map((n) => `.${n} = ${n === 'v' ? 'true' : vals[n]}`).join(', ')}};\n    std::cout << c.w << " " << c.h << " " << c.d << " " << c.v << "${NL}";\n}\n`,
        expected: out.join(' '),
        wrong: [out.map((x, i) => (x === 0 ? [7, 7, 7, 1][i] : x)).join(' '), [...out].reverse().join(' '), out.map((x) => (x === 0 ? 1 : x)).join(' ')],
        explain: 'Members not named in a designated initializer are value-initialised (zero here). Designators must appear in declaration order.',
      };
    },
  },
  {
    id: 'erase-if', topic: 'std::erase_if', minStd: '20',
    build(R) {
      const v = R.ints(8, 1, 20), k = R.int(2, 4), r = R.int(0, k - 1);
      const kept = v.filter((x) => x % k !== r);
      return {
        kind: 'output',
        code: `${inc('iostream', 'vector')}int main() {\n    std::vector<int> v = {${v.join(', ')}};\n    auto n = std::erase_if(v, [](int x) { return x % ${k} == ${r}; });\n    std::cout << n << ":";\n    for (int x : v) std::cout << " " << x;\n    std::cout << "${NL}";\n}\n`,
        expected: `${v.length - kept.length}: ${kept.join(' ')}`.trim(),
        wrong: [`${kept.length}: ${kept.join(' ')}`.trim(), `${v.length - kept.length}: ${v.filter((x) => x % k === r).join(' ')}`.trim(), `${v.length - kept.length}: ${[...kept].reverse().join(' ')}`.trim()],
        explain: 'std::erase_if removes all elements matching the predicate and returns how many were removed; the survivors keep their relative order.',
      };
    },
  },
  {
    id: 'bit-functions', topic: '<bit> utilities', minStd: '20',
    build(R) {
      const pc = (n) => n.toString(2).split('1').length - 1;
      const pool = [
        () => { const n = R.int(1, 255); return [`std::popcount(${n}u)`, pc(n)]; },
        () => { const n = R.int(1, 255); return [`std::bit_width(${n}u)`, n.toString(2).length]; },
        () => { const n = R.int(1, 200); return [`std::countl_zero(static_cast<std::uint8_t>(${n}))`, 8 - n.toString(2).length]; },
        () => { const n = R.int(3, 100); let p = 1; while (p < n) p *= 2; return [`std::bit_ceil(${n}u)`, p]; },
        () => { const n = R.pick([1, 2, 3, 4, 6, 8, 12, 16, 24, 32]); return [`std::has_single_bit(${n}u)`, pc(n) === 1 ? 1 : 0]; },
        () => { const n = R.int(1, 255), k = R.int(1, 7); return [`std::rotl(static_cast<std::uint8_t>(${n}), ${k})`, ((n << k) | (n >> (8 - k))) & 255]; },
      ];
      const picks = R.sample(pool, 3).map((f) => f());
      return {
        kind: 'output',
        code: `${inc('bit', 'cstdint', 'iostream')}int main() {\n    std::cout ${picks.map((p) => `<< static_cast<int>(${p[0]})`).join(' << " " ')} << "${NL}";\n}\n`,
        expected: picks.map((p) => p[1]).join(' '),
        wrong: [picks.map((p) => p[1] + 1).join(' '), picks.map((p) => Math.max(0, p[1] - 1)).join(' '), [...picks].reverse().map((p) => p[1]).join(' ')],
        explain: 'popcount counts set bits; bit_width is the number of bits needed (0 for 0); countl_zero counts leading zeros within the operand width; bit_ceil rounds up to a power of two; rotl rotates bits within the operand width.',
      };
    },
  },
  {
    id: 'std-format', topic: 'std::format', minStd: '20', gcc: 13,
    build(R) {
      const items = Array.from({ length: 3 }, () => fmtItem(R));
      return {
        kind: 'output',
        code: `${inc('format', 'iostream')}int main() {\n    std::cout << std::format("${items.map((i) => i.spec).join('|')}", ${items.map((i) => i.arg).join(', ')}) << "${NL}";\n}\n`,
        expected: items.map((i) => i.out).join('|'),
        wrong: [items.map((i) => i.out.trim()).join('|') === items.map((i) => i.out).join('|') ? items.map((i) => i.out + '.').join('|') : items.map((i) => i.out.trim()).join('|'), items.map((i) => i.out.toUpperCase()).join('|')],
        keepWhitespace: true,
        explain: 'In a format spec: fill/align (<, >, ^ — centre puts the extra space on the right), 0 pads numbers with zeros, x/X/b choose the base (# adds the prefix), .Nf sets fixed precision, and "|" is copied literally.',
      };
    },
  },
  {
    id: 'span-slicing', topic: 'std::span', minStd: '20',
    build(R) {
      const arr = R.ints(7, 1, 30);
      const ops = [
        [(n) => `.first(${n})`, (a, n) => a.slice(0, n)],
        [(n) => `.last(${n})`, (a, n) => a.slice(a.length - n)],
        [(n, m) => `.subspan(${n}, ${m})`, (a, n, m) => a.slice(n, n + m)],
      ];
      let cur = arr, expr = 's';
      for (let i = 0; i < 2; i++) {
        const [fmt, fn] = R.pick(ops);
        const n = R.int(1, Math.max(1, Math.min(cur.length - 2, 5))), m = R.int(1, Math.max(1, Math.min(cur.length - n, 4)));
        if (cur.length < 3) break;
        if (fmt === ops[2][0]) { expr += fmt(n, m); cur = fn(cur, n, m); } else { expr += fmt(n); cur = fn(cur, n); }
      }
      return {
        kind: 'output',
        code: `${inc('iostream', 'span')}int main() {\n    int arr[] = {${arr.join(', ')}};\n    std::span<int> s(arr);\n    for (int x : ${expr}) std::cout << x << " ";\n    std::cout << "${NL}";\n}\n`,
        expected: cur.join(' '),
        wrong: [[...cur].reverse().join(' '), cur.map((x) => x + 1).join(' '), arr.slice(0, cur.length).join(' ') === cur.join(' ') ? arr.slice(1, cur.length + 1).join(' ') : arr.slice(0, cur.length).join(' ')],
        explain: 'first(n) is the first n elements, last(n) the last n, subspan(offset, count) a window. Each call returns a new non-owning view of the same array, so the calls compose.',
      };
    },
  },
  {
    id: 'contains-starts', topic: 'contains / starts_with / ends_with', minStd: '20',
    build(R) {
      const words = ['compiler', 'template', 'iterator', 'function', 'standard'];
      const w = R.pick(words);
      const pre = R.chance(0.5) ? w.slice(0, 3) : R.pick(['xyz', 'abc', 'tem', 'fun']);
      const ch = R.chance(0.5) ? w[w.length - 1] : R.pick(['q', 'z', 'x']);
      const keys = R.sample([1, 2, 3, 4, 5, 6], 3), probe = R.int(1, 6);
      return {
        kind: 'output',
        code: `${inc('iostream', 'set', 'string')}int main() {\n    std::string s = "${w}";\n    std::set<int> st = {${keys.join(', ')}};\n    std::cout << std::boolalpha << s.starts_with("${pre}") << " " << s.ends_with('${ch}') << " " << st.contains(${probe}) << "${NL}";\n}\n`,
        expected: `${w.startsWith(pre)} ${w.endsWith(ch)} ${keys.includes(probe)}`,
        wrong: [`${!w.startsWith(pre)} ${w.endsWith(ch)} ${keys.includes(probe)}`, `${w.startsWith(pre)} ${!w.endsWith(ch)} ${!keys.includes(probe)}`, `${w.startsWith(pre)} ${w.endsWith(ch)} ${!keys.includes(probe)}`],
        explain: 'C++20 added string::starts_with/ends_with and contains() on associative containers. std::boolalpha prints true/false instead of 1/0.',
      };
    },
  },
  {
    id: 'ranges-sort-projection', topic: 'ranges::sort with projection', minStd: '20',
    build(R) {
      const names = R.sample(['Ann', 'Bob', 'Cid', 'Dee', 'Eve', 'Fay'], 4), ages = R.distinct(4, 18, 60);
      const desc = R.chance(0.5);
      const rows = names.map((n, i) => ({ n, a: ages[i] }));
      const sorted = [...rows].sort((x, y) => (desc ? y.a - x.a : x.a - y.a));
      return {
        kind: 'output',
        code: `${inc('algorithm', 'functional', 'iostream', 'string', 'vector')}struct P {\n    std::string name;\n    int age;\n};\n\nint main() {\n    std::vector<P> v = {${rows.map((r) => `{"${r.n}", ${r.a}}`).join(', ')}};\n    std::ranges::sort(v, ${desc ? 'std::greater<>{}' : '{}'}, &P::age);\n    for (const auto& p : v) std::cout << p.name << " ";\n    std::cout << "${NL}";\n}\n`,
        expected: sorted.map((r) => r.n).join(' '),
        wrong: [[...sorted].reverse().map((r) => r.n).join(' '), [...rows].sort((x, y) => (x.n < y.n ? -1 : 1)).map((r) => r.n).join(' '), rows.map((r) => r.n).join(' ')],
        explain: 'The projection &P::age is applied to each element before the comparator sees it. `{}` means the default std::ranges::less; std::greater<>{} reverses the order.',
      };
    },
  },
  {
    id: 'consteval-compile', topic: 'consteval functions', minStd: '11', kind: 'compile',
    build(R, S) {
      const arg = R.pick([
        ['5', true, ''], ['constexpr int k = 4;', true, 'k'], ['const int k = 3;', true, 'k'], ['int k = 3;', false, 'k'], ['int k = 3; ++k;', false, 'k'],
      ]);
      const callArg = arg[2] || arg[0];
      const decl = arg[2] ? `    ${arg[0]}\n` : '';
      const ok = arg[1];
      return {
        kind: 'compile',
        code: `consteval int square(int n) { return n * n; }\n\nint main() {\n${decl}    return square(${callArg}) > 0 ? 0 : 1;\n}\n`,
        expected: S.ge('20') && ok ? 'ok' : 'error',
        errorRe: S.ge('20') && !ok ? /constant|consteval/i : null,
        explain: !S.ge('20') ? '`consteval` is a C++20 keyword.' : (ok ? 'Every call to a consteval function must be a constant expression; the argument is a compile-time constant, so this is fine.' : 'A call to a consteval function must be a constant expression. A plain non-const int variable is not usable in constant expressions, so the call is ill-formed.'),
      };
    },
  },
];
