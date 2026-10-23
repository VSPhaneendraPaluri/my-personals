const { inc, NL } = require('./common');

module.exports = [
  {
    id: 'structured-binding-map', topic: 'Structured bindings', minStd: '17',
    build(R) {
      const keys = R.sample('abcdefgh'.split(''), 3);
      const vals = R.ints(3, 1, 9), k = R.int(2, 5);
      const entries = keys.map((c, i) => [c, vals[i]]);
      const sorted = [...entries].sort((a, b) => (a[0] < b[0] ? -1 : 1));
      return {
        kind: 'output',
        code: `${inc('iostream', 'map')}int main() {\n    std::map<char, int> m = {${entries.map(([c, v]) => `{'${c}', ${v}}`).join(', ')}};\n    for (auto& [key, value] : m) value *= ${k};\n    for (const auto& [key, value] : m) std::cout << key << "=" << value << " ";\n    std::cout << "${NL}";\n}\n`,
        expected: sorted.map(([c, v]) => `${c}=${v * k}`).join(' '),
        wrong: [sorted.map(([c, v]) => `${c}=${v}`).join(' '), entries.map(([c, v]) => `${c}=${v * k}`).join(' '), [...sorted].reverse().map(([c, v]) => `${c}=${v * k}`).join(' ')],
        explain: 'std::map keeps keys sorted. `auto&` in the first loop binds to the real elements (value is a reference to the mapped value), so they are multiplied in place.',
      };
    },
  },
  {
    id: 'structured-binding-copy', topic: 'Structured bindings: copy vs reference', minStd: '17',
    build(R) {
      const [A, B] = R.distinct(2, 1, 20), K = R.int(2, 9), ref = R.chance(0.5);
      return {
        kind: 'output',
        code: `${inc('iostream', 'utility')}int main() {\n    std::pair<int, int> p{${A}, ${B}};\n    auto${ref ? '&' : ''} [x, y] = p;\n    x += ${K};\n    std::cout << p.first << " " << x << " " << y << "${NL}";\n}\n`,
        expected: `${ref ? A + K : A} ${A + K} ${B}`,
        wrong: [`${ref ? A : A + K} ${A + K} ${B}`, `${A} ${A} ${B}`, `${A + K} ${A + K} ${B + K}`],
        explain: ref ? '`auto&` makes the bindings refer to the members of p, so modifying x modifies p.first.' : '`auto` first copies p into a hidden object; x refers to that copy, so p is untouched.',
      };
    },
  },
  {
    id: 'set-insert-init', topic: 'if with initializer', minStd: '17',
    build(R) {
      const vals = R.ints(5, 1, 6);
      const seen = new Set(); const res = vals.map((v) => { const ok = !seen.has(v); seen.add(v); return ok ? 1 : 0; });
      return {
        kind: 'output',
        code: `${inc('iostream', 'set')}int main() {\n    std::set<int> s;\n${vals.map((v) => `    if (auto [it, ok] = s.insert(${v}); ok) std::cout << "1 "; else std::cout << "0 ";`).join('\n')}\n    std::cout << s.size() << "${NL}";\n}\n`,
        expected: `${res.join(' ')} ${seen.size}`,
        wrong: [`${res.map(() => 1).join(' ')} ${vals.length}`, `${res.map((r) => 1 - r).join(' ')} ${seen.size}`, `${res.join(' ')} ${vals.length}`],
        explain: 'set::insert returns {iterator, bool}; the bool is false when the value was already present, and duplicates are not stored.',
      };
    },
  },
  {
    id: 'fold-expression', topic: 'Fold expressions', minStd: '17',
    build(R) {
      const v = R.ints(4, 1, 9);
      const left = R.chance(0.5);
      const val = left ? v.reduce((a, b) => a - b) : v[0] - (v[1] - (v[2] - v[3]));
      const other = left ? v[0] - (v[1] - (v[2] - v[3])) : v.reduce((a, b) => a - b);
      return {
        kind: 'output',
        code: `${inc('iostream')}template <typename... Ts>\nauto f(Ts... ts) {\n    return (${left ? '... - ts' : 'ts - ...'});\n}\n\nint main() {\n    std::cout << f(${v.join(', ')}) << "${NL}";\n}\n`,
        expected: `${val}`,
        wrong: [`${other}`, `${v.reduce((a, b) => a + b)}`, `${val + 2}`],
        explain: left ? '`(... - ts)` is a left fold: ((a - b) - c) - d.' : '`(ts - ...)` is a right fold: a - (b - (c - d)).',
      };
    },
  },
  {
    id: 'optional-basic', topic: 'std::optional', minStd: '17',
    build(R) {
      const [d, x] = R.distinct(2, 1, 99);
      return {
        kind: 'output',
        code: `${inc('iostream', 'optional')}int main() {\n    std::optional<int> a;\n    std::optional<int> b = ${x};\n    std::cout << a.value_or(${d}) << " " << b.value_or(${d}) << " " << a.has_value() << b.has_value() << "${NL}";\n}\n`,
        expected: `${d} ${x} 01`,
        wrong: [`${x} ${d} 10`, `${d} ${d} 00`, `${d} ${x} 10`],
        explain: 'value_or returns the contained value if present, otherwise the fallback. A default-constructed optional is empty.',
      };
    },
  },
  {
    id: 'if-constexpr-kind', topic: 'if constexpr & type traits', minStd: '17',
    build(R) {
      const pool = [['1', 'integral'], ['2.0', 'floating'], ["'c'", 'integral'], ['"text"', 'pointer'], ['true', 'integral'], ['2.5f', 'floating'], ['std::string("s")', 'other'], ['nullptr', 'other'], ['&x', 'pointer']];
      const picks = R.sample(pool, 4);
      return {
        kind: 'output',
        code: `${inc('iostream', 'string', 'type_traits')}template <typename T>\nconst char* kind(T) {\n    if constexpr (std::is_integral_v<T>) return "integral";\n    else if constexpr (std::is_floating_point_v<T>) return "floating";\n    else if constexpr (std::is_pointer_v<T>) return "pointer";\n    else return "other";\n}\n\nint main() {\n    int x = 0;\n    (void)x;\n${picks.map((p) => `    std::cout << kind(${p[0]}) << " ";`).join('\n')}\n    std::cout << "${NL}";\n}\n`,
        expected: picks.map((p) => p[1]).join(' '),
        wrong: [picks.map((p) => (p[0] === '"text"' ? 'other' : p[1])).join(' '), picks.map((p) => (p[0] === 'nullptr' ? 'pointer' : p[0] === "'c'" || p[0] === 'true' ? 'other' : p[1])).join(' ')],
        explain: 'T is deduced by value: "text" decays to const char* (a pointer); char and bool are integral types; std::nullptr_t is not a pointer type, so it falls to "other".',
      };
    },
  },
  {
    id: 'variant-index', topic: 'std::variant', minStd: '17',
    build(R) {
      const pool = [['5', 0], ['2.5', 1], ['std::string("x")', 2], ["'c'", 0], ['3.5f', 1], ['-8', 0]];
      const picks = R.sample(pool, 3);
      return {
        kind: 'output',
        code: `${inc('iostream', 'string', 'variant')}int main() {\n    std::variant<int, double, std::string> v;\n    std::cout << v.index() << " ";\n${picks.map((p) => `    v = ${p[0]};\n    std::cout << v.index() << " ";`).join('\n')}\n    std::cout << "${NL}";\n}\n`,
        expected: `0 ${picks.map((p) => p[1]).join(' ')}`,
        wrong: [`1 ${picks.map((p) => p[1]).join(' ')}`, `0 ${picks.map((p) => (p[1] + 1) % 3).join(' ')}`, `0 ${picks.map((p) => (p[0] === "'c'" ? 1 : p[1])).join(' ')}`],
        explain: 'A default-constructed variant holds its first alternative (index 0). Assigning picks the best-matching alternative: int and char go to int, double and float to double.',
      };
    },
  },
  {
    id: 'string-view', topic: 'std::string_view', minStd: '17',
    build(R) {
      const w = R.pick(['compiler', 'template', 'iterator', 'function', 'standard']);
      const p = R.int(1, 3), s = R.int(1, 3);
      const r = w.slice(p, w.length - s);
      return {
        kind: 'output',
        code: `${inc('iostream', 'string_view')}int main() {\n    std::string_view sv = "${w}";\n    sv.remove_prefix(${p});\n    sv.remove_suffix(${s});\n    std::cout << sv << " " << sv.size() << "${NL}";\n}\n`,
        expected: `${r} ${r.length}`,
        wrong: [`${w.slice(p)} ${w.length - p}`, `${w.slice(0, w.length - s)} ${w.length - s}`, `${w.slice(p + 1, w.length - s)} ${r.length - 1}`],
        explain: 'remove_prefix/remove_suffix just narrow the view; no characters are copied or modified.',
      };
    },
  },
  {
    id: 'gcd-clamp', topic: 'std::gcd, std::lcm, std::clamp', minStd: '17',
    build(R) {
      const g = R.int(2, 9), a = g * R.int(2, 6), b = g * R.int(2, 6);
      const gcd = (x, y) => (y ? gcd(y, x % y) : x);
      const lo = R.int(1, 10), hi = lo + R.int(5, 20), v = R.int(0, 40);
      const exprs = [
        [`std::gcd(${a}, ${b})`, gcd(a, b)],
        [`std::lcm(${a}, ${b})`, (a * b) / gcd(a, b)],
        [`std::clamp(${v}, ${lo}, ${hi})`, Math.min(Math.max(v, lo), hi)],
      ];
      return {
        kind: 'output',
        code: `${inc('algorithm', 'iostream', 'numeric')}int main() {\n    std::cout ${exprs.map((e) => `<< ${e[0]}`).join(' << " " ')} << "${NL}";\n}\n`,
        expected: exprs.map((e) => e[1]).join(' '),
        wrong: [exprs.map((e) => e[1] + 1).join(' '), `${a * b} ${gcd(a, b)} ${exprs[2][1]}`, `${exprs[0][1]} ${exprs[1][1]} ${v}`],
        explain: 'gcd and lcm live in <numeric> (C++17); clamp(v, lo, hi) returns v limited to the range [lo, hi].',
      };
    },
  },
  {
    id: 'eval-order-17', topic: 'Evaluation order (C++17 guarantee)', minStd: '17',
    build(R) {
      let i = R.int(1, 9); const start = i;
      const toks = Array.from({ length: 3 }, () => R.pick(['i', 'i++', '++i', 'i--']));
      const out = toks.map((t) => (t === 'i' ? i : t === 'i++' ? i++ : t === '++i' ? ++i : i--));
      let j = start; const rev = [...toks].reverse().map((t) => (t === 'i' ? j : t === 'i++' ? j++ : t === '++i' ? ++j : j--)).reverse();
      return {
        kind: 'output',
        code: `${inc('iostream')}int main() {\n    int i = ${start};\n    std::cout << ${toks.join(' << " " << ')} << "${NL}";\n}\n`,
        expected: out.join(' '),
        wrong: [rev.join(' '), out.map((v) => v + 1).join(' '), toks.map(() => i).join(' ')],
        explain: 'Since C++17 the operands of << are evaluated strictly left to right, so each term sees the side effects of the ones before it.',
      };
    },
  },
  {
    id: 'cpp17-elision-ctad-compile', topic: 'Guaranteed elision & CTAD', minStd: '11', kind: 'compile',
    build(R, S) {
      if (R.chance(0.5)) {
        const viaFn = R.chance(0.5);
        return {
          kind: 'compile',
          code: `struct NoCopy {\n    NoCopy() = default;\n    NoCopy(const NoCopy&) = delete;\n    NoCopy(NoCopy&&) = delete;\n};\n\n${viaFn ? 'NoCopy make() { return NoCopy(); }\n\n' : ''}int main() {\n    NoCopy n = ${viaFn ? 'make()' : 'NoCopy()'};\n    (void)n;\n}\n`,
          expected: S.ge('17') ? 'ok' : 'error', errorRe: null,
          explain: S.ge('17') ? 'C++17 guarantees copy elision when initialising from a prvalue: no copy or move constructor is needed (or even considered), so a non-movable type is fine.' : 'Before C++17 initialising from a prvalue formally requires an accessible copy/move constructor (even if elided in practice). It is deleted here, so this is an error.',
        };
      }
      const bad = R.chance(0.4);
      const decl = bad ? 'std::vector v;' : R.pick(['std::pair p(1, 2.5);', 'std::vector v{1, 2, 3};', 'std::tuple t(1, 2.5, \'c\');']);
      return {
        kind: 'compile',
        code: `${inc('tuple', 'utility', 'vector')}int main() {\n    ${decl}\n    (void)${decl.match(/ (\w+)[({;]/)[1]};\n}\n`,
        expected: S.ge('17') && !bad ? 'ok' : 'error', errorRe: null,
        explain: !S.ge('17') ? 'Class template argument deduction (CTAD) was introduced in C++17; earlier you must spell out the template arguments.' : (bad ? 'With no initialiser there is nothing to deduce the element type from, so `std::vector v;` is ill-formed.' : 'C++17 deduces the class template arguments from the initialiser.'),
      };
    },
  },
  {
    id: 'removed-in-17', topic: 'Features removed in C++17', minStd: '98', kind: 'compile',
    build(R, S) {
      const items = [
        ['++ on bool', 'int main() {\n    bool b = false;\n    ++b;\n    return b ? 0 : 1;\n}\n', 'Incrementing a bool was deprecated in C++98 and removed in C++17.'],
        ['dynamic exception specification', 'void f() throw(int) {}\n\nint main() {\n    f();\n}\n', 'Dynamic exception specifications such as throw(int) were deprecated in C++11 and removed in C++17 (only throw() / noexcept remain).'],
        ['register keyword', 'int main() {\n    register int x = 3;\n    return x == 3 ? 0 : 1;\n}\n', 'The `register` storage class specifier was deprecated in C++11 and removed in C++17 (the keyword stays reserved).'],
      ];
      const [what, code, why] = R.pick(items);
      return {
        kind: 'compile', code,
        expected: S.ge('17') ? 'error' : 'ok', errorRe: null,
        explain: S.ge('17') ? why : `${why} In this earlier standard it is still accepted (often with a deprecation warning).`,
      };
    },
  },
];
