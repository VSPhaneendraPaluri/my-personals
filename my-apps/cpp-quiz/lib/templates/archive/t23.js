const { inc, NL, fmtItem } = require('./common');

module.exports = [
  {
    id: 'println-format', topic: 'std::println', minStd: '23', gcc: 14,
    build(R) {
      if (R.chance(0.5)) {
        const items = Array.from({ length: 3 }, () => fmtItem(R));
        return {
          kind: 'output',
          code: `${inc('print')}int main() {\n    std::println("${items.map((i) => i.spec).join('|')}", ${items.map((i) => i.arg).join(', ')});\n}\n`,
          expected: items.map((i) => i.out).join('|'),
          wrong: [items.map((i) => i.out.trim()).join('|') === items.map((i) => i.out).join('|') ? items.map((i) => i.out + '.').join('|') : items.map((i) => i.out.trim()).join('|'), items.map((i) => i.out.toUpperCase()).join('|')],
          keepWhitespace: true,
          explain: 'std::println formats like std::format and appends a newline. Spec recap: < > ^ align (extra space goes to the right when centring), 0 zero-pads, x/X/b select the base (# adds the prefix), .Nf is fixed precision.',
        };
      }
      const a = R.int(1, 9), s = R.pick(['x', 'ok', 'hi']), order = R.shuffle([0, 1, 0, 1]).slice(0, 3);
      const args = [`${a}`, `"${s}"`];
      const vals = [`${a}`, s];
      return {
        kind: 'output',
        code: `${inc('print')}int main() {\n    std::println("${order.map((i) => `{${i}}`).join(' ')}", ${args.join(', ')});\n}\n`,
        expected: order.map((i) => vals[i]).join(' '),
        wrong: [order.map((i) => vals[1 - i]).join(' '), [...order].reverse().map((i) => vals[i]).join(' ') === order.map((i) => vals[i]).join(' ') ? vals.join(' ') : [...order].reverse().map((i) => vals[i]).join(' ')],
        explain: '{0}, {1} are positional replacement fields: they pick the argument by index, in any order and any number of times.',
      };
    },
  },
  {
    id: 'expected-basic', topic: 'std::expected', minStd: '23', gcc: 12,
    build(R) {
      const v = R.int(-5, 9), k = R.int(1, 9), d = R.int(50, 99);
      const ok = v >= 0;
      return {
        kind: 'output',
        code: `${inc('expected', 'iostream', 'string')}std::expected<int, std::string> parse(int x) {\n    if (x < 0) return std::unexpected("negative");\n    return x * 2;\n}\n\nint main() {\n    auto r = parse(${v});\n    auto t = r.transform([](int x) { return x + ${k}; });\n    std::cout << t.value_or(-${d}) << " " << r.has_value() << " ";\n    if (!r) std::cout << r.error();\n    std::cout << "${NL}";\n}\n`,
        expected: ok ? `${v * 2 + k} 1` : `-${d} 0 negative`,
        wrong: ok ? [`${v * 2} 1`, `${v + k} 1`, `-${d} 0`] : [`-${d} 1`, `${k} 0 negative`, `-${d} 0`],
        explain: 'expected<T, E> holds either a value or an error. transform maps the value if present and passes the error through unchanged; value_or supplies the fallback when there is an error.',
      };
    },
  },
  {
    id: 'deducing-this-lambda', topic: 'Explicit object parameter (deducing this)', minStd: '23', gcc: 14,
    build(R) {
      const f = R.pick(['fact', 'fib', 'gcd']);
      let code, exp, what;
      if (f === 'fact') {
        const n = R.int(3, 9); let r = 1; for (let i = 2; i <= n; i++) r *= i;
        code = `auto fact = [](this auto self, int n) -> int {\n        return n <= 1 ? 1 : n * self(n - 1);\n    };\n    std::cout << fact(${n}) << "${NL}";`; exp = r; what = 'factorial';
      } else if (f === 'fib') {
        const n = R.int(5, 13); const fib = (k) => (k < 2 ? k : fib(k - 1) + fib(k - 2));
        code = `auto fib = [](this auto self, int n) -> int {\n        return n < 2 ? n : self(n - 1) + self(n - 2);\n    };\n    std::cout << fib(${n}) << "${NL}";`; exp = fib(n); what = 'Fibonacci';
      } else {
        const g = R.int(2, 7), a = g * R.int(2, 9), b = g * R.int(2, 9); const gcd = (x, y) => (y ? gcd(y, x % y) : x);
        code = `auto gcd = [](this auto self, int a, int b) -> int {\n        return b == 0 ? a : self(b, a % b);\n    };\n    std::cout << gcd(${a}, ${b}) << "${NL}";`; exp = gcd(a, b); what = 'greatest common divisor';
      }
      return {
        kind: 'output',
        code: `${inc('iostream')}int main() {\n    ${code}\n}\n`,
        expected: `${exp}`,
        wrong: [`${exp + 1}`, `${Math.max(1, exp - 1)}`, `${exp * 2}`],
        explain: `\`this auto self\` gives the lambda access to itself, so it can recurse without std::function. This computes the ${what}.`,
      };
    },
  },
  {
    id: 'ranges-to-and-views', topic: 'C++23 range adaptors', minStd: '23', gcc: 13,
    build(R, S, ctx) {
      const variant = R.pick(ctx.gcc >= 14 ? ['to', 'chunk', 'stride', 'zip', 'fold'] : ['chunk', 'stride', 'zip', 'fold']);
      if (variant === 'to') {
        const lo = R.int(1, 4), hi = lo + R.int(5, 9), k = R.int(2, 5);
        const arr = []; for (let x = lo; x < hi; x++) arr.push(x * k);
        return {
          kind: 'output',
          code: `${inc('iostream', 'ranges', 'vector')}int main() {\n    auto v = std::views::iota(${lo}, ${hi})\n           | std::views::transform([](int x) { return x * ${k}; })\n           | std::ranges::to<std::vector>();\n    std::cout << v.size() << " " << v.front() << " " << v.back() << "${NL}";\n}\n`,
          expected: `${arr.length} ${arr[0]} ${arr[arr.length - 1]}`,
          wrong: [`${arr.length} ${arr[0]} ${arr[arr.length - 2]}`, `${arr.length + 1} ${arr[0]} ${arr[arr.length - 1]}`, `${arr.length} ${lo} ${hi - 1}`],
          explain: 'iota(lo, hi) is half-open, so it has hi-lo elements; std::ranges::to<std::vector>() materialises the lazy view into a real vector.',
        };
      }
      if (variant === 'chunk') {
        const n = R.int(7, 14), k = R.int(2, 5);
        const sizes = []; for (let i = 0; i < n; i += k) sizes.push(Math.min(k, n - i));
        return {
          kind: 'output',
          code: `${inc('iostream', 'numeric', 'ranges', 'vector')}int main() {\n    std::vector<int> v(${n});\n    std::iota(v.begin(), v.end(), 1);\n    for (auto c : v | std::views::chunk(${k}))\n        std::cout << std::ranges::distance(c) << " ";\n    std::cout << "${NL}";\n}\n`,
          expected: sizes.join(' '),
          wrong: [sizes.slice(0, -1).join(' '), [...sizes].reverse().join(' ') === sizes.join(' ') ? sizes.concat([1]).join(' ') : [...sizes].reverse().join(' '), sizes.map(() => k).join(' ')],
          explain: 'views::chunk(k) splits a range into consecutive pieces of k elements; the last piece holds the remainder.',
        };
      }
      if (variant === 'stride') {
        const n = R.int(8, 14), k = R.int(2, 4);
        const out = []; for (let i = 1; i <= n; i += k) out.push(i);
        return {
          kind: 'output',
          code: `${inc('iostream', 'numeric', 'ranges', 'vector')}int main() {\n    std::vector<int> v(${n});\n    std::iota(v.begin(), v.end(), 1);\n    for (int x : v | std::views::stride(${k})) std::cout << x << " ";\n    std::cout << "${NL}";\n}\n`,
          expected: out.join(' '),
          wrong: [out.map((x) => x + 1).join(' '), out.slice(1).join(' '), out.map((x) => x - 1 || 1).join(' ')],
          explain: 'views::stride(k) takes the first element and then every k-th element after it.',
        };
      }
      if (variant === 'zip') {
        const a = R.ints(R.int(3, 5), 1, 9), b = R.ints(R.int(3, 5), 1, 9);
        const m = Math.min(a.length, b.length); let s = 0; for (let i = 0; i < m; i++) s += a[i] * b[i];
        return {
          kind: 'output',
          code: `${inc('iostream', 'ranges', 'vector')}int main() {\n    std::vector<int> a = {${a.join(', ')}};\n    std::vector<int> b = {${b.join(', ')}};\n    int sum = 0;\n    for (auto [x, y] : std::views::zip(a, b)) sum += x * y;\n    std::cout << sum << "${NL}";\n}\n`,
          expected: `${s}`,
          wrong: [`${s + 1}`, `${a.reduce((p, c) => p + c, 0) * b.reduce((p, c) => p + c, 0)}`, `${a.reduce((p, c) => p + c, 0) + b.reduce((p, c) => p + c, 0)}`],
          explain: 'views::zip pairs up elements and stops at the shorter range. The sum is a dot product over the common length.',
        };
      }
      const v = R.ints(R.int(3, 5), 1, 9), init = R.int(20, 60);
      const r = v.reduce((a, b) => a - b, init);
      return {
        kind: 'output',
        code: `${inc('functional', 'iostream', 'algorithm', 'vector')}int main() {\n    std::vector<int> v = {${v.join(', ')}};\n    std::cout << std::ranges::fold_left(v, ${init}, std::minus<>{}) << "${NL}";\n}\n`,
        expected: `${r}`,
        wrong: [`${v.reduceRight((a, b) => b - a, init)}`, `${init + v.reduce((a, b) => a + b, 0)}`, `${r + 1}`],
        explain: 'fold_left folds from the left: ((init - v0) - v1) - v2 …',
      };
    },
  },
  {
    id: 'if-consteval', topic: 'Compile-time vs run-time evaluation', minStd: '20',
    build(R, S) {
      const useIfConsteval = S.ge('23') && R.chance(0.6);
      const [cv, rv] = R.shuffle([1, 2, 3, 4]).slice(0, 2);
      const body = useIfConsteval
        ? `    if consteval { return ${cv}; } else { return ${rv}; }`
        : `    if (std::is_constant_evaluated()) return ${cv};\n    return ${rv};`;
      return {
        kind: 'output',
        code: `${inc('iostream', ...(useIfConsteval ? [] : ['type_traits']))}constexpr int where() {\n${body}\n}\n\nint main() {\n    constexpr int a = where();\n    int b = where();\n    std::cout << a << " " << b << "${NL}";\n}\n`,
        expected: `${cv} ${rv}`,
        wrong: [`${rv} ${cv}`, `${cv} ${cv}`, `${rv} ${rv}`],
        explain: 'Initialising a constexpr variable forces compile-time evaluation (the "constant-evaluated" branch). A call that initialises an ordinary non-constexpr variable is evaluated as normal run-time code.',
      };
    },
  },
  {
    id: 'multidim-subscript', topic: 'Multidimensional operator[]', minStd: '23', gcc: 12,
    build(R) {
      const cols = R.int(3, 9), off = R.int(0, 5);
      const [r1, c1, r2, c2] = [R.int(0, 4), R.int(0, 2), R.int(0, 4), R.int(0, 2)];
      const f = (r, c) => r * cols + c + off;
      return {
        kind: 'output',
        code: `${inc('iostream')}struct Grid {\n    int cols = ${cols};\n    int operator[](int r, int c) const { return r * cols + c + ${off}; }\n};\n\nint main() {\n    Grid g;\n    std::cout << g[${r1}, ${c1}] << " " << g[${r2}, ${c2}] << "${NL}";\n}\n`,
        expected: `${f(r1, c1)} ${f(r2, c2)}`,
        wrong: [`${f(c1, r1)} ${f(c2, r2)}`, `${f(r1, c1) - off} ${f(r2, c2) - off}`, `${f(r1, c1) + 1} ${f(r2, c2) + 1}`],
        explain: 'C++23 allows operator[] with several parameters, so g[r, c] calls operator[](r, c) instead of using the comma operator.',
      };
    },
  },
  {
    id: 'to-underlying', topic: 'std::to_underlying & enum flags', minStd: '23', gcc: 11,
    build(R) {
      const flags = R.sample([['A', 1], ['B', 2], ['C', 4], ['D', 8], ['E', 16]], 3);
      const ops = [R.pick(['|', '^']), R.pick(['|', '&', '^'])];
      const ap = (op, x, y) => (op === '|' ? x | y : op === '&' ? x & y : x ^ y);
      const first = flags[0][1] | flags[1][1];
      const val = ap(ops[1], ap(ops[0], flags[0][1], flags[1][1]), flags[2][1]);
      void first;
      return {
        kind: 'output',
        code: `${inc('iostream', 'utility')}enum class Flag : unsigned char { A = 1, B = 2, C = 4, D = 8, E = 16 };\n\nconstexpr Flag operator|(Flag x, Flag y) { return Flag(std::to_underlying(x) | std::to_underlying(y)); }\nconstexpr Flag operator&(Flag x, Flag y) { return Flag(std::to_underlying(x) & std::to_underlying(y)); }\nconstexpr Flag operator^(Flag x, Flag y) { return Flag(std::to_underlying(x) ^ std::to_underlying(y)); }\n\nint main() {\n    Flag f = (Flag::${flags[0][0]} ${ops[0]} Flag::${flags[1][0]}) ${ops[1]} Flag::${flags[2][0]};\n    std::cout << static_cast<int>(std::to_underlying(f)) << "${NL}";\n}\n`,
        expected: `${val}`,
        wrong: [`${val + 1}`, `${flags[0][1] + flags[1][1] + flags[2][1]}`, `${val ^ 1}`, `${val === 0 ? 3 : 0}`],
        explain: 'std::to_underlying converts a scoped enum to its underlying integer so we can combine the bits; the result is then converted back to the enum.',
      };
    },
  },
  {
    id: 'algorithms-23', topic: 'C++23 range algorithms', minStd: '23', gcc: 14,
    build(R) {
      const v = R.ints(6, 1, 9), x = R.int(1, 9), k = R.int(1, 3);
      const pre = R.chance(0.5) ? v.slice(0, k) : R.ints(k, 1, 9);
      const suf = R.chance(0.5) ? v.slice(v.length - k) : R.ints(k, 1, 9);
      const eq = (a, b) => a.length === b.length && a.every((e, i) => e === b[i]);
      return {
        kind: 'output',
        code: `${inc('algorithm', 'iostream', 'vector')}int main() {\n    std::vector<int> v = {${v.join(', ')}};\n    std::vector<int> pre = {${pre.join(', ')}};\n    std::vector<int> suf = {${suf.join(', ')}};\n    std::cout << std::boolalpha\n              << std::ranges::contains(v, ${x}) << " "\n              << std::ranges::starts_with(v, pre) << " "\n              << std::ranges::ends_with(v, suf) << "${NL}";\n}\n`,
        expected: `${v.includes(x)} ${eq(v.slice(0, pre.length), pre)} ${eq(v.slice(v.length - suf.length), suf)}`,
        wrong: [`${!v.includes(x)} ${eq(v.slice(0, pre.length), pre)} ${eq(v.slice(v.length - suf.length), suf)}`, `${v.includes(x)} ${!eq(v.slice(0, pre.length), pre)} ${eq(v.slice(v.length - suf.length), suf)}`, `${v.includes(x)} ${eq(v.slice(0, pre.length), pre)} ${!eq(v.slice(v.length - suf.length), suf)}`],
        explain: 'ranges::contains, starts_with and ends_with were added in C++23. starts_with/ends_with compare the leading/trailing elements against another range.',
      };
    },
  },
];
