const { inc, NL } = require('./common');

module.exports = [
  {
    id: 'generic-lambda', topic: 'Generic lambdas', minStd: '14',
    build(R) {
      const pool = [
        () => { const a = R.int(1, 9), b = R.int(1, 9); return [`add(${a}, ${b})`, `${a + b}`]; },
        () => { const a = R.int(1, 9); return [`add(${a}, 0.5)`, `${a + 0.5}`]; },
        () => { const a = R.int(1, 3) + 0.25, b = R.int(1, 3) + 0.5; return [`add(${a}, ${b})`, `${a + b}`]; },
        () => { const k = R.int(1, 5); return [`add('a', ${k})`, `${97 + k}`]; },
        () => { const w = R.pick(['ab', 'cd', 'xy']); return [`add(std::string("${w}"), "!")`, `${w}!`]; },
      ];
      const picks = R.sample(pool, 3).map((f) => f());
      return {
        kind: 'output',
        code: `${inc('iostream', 'string')}int main() {\n    auto add = [](auto a, auto b) { return a + b; };\n    std::cout ${picks.map((p) => `<< ${p[0]}`).join(' << " " ')} << "${NL}";\n}\n`,
        expected: picks.map((p) => p[1]).join(' '),
        wrong: [picks.map((p) => (/^\d+$/.test(p[1]) ? String(Number(p[1]) + 1) : p[1] + '0')).join(' '), picks.map((p) => (/^\d+\.\d+$/.test(p[1]) ? String(Math.trunc(Number(p[1]))) : p[1])).join(' '), picks.map((p) => (p[0].includes("'a'") ? String.fromCharCode(Number(p[1])) : p[1])).join(' '), [...picks].reverse().map((p) => p[1]).join(' ')],
        wrongWhy: ["Every call deduces its own types: apply the usual arithmetic conversions to each call separately.", "A generic lambda deduces double for the call with a double argument, so the fractional part is not truncated away.", "char + int is an int addition (the char is promoted), so the number is printed rather than a character.", "The calls are printed in the order they appear in the statement, not reversed."],
        explain: 'A generic lambda has a templated operator(), so each call deduces its own types: int+int stays int, int+double is double, char+int promotes to int (so \'a\'+k prints a number), std::string + const char* concatenates.',
      };
    },
  },
  {
    id: 'decltype-auto', topic: 'auto vs decltype(auto)', minStd: '14',
    build(R) {
      const X = R.int(1, 9);
      const forms = [
        ['decltype(auto) r = (x);', true],
        ['decltype(auto) r = x;', false],
        ['auto& r = x;', true],
        ['auto r = x;', false],
        ['auto r = (x);', false],
      ];
      const [decl, isRef] = R.pick(forms);
      return {
        kind: 'output',
        code: `${inc('iostream')}int main() {\n    int x = ${X};\n    ${decl}\n    r += 10;\n    std::cout << x << " " << r << "${NL}";\n}\n`,
        expected: `${isRef ? X + 10 : X} ${X + 10}`,
        wrong: [`${isRef ? X : X + 10} ${X + 10}`, `${X} ${X}`, `${X + 10} ${X}`],
        wrongWhy: ["Whether x also changes depends on whether r is a reference: auto copies, auto& and decltype(auto) on (x) refer to x.", "r += 10 modifies r, so r certainly changes.", "r is the one that is incremented, and the values are printed as x first, then r."],
        explain: '`auto` drops references (always a copy); `auto&` is a reference; `decltype(auto)` keeps the exact type of the expression, and `(x)` is an lvalue expression so it yields int&, while plain `x` yields int.',
      };
    },
  },
  {
    id: 'binary-literals', topic: 'Binary literals & digit separators', minStd: '14',
    build(R) {
      const bits = R.int(32, 255), oct = R.int(8, 63), hex = R.int(16, 200);
      const b = bits.toString(2).padStart(8, '0');
      const lit = `0b${b.slice(0, 4)}'${b.slice(4)}`;
      return {
        kind: 'output',
        code: `${inc('iostream')}int main() {\n    int a = ${lit};\n    int b = 0${oct.toString(8)};\n    int c = 0x${hex.toString(16)};\n    std::cout << a << " " << b << " " << c << " " << a + b + c << "${NL}";\n}\n`,
        expected: `${bits} ${oct} ${hex} ${bits + oct + hex}`,
        wrong: [`${bits} ${parseInt(oct.toString(8), 10)} ${hex} ${bits + parseInt(oct.toString(8), 10) + hex}`, `${bits} ${oct} ${hex} ${bits + oct}`],
        wrongWhy: ["A leading 0 means octal: the digits are read in base 8, not base 10.", "The sum a + b + c includes all three values, not just two."],
        explain: '0b… is a binary literal (C++14), the apostrophe is a digit separator that is ignored, a leading 0 means octal, and 0x means hexadecimal.',
      };
    },
  },
  {
    id: 'exchange', topic: 'std::exchange', minStd: '14',
    build(R) {
      const [x, y, z] = R.distinct(3, 1, 99);
      return {
        kind: 'output',
        code: `${inc('iostream', 'utility')}int main() {\n    int v = ${x};\n    int a = std::exchange(v, ${y});\n    int b = std::exchange(v, ${z});\n    std::cout << a << " " << b << " " << v << "${NL}";\n}\n`,
        expected: `${x} ${y} ${z}`,
        wrong: [`${y} ${z} ${z}`, `${x} ${y} ${y}`, `${z} ${y} ${x}`],
        wrongWhy: ["exchange RETURNS the old value, so a holds what v held before the first call.", "The second call returns what the first call stored; v ends with the last stored value.", "The returned values come in call order, with the final value of v last."],
        explain: 'std::exchange stores the new value and returns the old one.',
      };
    },
  },
  {
    id: 'init-capture', topic: 'Lambda init-captures', minStd: '14',
    build(R) {
      if (R.chance(0.5)) {
        const x = R.int(2, 9), k = R.int(2, 5), z = R.int(50, 99);
        return {
          kind: 'output',
          code: `${inc('iostream')}int main() {\n    int x = ${x};\n    auto f = [y = x * ${k}]() { return y + 1; };\n    x = ${z};\n    std::cout << f() << " " << x << "${NL}";\n}\n`,
          expected: `${x * k + 1} ${z}`,
          wrong: [`${z * k + 1} ${z}`, `${x * k} ${z}`, `${x * k + 1} ${x}`],
          wrongWhy: ["The init-capture is evaluated once, when the lambda is created: later assignments to x do not change it.", "The lambda returns y + 1; the +1 matters.", "x was assigned the new value after the lambda was created, so x holds the new value."],
          explain: 'The init-capture `y = x * k` is evaluated once, when the lambda is created, so later changes to x do not affect y.',
        };
      }
      const n = R.int(1, 9);
      return {
        kind: 'output',
        code: `${inc('iostream')}int main() {\n    auto next = [n = ${n}]() mutable { return n++; };\n    int a = next();\n    int b = next();\n    int c = next();\n    std::cout << a << " " << b << " " << c << "${NL}";\n}\n`,
        expected: `${n} ${n + 1} ${n + 2}`,
        wrong: [`${n + 1} ${n + 2} ${n + 3}`, `${n} ${n} ${n}`, `${n + 2} ${n + 1} ${n}`],
        wrongWhy: ["n++ returns the old value, so the first call returns the initial n.", "The mutable lambda's captured n persists between calls: it keeps incrementing.", "The calls happen in order, so the values increase; they do not count down."],
        explain: 'The closure owns n; being `mutable` it can modify it, and the state persists between calls. n++ returns the old value.',
      };
    },
  },
  {
    id: 'make-unique-parens', topic: 'make_unique argument forwarding', minStd: '14',
    build(R) {
      const n = R.int(3, 7), v = R.int(1, 9);
      return {
        kind: 'output',
        code: `${inc('iostream', 'memory', 'vector')}int main() {\n    auto p = std::make_unique<std::vector<int>>(${n}, ${v});\n    std::cout << p->size() << " " << (*p)[0] << "${NL}";\n}\n`,
        expected: `${n} ${v}`,
        wrong: [`2 ${n}`, `${n} ${n}`, `2 ${v}`],
        wrongWhy: ["make_unique forwards with parentheses: vector(count, value). Braces would build the two-element list {n, v}.", "The elements all equal the fill value; the count is not the first element.", "make_unique(n, v) builds n elements, so size() is n, not 2."],
        explain: 'make_unique forwards its arguments with parentheses, so this is vector(count, value) — not the initializer-list {n, v}.',
      };
    },
  },
  {
    id: 'auto-return-compile', topic: 'Return type deduction', minStd: '11', kind: 'compile',
    build(R, S) {
      const f = R.pick(['pick', 'choose', 'get', 'value', 'select']);
      const a = R.int(1, 9), b2 = R.int(10, 40);
      const call = `int main() { ${f}(true); }`;
      // ok14: compiles from C++14 on; always: compiles in every standard >= C++11.
      const cases = [
        { ok14: true, code: `auto ${f}(int x) {\n    return x * ${a + 1};\n}\n\nint main() { ${f}(3); }\n`, why: 'C++14 deduces the return type from the return statement.' },
        { ok14: true, code: `auto ${f}(bool b) {\n    if (b) return ${a};\n    return ${b2};\n}\n\n${call}\n`, why: 'Every return statement deduces int, so the deduced return type is consistent.' },
        { ok14: false, code: `auto ${f}(bool b) {\n    if (b) return ${a};\n    return ${b2}.0;\n}\n\n${call}\n`, why: 'All return statements of a function with a deduced return type must deduce the same type; int vs double is inconsistent.' },
        { ok14: false, code: `auto ${f}(bool b) {\n    if (b) return ${a};\n    return ${b2}u;\n}\n\n${call}\n`, why: 'int and unsigned int are different deduced types, so the return statements are inconsistent.' },
        { ok14: false, code: `auto ${f}(bool b) {\n    if (b) return ${a};\n    return ${b2}L;\n}\n\n${call}\n`, why: 'int and long are different deduced types, so the return statements are inconsistent.' },
        { ok14: false, code: `auto ${f}(bool b) {\n    if (b) return '${R.pick(['a', 'x', 'z'])}';\n    return ${b2};\n}\n\n${call}\n`, why: 'char and int are different deduced types, so the return statements are inconsistent.' },
        { ok14: false, code: `auto ${f}(bool b) {\n    if (b) return true;\n    return ${b2};\n}\n\n${call}\n`, why: 'bool and int are different deduced types: no implicit conversion is applied between return statements.' },
        { ok14: false, code: `auto ${f}(bool b) {\n    if (b) return ${a};\n    return nullptr;\n}\n\n${call}\n`, why: 'int and std::nullptr_t are different deduced types, so the return statements are inconsistent.' },
        { ok14: false, code: `static int g = ${a};\n\nauto ${f}(bool b) {\n    if (b) return &g;\n    return static_cast<const int*>(&g);\n}\n\n${call}\n`, why: 'int* and const int* are different deduced types, so the return statements are inconsistent.' },
        { ok14: true, code: `auto ${f}(bool b) {\n    const int c = ${a};\n    int d = ${b2};\n    if (b) return c;\n    return d;\n}\n\n${call}\n`, why: 'auto deduction drops top-level const, so both returns deduce plain int and are consistent.' },
        { ok14: true, code: `auto ${f}(bool b) {\n    if (b) return "${R.pick(['yes', 'on', 'ok'])}";\n    return "${R.pick(['no!', 'off', 'nope'])}";\n}\n\n${call}\n`, why: 'String literals decay during auto deduction, so both return statements deduce const char* even though the array lengths differ.' },
        { ok14: true, code: `auto ${f}(int n) {\n    if (n <= 1) return ${a};\n    return n * ${f}(n - 1);\n}\n\nint main() { ${f}(4); }\n`, why: 'The first return statement already deduced int, so the recursive call afterwards has a known type.' },
        { ok14: false, code: `auto ${f}(int n) {\n    if (n > 1) return n * ${f}(n - 1);\n    return ${a};\n}\n\nint main() { ${f}(4); }\n`, why: 'The recursive call appears before any return statement has deduced the return type, so the function is used before its type is deduced.' },
        { always: true, code: `auto ${f}(bool b) -> int {\n    if (b) return ${a};\n    return ${b2}.5;\n}\n\n${call}\n`, why: 'A trailing return type is explicit (C++11): the double is simply converted to int, so no deduction takes place.' },
      ];
      const c = R.pick(cases);
      const ok = c.always ? S.ge('11') : S.ge('14') && c.ok14;
      return {
        kind: 'compile', code: c.code,
        expected: ok ? 'ok' : 'error',
        errorRe: S.ge('14') && !c.always && !c.ok14 ? /inconsistent|deduc/i : null,
        explain: c.always ? c.why : (!S.ge('14') ? 'Plain `auto` as a function return type (without a trailing return type) is a C++14 feature.' : c.why),
      };
    },
  },
  {
    id: 'tuple-get-type', topic: 'std::get<T> on tuples', minStd: '11', kind: 'compile',
    build(R, S) {
      const dup = R.chance(0.4);
      const types = dup ? ['int', 'double', 'int'] : R.sample(['int', 'double', 'char', 'long'], 3);
      const vals = { int: '1', double: '2.5', char: "'c'", long: '3L' };
      const want = dup ? 'int' : R.pick(types);
      return {
        kind: 'compile',
        code: `${inc('tuple')}int main() {\n    std::tuple<${types.join(', ')}> t(${types.map((t) => vals[t]).join(', ')});\n    auto x = std::get<${want}>(t);\n    (void)x;\n}\n`,
        expected: S.ge('14') && !dup ? 'ok' : 'error',
        errorRe: null,
        explain: !S.ge('14') ? 'Accessing a tuple element by type, std::get<T>(t), was added in C++14 (before that only std::get<index> existed).' : (dup ? 'std::get<T> requires T to occur exactly once in the tuple; int appears twice here, so it does not compile.' : 'std::get<T> works because the requested type occurs exactly once in the tuple.'),
      };
    },
  },
];
