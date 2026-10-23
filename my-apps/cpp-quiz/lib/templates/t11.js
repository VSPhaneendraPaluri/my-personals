const { inc, NL } = require('./common');

module.exports = [
  {
    id: 'lambda-capture', topic: 'Lambda captures', minStd: '11',
    build(R) {
      const X = R.int(1, 9);
      const seq = R.shuffle(['v', 'r', R.pick(['v', 'r']), R.pick(['v', 'r'])]);
      let cx = X, x = X; const res = [];
      const lines = seq.map((s, i) => {
        res.push(s === 'v' ? ++cx : ++x);
        return `    int r${i + 1} = ${s === 'v' ? 'byVal' : 'byRef'}();`;
      });
      return {
        kind: 'output',
        code: `${inc('iostream')}int main() {\n    int x = ${X};\n    auto byVal = [x]() mutable { return ++x; };\n    auto byRef = [&x]() { return ++x; };\n${lines.join('\n')}\n    std::cout << r1 << " " << r2 << " " << r3 << " " << r4 << " | " << x << "${NL}";\n}\n`,
        expected: `${res.join(' ')} | ${x}`,
        wrong: [`${res.join(' ')} | ${X}`, `${res.map((v) => v + 1).join(' ')} | ${x}`],
        explain: 'The by-value lambda owns a private copy of x (taken when the lambda is created) and a `mutable` lambda may modify it; the by-reference lambda changes the real x.',
      };
    },
  },
  {
    id: 'range-for-ref', topic: 'Range-based for', minStd: '11',
    build(R) {
      const v = R.ints(4, 1, 9), k = R.int(2, 4), byRef = R.chance(0.5);
      const f = byRef ? k : 1;
      return {
        kind: 'output',
        code: `${inc('iostream', 'vector')}int main() {\n    std::vector<int> v = {${v.join(', ')}};\n    for (auto${byRef ? '&' : ''} e : v) e *= ${k};\n    int sum = 0;\n    for (int e : v) sum += e;\n    std::cout << sum << " " << v[0] << "${NL}";\n}\n`,
        expected: `${v.reduce((a, b) => a + b, 0) * f} ${v[0] * f}`,
        wrong: [`${v.reduce((a, b) => a + b, 0) * (byRef ? 1 : k)} ${v[0] * (byRef ? 1 : k)}`, `${v.reduce((a, b) => a + b, 0) * f} ${v[0]}`],
        explain: byRef ? '`auto&` binds to each element, so the multiplication changes the vector.' : '`auto` copies each element, so the loop modifies temporary copies and the vector is untouched.',
      };
    },
  },
  {
    id: 'unique-ptr-move', topic: 'std::unique_ptr & move', minStd: '11',
    build(R) {
      const v = R.int(10, 99), n = R.int(2, 3);
      const names = ['a', 'b', 'c'].slice(0, n);
      const lines = [`    std::unique_ptr<int> a(new int(${v}));`];
      for (let i = 1; i < n; i++) lines.push(`    std::unique_ptr<int> ${names[i]} = std::move(${names[i - 1]});`);
      const state = names.map((_, i) => (i === n - 1 ? 'full' : 'empty'));
      const last = names[n - 1];
      return {
        kind: 'output',
        code: `${inc('iostream', 'memory')}int main() {\n${lines.join('\n')}\n    std::cout ${names.map((x) => `<< (${x} ? "full" : "empty") << " "`).join(' ')} << *${last} << "${NL}";\n}\n`,
        expected: `${state.join(' ')} ${v}`,
        wrong: [`${state.map(() => 'full').join(' ')} ${v}`, `${[...state].reverse().join(' ')} ${v}`],
        explain: 'Moving a unique_ptr transfers ownership and leaves the source null; ownership ends up in the last pointer.',
      };
    },
  },
  {
    id: 'enum-class-values', topic: 'Scoped enums', minStd: '11',
    build(R) {
      const A = R.int(1, 9), B = R.int(10, 99);
      return {
        kind: 'output',
        code: `${inc('iostream')}enum class Level : int { Low = ${A}, Mid, High, Max = ${B}, Over };\n\nint main() {\n    std::cout << static_cast<int>(Level::High) << " " << static_cast<int>(Level::Over) << "${NL}";\n}\n`,
        expected: `${A + 2} ${B + 1}`,
        wrong: [`${A + 1} ${B + 1}`, `2 4`, `${A + 2} ${B}`, `${A + 2} ${A + 4}`],
        explain: 'An enumerator without an initialiser is the previous enumerator + 1, restarting from any explicit value.',
      };
    },
  },
  {
    id: 'nullptr-overload', topic: 'nullptr & overload resolution', minStd: '11',
    build(R) {
      const hasNull = R.chance(0.5);
      const args = R.shuffle([['nullptr', hasNull ? 'null' : 'ptr'], ['0', 'int'], [R.pick(['7', "'a'"]), 'int']]);
      return {
        kind: 'output',
        code: `${inc('iostream', 'cstddef')}void f(int) { std::cout << "int "; }\nvoid f(const char*) { std::cout << "ptr "; }\n${hasNull ? 'void f(std::nullptr_t) { std::cout << "null "; }\n' : ''}\nint main() {\n${args.map((a) => `    f(${a[0]});`).join('\n')}\n    std::cout << "${NL}";\n}\n`,
        expected: args.map((a) => a[1]).join(' '),
        wrong: [args.map((a) => (a[0] === 'nullptr' ? 'int' : a[1])).join(' '), args.map((a) => (a[1] === 'int' ? 'ptr' : a[1])).join(' ')],
        explain: 'nullptr has type std::nullptr_t: it picks f(std::nullptr_t) if present, otherwise it converts to a pointer, never to int. The literal 0 and other integers prefer the exact f(int).',
      };
    },
  },
  {
    id: 'constexpr-calc', topic: 'constexpr functions', minStd: '11',
    build(R) {
      const n = R.int(3, 8), m = R.int(6, 14);
      const fact = (k) => (k <= 1 ? 1 : k * fact(k - 1));
      const fib = (k) => (k < 2 ? k : fib(k - 1) + fib(k - 2));
      return {
        kind: 'output',
        code: `${inc('iostream')}constexpr int fact(int n) { return n <= 1 ? 1 : n * fact(n - 1); }\nconstexpr int fib(int n) { return n < 2 ? n : fib(n - 1) + fib(n - 2); }\n\nint main() {\n    constexpr int a = fact(${n});\n    constexpr int b = fib(${m});\n    std::cout << a << " " << b << "${NL}";\n}\n`,
        expected: `${fact(n)} ${fib(m)}`,
        wrong: [`${fact(n - 1)} ${fib(m)}`, `${fact(n)} ${fib(m - 1)}`, `${fact(n + 1)} ${fib(m + 1)}`],
        explain: 'Both calls are evaluated at compile time. fib(0)=0, fib(1)=1, fib(n)=fib(n-1)+fib(n-2).',
      };
    },
  },
  {
    id: 'shared-ptr-count', topic: 'std::shared_ptr use_count', minStd: '11',
    build(R) {
      const k = R.int(1, 3), weak = R.chance(0.5);
      const copies = Array.from({ length: k }, (_, i) => `        auto c${i} = a;`).join('\n');
      return {
        kind: 'output',
        code: `${inc('iostream', 'memory')}int main() {\n    auto a = std::make_shared<int>(42);\n    std::cout << a.use_count() << " ";\n    {\n${copies}\n${weak ? '        std::weak_ptr<int> w = a;\n' : ''}        std::cout << a.use_count() << " ";\n    }\n    std::cout << a.use_count() << "${NL}";\n}\n`,
        expected: `1 ${1 + k} 1`,
        wrong: [`1 ${k} 1`, `1 ${2 + k} 1`, `1 ${1 + k} ${1 + k}`, `${k} ${1 + k} 1`],
        explain: 'Each shared_ptr copy bumps the strong count; a weak_ptr does not. Copies made in the inner block are destroyed at its end.',
      };
    },
  },
  {
    id: 'sort-lambda', topic: 'std::sort with a lambda', minStd: '11',
    build(R) {
      const mode = R.int(0, 2);
      let v, cmp, sorted;
      if (mode === 0) {
        v = R.distinct(5, 1, 60); cmp = 'a > b'; sorted = [...v].sort((a, b) => b - a);
      } else if (mode === 1) {
        const abs = R.distinct(5, 1, 40); v = abs.map((x) => (R.chance(0.5) ? -x : x));
        cmp = 'std::abs(a) < std::abs(b)'; sorted = [...v].sort((a, b) => Math.abs(a) - Math.abs(b));
      } else {
        const digs = R.distinct(5, 0, 9); v = digs.map((d) => R.int(0, 8) * 10 + d);
        cmp = 'a % 10 < b % 10'; sorted = [...v].sort((a, b) => (a % 10) - (b % 10));
      }
      return {
        kind: 'output',
        code: `${inc('algorithm', 'cstdlib', 'iostream', 'vector')}int main() {\n    std::vector<int> v = {${v.join(', ')}};\n    std::sort(v.begin(), v.end(), [](int a, int b) { return ${cmp}; });\n    for (int x : v) std::cout << x << " ";\n    std::cout << "${NL}";\n}\n`,
        expected: sorted.join(' '),
        wrong: [[...sorted].reverse().join(' '), [...v].sort((a, b) => a - b).join(' '), v.join(' ')],
        explain: 'The comparator defines the ordering: elements for which comp(a, b) is true come first.',
      };
    },
  },
  {
    id: 'sizeof-types', topic: 'Fundamental type sizes', minStd: '11',
    build(R) {
      const T = [['char16_t', 2], ['char32_t', 4], ['wchar_t', 4], ['long long', 8], ['std::nullptr_t', 8], ['bool', 1], ['long double', 16], ['short', 2]];
      const picks = R.sample(T, 3);
      return {
        kind: 'output',
        code: `${inc('cstddef', 'iostream')}int main() {\n    std::cout ${picks.map((p) => `<< sizeof(${p[0]})`).join(' << " " ')} << "${NL}";\n}\n`,
        expected: picks.map((p) => p[1]).join(' '),
        wrong: [picks.map((p) => p[1] * 2).join(' '), picks.map((p) => Math.max(1, p[1] / 2)).join(' '), [...picks].reverse().map((p) => p[1]).join(' ')],
        explain: 'Sizes on the x86-64 Linux ABI used by Compiler Explorer: char16_t 2, char32_t 4, wchar_t 4, long long 8, nullptr_t 8, bool 1, long double 16, short 2.',
      };
    },
  },
  {
    id: 'copy-vs-move', topic: 'Copy vs move construction', minStd: '11',
    build(R) {
      const ops = Array.from({ length: 3 }, () => R.pick(['copy', 'move']));
      const lines = ops.map((o, i) => `    T t${i + 1} = ${o === 'copy' ? 'a' : 'std::move(a)'};`);
      return {
        kind: 'output',
        code: `${inc('iostream', 'utility')}struct T {\n    T() { std::cout << "ctor "; }\n    T(const T&) { std::cout << "copy "; }\n    T(T&&) { std::cout << "move "; }\n};\n\nint main() {\n    T a;\n${lines.join('\n')}\n    std::cout << "${NL}";\n}\n`,
        expected: ['ctor', ...ops].join(' '),
        wrong: [['ctor', ...ops.map((o) => (o === 'copy' ? 'move' : 'copy'))].join(' '), ['ctor', ...ops.map(() => 'copy')].join(' '), ops.join(' ')],
        explain: 'Initialising from an lvalue selects the copy constructor; from std::move(x) (an rvalue) selects the move constructor.',
      };
    },
  },
  {
    id: 'brace-init-trap', topic: 'Initializer-list constructors', minStd: '11',
    build(R) {
      const n = R.int(3, 7), v = R.int(1, 9);
      return {
        kind: 'output',
        code: `${inc('iostream', 'vector')}int main() {\n    std::vector<int> a(${n}, ${v});\n    std::vector<int> b{${n}, ${v}};\n    std::cout << a.size() << " " << a[0] << " " << b.size() << " " << b[0] << "${NL}";\n}\n`,
        expected: `${n} ${v} 2 ${n}`,
        wrong: [`${n} ${v} ${n} ${v}`, `2 ${n} ${n} ${v}`, `${n} ${v} 2 ${v}`],
        explain: 'Parentheses call vector(count, value). Braces prefer the std::initializer_list constructor, producing the two elements {n, v}.',
      };
    },
  },
  {
    id: 'delegating-ctor', topic: 'Delegating constructors & NSDMI', minStd: '11',
    build(R) {
      const A = R.int(1, 9), B = R.int(10, 50), X = R.int(2, 9);
      return {
        kind: 'output',
        code: `${inc('iostream')}struct P {\n    int a = ${A};\n    int b;\n    P() : b(${B}) { a += 1; }\n    explicit P(int x) : P() { a += x; }\n};\n\nint main() {\n    P p(${X});\n    std::cout << p.a << " " << p.b << "${NL}";\n}\n`,
        expected: `${A + 1 + X} ${B}`,
        wrong: [`${A + X} ${B}`, `${A + 1} ${B}`, `${A + 1 + X} 0`],
        explain: 'The delegated-to constructor runs completely first (default member initialiser, then its body), then the delegating constructor\'s body runs.',
      };
    },
  },
  {
    id: 'static-assert-constexpr-loop', topic: 'constexpr: what C++11 allows', minStd: '11', kind: 'compile',
    build(R, S) {
      const n = R.int(3, 6), k = R.int(1, 3);
      let s = 0; for (let i = 1; i <= n; i++) s += i * k;
      const guessOk = R.chance(0.5);
      const guess = guessOk ? s : s + R.pick([-1, 1, 2]);
      const loop = R.chance(0.6);
      const fn = loop
        ? `constexpr int f(int n) {\n    int s = 0;\n    for (int i = 1; i <= n; ++i) s += i * ${k};\n    return s;\n}`
        : `constexpr int f(int n) { return n == 0 ? 0 : n * ${k} + f(n - 1); }`;
      const okLang = loop ? S.ge('14') : S.ge('11');
      return {
        kind: 'compile',
        code: `${fn}\n\nstatic_assert(f(${n}) == ${guess}, "unexpected value");\n\nint main() {}\n`,
        expected: okLang && guessOk ? 'ok' : 'error',
        errorRe: okLang && !guessOk ? /static assertion|unexpected value|static_assert/i : null,
        explain: !okLang ? 'In C++11 a constexpr function body may only contain a single return statement: loops and local variables arrived with C++14 (relaxed constexpr).' : (guessOk ? 'f is evaluated at compile time and the value matches, so static_assert passes.' : `f(${n}) evaluates to ${s}, not ${guess}, so the static_assert fails at compile time.`),
      };
    },
  },
];
