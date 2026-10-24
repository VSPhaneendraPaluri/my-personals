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
        wrongWhy: ["The by-reference lambda modifies the real x, so x is not unchanged at the end.", "Each call returns the incremented value of its own counter (the by-value copy or the real x); recount each one separately."],
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
        wrong: [`${v.reduce((a, b) => a + b, 0) * (byRef ? 1 : k)} ${v[0] * (byRef ? 1 : k)}`, `${v.reduce((a, b) => a + b, 0) * f} ${v[0]}`, `${v[0] * f} ${v.reduce((a, b) => a + b, 0) * f}`, `${v.reduce((a, b) => a + b, 0) + v[0] * (f - 1)} ${v[0] * f}`],
        wrongWhy: ["That result belongs to the other loop form: auto& modifies the vector's elements, plain auto only modifies copies.", "The sum and v[0] must agree: both reflect the same loop form.", "The sum is printed first, then v[0]; the two numbers are swapped.", "The loop body runs for every element, not only the first one, so the whole sum changes (or none of it does)."],
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
        wrongWhy: ["After std::move a unique_ptr is empty (null); only the last pointer owns the object.", "Ownership moves forward along the chain: the first pointers are the empty ones and the last one is full."],
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
        wrongWhy: ["An enumerator without an initializer is the previous one plus 1, and High comes two after Low.", "Implicit values continue from the explicit value, not from 0.", "Over follows Max, so it is Max + 1 (counting restarts after an explicit value).", "After an explicit Max, counting continues from Max, not from the earlier values."],
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
        wrongWhy: ["nullptr is never converted to int: it picks f(std::nullptr_t) if present, otherwise a pointer overload.", "The integer literals are exact matches for f(int); they are not converted to the pointer overload."],
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
        wrongWhy: ["factorial(n) is n * (n-1) * ... * 1; recount the factors.", "Fibonacci: fib(0)=0, fib(1)=1, then each term is the sum of the previous two; recount the index.", "Both values are off by one step: check the argument of each call."],
        explain: 'Both calls are evaluated at compile time. fib(0)=0, fib(1)=1, fib(n)=fib(n-1)+fib(n-2).',
      };
    },
  },
  {
    id: 'shared-ptr-count', topic: 'std::shared_ptr use_count', minStd: '11',
    build(R) {
      const mode = R.int(0, 3);
      const difficulty = [2, 3, 3, 3][mode];
      if (mode === 0) {
        // Nested scopes: copies (and optionally a weak_ptr) come and go with the blocks.
        const k = R.int(1, 3), k2 = R.int(0, 2), weak = R.chance(0.5);
        const copies = (n, p, ind) => Array.from({ length: n }, (_, i) => `${ind}auto ${p}${i} = a;`).join('\n');
        const inner = k2 ? `        {\n${copies(k2, 'd', '            ')}\n            std::cout << a.use_count() << " ";\n        }\n` : '';
        return {
          kind: 'output', difficulty,
          code: `${inc('iostream', 'memory')}int main() {\n    auto a = std::make_shared<int>(42);\n    std::cout << a.use_count() << " ";\n    {\n${copies(k, 'c', '        ')}\n${weak ? '        std::weak_ptr<int> w = a;\n' : ''}        std::cout << a.use_count() << " ";\n${inner}    }\n    std::cout << a.use_count() << "${NL}";\n}\n`,
          expected: `1 ${1 + k} ${k2 ? `${1 + k + k2} ` : ''}1`,
          wrong: [`1 ${k} ${k2 ? `${k + k2} ` : ''}1`, `1 ${2 + k} ${k2 ? `${2 + k + k2} ` : ''}1`, `1 ${1 + k} ${k2 ? `${1 + k + k2} ` : ''}${1 + k}`],
          wrongWhy: ["This forgets the original owner: a itself counts in use_count().", "Too many: a weak_ptr adds no strong reference, so only count the shared_ptr copies.", "The copies are destroyed when their block ends, so the count falls back."],
          explain: 'Each shared_ptr copy bumps the strong count; a weak_ptr does not. Copies made in a block are destroyed at its end, so the count falls back as the scopes close.',
        };
      }
      if (mode === 1) {
        // Aliasing constructor: shares ownership of a, points somewhere else.
        const k = R.int(1, 3), reset = R.chance(0.5);
        const al = Array.from({ length: k }, (_, i) => `    std::shared_ptr<int> b${i}(a, &a->${i % 2 ? 'y' : 'x'});`).join('\n');
        return {
          kind: 'output', difficulty,
          code: `${inc('iostream', 'memory')}struct P { int x = 1; int y = 2; };\n\nint main() {\n    auto a = std::make_shared<P>();\n${al}\n    std::cout << a.use_count() << " " << b0.use_count() << " ";\n${reset ? '    b0.reset();\n    std::cout << a.use_count() << " " << b0.use_count() << "' + NL + '";\n' : '    std::cout << *b0 << "' + NL + '";\n'}}\n`,
          expected: reset ? `${1 + k} ${1 + k} ${k} 0` : `${1 + k} ${1 + k} 1`,
          wrong: reset ? [`${1 + k} ${1 + k} ${k} ${k}`, `${1 + k} ${1 + k} ${1 + k} 0`, `${k} ${k} ${k - 1} 0`] : [`${1 + k} ${1 + k} 2`, `${k} ${k} 1`, `${1 + k} 1 1`],
          wrongWhy: reset ? ["After b0.reset() it is empty: use_count() of an empty shared_ptr is 0.", "Resetting b0 releases its share, so a.use_count() drops by one.", "Count a together with every alias: use_count() includes all owners of the control block."] : ["*b0 refers to P::x, which is 1.", "a itself is an owner too, so the count includes it.", "An alias shares the control block, so b0.use_count() equals a.use_count()."],
          explain: reset ? 'The aliasing constructor shares ownership with a (same control block), so every alias counts toward use_count(). Resetting b0 drops its share and leaves it empty (count 0).' : 'The aliasing constructor shares ownership with a (same control block) while pointing at a member, so each alias raises the shared count. *b0 reads P::x.',
        };
      }
      if (mode === 2) {
        // Random copy / move / reset sequence tracked by a tiny simulation.
        const mk = R.chance(0.5);
        const names = ['a'], group = { a: 0 }; // name -> group id or null (empty)
        const cnt = (g) => (g === null ? 0 : Object.values(group).filter((x) => x === g).length);
        const lines = [];
        const total = R.int(3, 5);
        for (let i = 0; i < total; i++) {
          const src = R.pick(names), nn = 'p' + i, op = R.pick(['copy', 'copy', 'move', 'reset']);
          if (op === 'copy') { lines.push(`    auto ${nn} = ${src};`); group[nn] = group[src]; names.push(nn); }
          else if (op === 'move') { lines.push(`    auto ${nn} = std::move(${src});`); group[nn] = group[src]; group[src] = null; names.push(nn); }
          else { lines.push(`    ${src}.reset();`); group[src] = null; }
        }
        const t = R.pick(names), cur = cnt(group[t]);
        return {
          kind: 'output', difficulty,
          code: `${inc('iostream', 'memory', 'utility')}int main() {\n${mk ? '    auto a = std::make_shared<int>(7);' : '    std::shared_ptr<int> a(new int(7));'}\n${lines.join('\n')}\n    std::cout << ${t}.use_count() << "${NL}";\n}\n`,
          expected: String(cur),
          wrong: [String(cur + 1), String(Math.max(0, cur - 1)), String(cur + 2)],
          wrongWhy: ["One owner too many: a moved-from pointer no longer owns the object.", "One owner too few: a copy adds an owner, a move only transfers ownership, a reset removes one.", "Count the owners of exactly this object: copies add one, moves and resets do not add."],
          explain: 'A copy adds an owner; std::move transfers ownership (the count is unchanged and the source becomes empty, use_count() == 0); reset() releases the pointer\'s share. Count the owners of the object that ' + t + ' refers to.',
        };
      }
      // mode 3: weak_ptr::lock() creates a temporary owner; expired() depends on who is left.
      const k = R.int(0, 2);
      const copies = Array.from({ length: k }, (_, i) => `    auto c${i} = a;\n`).join('');
      return {
        kind: 'output', difficulty,
        code: `${inc('iostream', 'memory')}int main() {\n    auto a = std::make_shared<int>(5);\n${copies}    std::weak_ptr<int> w = a;\n    std::cout << a.use_count() << " " << w.use_count() << " ";\n    {\n        auto l = w.lock();\n        std::cout << a.use_count() << " ";\n    }\n    a.reset();\n    std::cout << w.expired() << " " << w.use_count() << "${NL}";\n}\n`,
        expected: `${1 + k} ${1 + k} ${2 + k} ${k === 0 ? 1 : 0} ${k}`,
        wrong: [`${1 + k} ${2 + k} ${2 + k} ${k === 0 ? 1 : 0} ${k}`, `${1 + k} ${1 + k} ${1 + k} ${k === 0 ? 1 : 0} ${k}`, `${1 + k} ${1 + k} ${2 + k} 1 0`, `${1 + k} ${1 + k} ${2 + k} ${k === 0 ? 0 : 1} ${k}`],
        wrongWhy: ["weak_ptr::use_count() is the number of shared_ptr owners; weak_ptrs are not counted.", "lock() returns a shared_ptr, which is an extra owner while it is alive.", "After a.reset() the object survives only if other copies still own it: use_count() is the number of remaining copies.", "expired() is true only when no owner remains."],
        explain: 'weak_ptr::use_count() reports the number of owning shared_ptrs. lock() creates a temporary owner (+1) that dies at the end of the block. After a.reset() the object lives on only if other copies still own it; expired() is true only when no owners remain.',
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
        wrongWhy: ["The comparator defines the order: comp(a, b) true means a comes first; this is the opposite order.", "This is the default ascending order, not the order the comparator defines.", "std::sort rearranges the vector, so it cannot print unchanged."],
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
        wrongWhy: ["Each size is double the real one on this x86-64 ABI.", "Each size is half the real one on this x86-64 ABI.", "The sizes are printed in the order of the sizeof expressions, not reversed."],
        explain: 'Sizes on the x86-64 Linux ABI used by Compiler Explorer: char16_t 2, char32_t 4, wchar_t 4, long long 8, nullptr_t 8, bool 1, long double 16, short 2.',
      };
    },
  },
  {
    id: 'copy-vs-move', topic: 'Copy vs move construction', minStd: '11',
    build(R) {
      const mode = R.int(0, 5);
      const difficulty = mode >= 4 ? 3 : 2;
      const tidy = (a) => a.join(' ');
      if (mode === 0) {
        // Plain initialisation from lvalue / std::move.
        const ops = Array.from({ length: R.int(2, 4) }, () => R.pick(['copy', 'move']));
        const lines = ops.map((o, i) => `    T t${i + 1} = ${o === 'copy' ? 'a' : 'std::move(a)'};`);
        return {
          kind: 'output', difficulty,
          code: `${inc('iostream', 'utility')}struct T {\n    T() { std::cout << "ctor "; }\n    T(const T&) { std::cout << "copy "; }\n    T(T&&) { std::cout << "move "; }\n};\n\nint main() {\n    T a;\n${lines.join('\n')}\n    std::cout << "${NL}";\n}\n`,
          expected: tidy(['ctor', ...ops]),
          wrong: [tidy(['ctor', ...ops.map((o) => (o === 'copy' ? 'move' : 'copy'))]), tidy(['ctor', ...ops.map(() => 'copy')]), tidy(ops)],
          wrongWhy: ["Initialising from an lvalue copies; only std::move(...) moves, so this sequence is the opposite.", "std::move(a) casts to an rvalue, so those initialisations select the move constructor.", "Do not forget that a itself is default-constructed first."],
          explain: 'Initialising from an lvalue selects the copy constructor; from std::move(x) (an rvalue) selects the move constructor.',
        };
      }
      if (mode === 1) {
        // The class has no move constructor: std::move silently falls back to copy.
        const ops = Array.from({ length: R.int(2, 4) }, () => R.pick(['copy', 'move']));
        const lines = ops.map((o, i) => `    T t${i + 1} = ${o === 'copy' ? 'a' : 'std::move(a)'};`);
        const useDel = R.chance(0.4);
        return {
          kind: 'output', difficulty,
          code: `${inc('iostream', 'utility')}struct T {\n    T() { std::cout << "ctor "; }\n    T(const T&) { std::cout << "copy "; }\n${useDel ? '' : '    ~T() {}\n'}};\n\nint main() {\n    T a;\n${lines.join('\n')}\n    std::cout << "${NL}";\n}\n`,
          expected: tidy(['ctor', ...ops.map(() => 'copy')]),
          wrong: [tidy(['ctor', ...ops]), tidy(['ctor', ...ops.map((o) => (o === 'copy' ? 'move' : 'copy'))]), tidy(['ctor', ...ops.map(() => 'move')])],
          wrongWhy: ["A class with a user-declared copy constructor gets no implicit move constructor, so std::move(a) falls back to copying.", "Nothing is ever moved here: T has no move constructor, and the rvalue binds to the copy constructor.", "T has no move constructor at all, so 'move' can never be printed."],
          explain: 'T declares a copy constructor, so no move constructor is implicitly declared. An rvalue (std::move(a)) can still bind to const T&, so overload resolution picks the copy constructor.',
        };
      }
      if (mode === 2) {
        // Assignment vs construction, with both copy/move assignment operators.
        const n = R.int(2, 4), ops = [];
        const lines = [];
        let fresh = 0;
        for (let i = 0; i < n; i++) {
          const kind = R.pick(['assign-copy', 'assign-move', 'init-copy', 'init-move']);
          if (kind === 'assign-copy') { lines.push('    b = a;'); ops.push('copy='); }
          else if (kind === 'assign-move') { lines.push('    b = std::move(a);'); ops.push('move='); }
          else if (kind === 'init-copy') { lines.push(`    T c${++fresh} = a;`); ops.push('copy'); }
          else { lines.push(`    T c${++fresh} = std::move(a);`); ops.push('move'); }
        }
        const flip = (o) => ({ copy: 'move', move: 'copy', 'copy=': 'move=', 'move=': 'copy=' })[o];
        return {
          kind: 'output', difficulty,
          code: `${inc('iostream', 'utility')}struct T {\n    T() { std::cout << "ctor "; }\n    T(const T&) { std::cout << "copy "; }\n    T(T&&) { std::cout << "move "; }\n    T& operator=(const T&) { std::cout << "copy= "; return *this; }\n    T& operator=(T&&) { std::cout << "move= "; return *this; }\n};\n\nint main() {\n    T a;\n    T b;\n${lines.join('\n')}\n    std::cout << "${NL}";\n}\n`,
          expected: tidy(['ctor', 'ctor', ...ops]),
          wrong: [tidy(['ctor', 'ctor', ...ops.map(flip)]), tidy(['ctor', ...ops]), tidy(['ctor', 'ctor', ...ops.map((o) => o.replace('=', ''))])],
          wrongWhy: ["'T c = x;' is construction; 'b = x;' is assignment; each picks copy or move by whether the source is an lvalue or an rvalue.", "Two objects (a and b) are default-constructed before any of the operations.", "Assignment to an existing object uses the assignment operators (printed with '='), not the constructors."],
          explain: '"T c = x;" is initialisation (copy/move constructor), while "b = x;" on an existing object is assignment (copy/move assignment operator). std::move(a) makes the source an rvalue so the move overload wins.',
        };
      }
      if (mode === 3) {
        // Pass-by-value parameters.
        const ops = Array.from({ length: R.int(2, 4) }, () => R.pick(['copy', 'move']));
        const lines = ops.map((o) => `    take(${o === 'copy' ? 'a' : 'std::move(a)'});`);
        return {
          kind: 'output', difficulty,
          code: `${inc('iostream', 'utility')}struct T {\n    T() { std::cout << "ctor "; }\n    T(const T&) { std::cout << "copy "; }\n    T(T&&) { std::cout << "move "; }\n};\n\nvoid take(T) {}\n\nint main() {\n    T a;\n${lines.join('\n')}\n    std::cout << "${NL}";\n}\n`,
          expected: tidy(['ctor', ...ops]),
          wrong: [tidy(['ctor', ...ops.map((o) => (o === 'copy' ? 'move' : 'copy'))]), tidy(['ctor', ...ops.map(() => 'copy')]), tidy(['ctor', ...ops.map(() => 'move')])],
          wrongWhy: ["Passing an lvalue by value copies it; passing std::move(a) moves it.", "A std::move(a) argument initialises the parameter with the move constructor.", "An lvalue argument is copied into the parameter, so not every call moves."],
          explain: 'A by-value parameter is initialised from the argument: an lvalue argument is copied, an rvalue (std::move(a)) is moved.',
        };
      }
      if (mode === 4) {
        // Implicit special members: a user-declared copy constructor suppresses the implicit move.
        const declared = R.chance(0.5);
        const ops = Array.from({ length: R.int(2, 4) }, () => R.pick(['copy', 'move']));
        const lines = ops.map((o, i) => `    W w${i + 1} = ${o === 'copy' ? 'a' : 'std::move(a)'};`);
        const res = (o) => (o === 'move' && declared ? 'copy' : o);
        return {
          kind: 'output', difficulty,
          code: `${inc('iostream', 'utility')}struct Tag {\n    Tag() { std::cout << "ctor "; }\n    Tag(const Tag&) { std::cout << "copy "; }\n    Tag(Tag&&) { std::cout << "move "; }\n};\n\nstruct W {\n    Tag t;\n${declared ? '    W() = default;\n    W(const W&) = default;\n' : ''}};\n\nint main() {\n    W a;\n${lines.join('\n')}\n    std::cout << "${NL}";\n}\n`,
          expected: tidy(['ctor', ...ops.map(res)]),
          wrong: [tidy(['ctor', ...ops.map((o) => (declared ? o : res(o) === 'copy' ? 'move' : 'copy'))]), tidy(['ctor', ...ops.map(() => 'copy')]), tidy(['ctor', ...ops.map(() => 'move')])],
          wrongWhy: ["Whether std::move(a) moves depends on a move constructor being available, which a user-declared copy constructor suppresses.", "Copy constructors are used for lvalue sources; only rvalue sources can move.", "Moving is only possible when the class still has a move constructor (no user-declared copy constructor)."],
          explain: declared ? 'W declares a copy constructor (even "= default"), which suppresses the implicit move constructor. std::move(a) therefore falls back to the copy constructor, copying member t.' : 'W declares no special members, so the implicit copy and move constructors exist and call Tag\'s copy / move constructor member-wise.',
        };
      }
      // mode 5: returning a local by value.
      const style = R.pick(['named', 'moved', 'param']);
      const body = {
        named: { fn: 'T make() {\n    T t;\n    return t;\n}', call: 'T x = make();', out: 'ctor', why: '`return t;` returns a local by name, so the compiler may construct it directly in the caller (NRVO). No copy or move happens.' },
        moved: { fn: 'T make() {\n    T t;\n    return std::move(t);\n}', call: 'T x = make();', out: 'ctor move', why: '`return std::move(t);` is not a plain local name, so the copy/move elision of `return t;` no longer applies: the move constructor is called. It is a well-known pessimisation.' },
        param: { fn: 'T pass(T p) {\n    return p;\n}', call: 'T x = pass(a);', out: 'copy move', why: 'The argument a is copied into the parameter p. Returning the by-value parameter p treats it as an rvalue first, so the move constructor is used (a parameter cannot be elided into the return slot).' },
      }[style];
      return {
        kind: 'output', difficulty,
        code: `${inc('iostream', 'utility')}struct T {\n    T() { std::cout << "ctor "; }\n    T(const T&) { std::cout << "copy "; }\n    T(T&&) { std::cout << "move "; }\n};\n\n${body.fn}\n\nint main() {\n${style === 'param' ? '    T a;\n' : ''}    ${body.call}\n    std::cout << "${NL}";\n}\n`,
        expected: style === 'param' ? 'ctor copy move' : body.out,
        wrong: style === 'named' ? ['ctor move', 'ctor copy', 'ctor copy move'] : style === 'moved' ? ['ctor', 'ctor copy', 'ctor move move'] : ['ctor copy copy', 'ctor copy', 'ctor move move'],
        wrongWhy: style === 'named' ? ["`return t;` allows copy elision (NRVO): the object is built directly in the caller, so no move constructor runs.", "No copy is made: a returned local is at worst moved, and usually elided entirely.", "Only one object is created: elision removes every copy and move."] : style === 'moved' ? ["`return std::move(t);` defeats the elision and calls the move constructor once.", "The returned value is moved, never copied.", "Only one move happens: the result then initialises x directly."] : ["The argument is copied once into the parameter, and the return then MOVES the parameter; it is not copied twice.", "Both steps happen: a copy into the parameter, then a move out on return.", "Returning a by-value parameter moves it (implicit move); it is not copied again."],
        explain: body.why,
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
        wrongWhy: ["Braces prefer the initializer_list constructor, so b has two elements, not n.", "a(n, v) is the (count, value) constructor: a has n elements and a[0] is v.", "b{n, v} holds the two values n and v, so b[0] is n, not v."],
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
        wrongWhy: ["The delegated-to constructor's body (a += 1) also runs.", "The delegating constructor's own body (a += x) runs after the target constructor has finished.", "b is initialised by the target constructor's mem-initializer, so it holds that value, not 0."],
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
