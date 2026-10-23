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
        wrong: [picks.map((p) => (/^\d+$/.test(p[1]) ? String(Number(p[1]) + 1) : p[1] + '0')).join(' ')],
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
          explain: 'The init-capture `y = x * k` is evaluated once, when the lambda is created, so later changes to x do not affect y.',
        };
      }
      const n = R.int(1, 9);
      return {
        kind: 'output',
        code: `${inc('iostream')}int main() {\n    auto next = [n = ${n}]() mutable { return n++; };\n    int a = next();\n    int b = next();\n    int c = next();\n    std::cout << a << " " << b << " " << c << "${NL}";\n}\n`,
        expected: `${n} ${n + 1} ${n + 2}`,
        wrong: [`${n + 1} ${n + 2} ${n + 3}`, `${n} ${n} ${n}`, `${n + 2} ${n + 1} ${n}`],
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
        explain: 'make_unique forwards its arguments with parentheses, so this is vector(count, value) — not the initializer-list {n, v}.',
      };
    },
  },
  {
    id: 'auto-return-compile', topic: 'Return type deduction', minStd: '11', kind: 'compile',
    build(R, S) {
      const bad = R.chance(0.45);
      const code = bad
        ? `auto pick(bool b) {\n    if (b) return 1;\n    return 2.0;\n}\n\nint main() { pick(true); }\n`
        : `auto twice(int x) {\n    return x * ${R.int(2, 9)};\n}\n\nint main() { twice(3); }\n`;
      return {
        kind: 'compile', code,
        expected: S.ge('14') && !bad ? 'ok' : 'error',
        errorRe: S.ge('14') && bad ? /inconsistent|deduc/i : null,
        explain: !S.ge('14') ? 'Plain `auto` as a function return type (without a trailing return type) is a C++14 feature.' : (bad ? 'All return statements of a function with a deduced return type must deduce the same type; int vs double is inconsistent.' : 'C++14 deduces the return type from the return statement.'),
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
