// "Does this compile?" questions driven by a table of language / library features.
// Each entry says which standard introduced it (since) and, optionally, which removed it (until).
const { inc } = require('./common');

const F = (since, name, includes, decl, body, extra = {}) => ({ since, name, includes, decl, body, ...extra });

const FEATURES = [
  // ---- C++11 ----
  F('11', 'nullptr', [], '', '    int* p = nullptr;\n    return p == nullptr ? 0 : 1;'),
  F('11', 'auto type deduction', [], '', '    auto x = 42;\n    return x == 42 ? 0 : 1;'),
  F('11', 'range-based for loop', [], '', '    int a[] = {1, 2, 3};\n    int s = 0;\n    for (int x : a) s += x;\n    return s == 6 ? 0 : 1;'),
  F('11', 'scoped enumerations (enum class)', [], 'enum class Color { Red, Green };', '    Color c = Color::Red;\n    (void)c;\n    return 0;'),
  F('11', 'lambda expressions', [], '', '    int r = [](int x) { return x + 1; }(1);\n    return r == 2 ? 0 : 1;'),
  F('11', 'static_assert', [], '', '    static_assert(sizeof(int) >= 2, "int too small");\n    return 0;'),
  F('11', 'closing >> in nested templates', ['vector'], '', '    std::vector<std::vector<int>> v(2);\n    return v.size() == 2 ? 0 : 1;'),
  F('11', 'long long', [], '', '    long long x = 1LL << 40;\n    return x > 0 ? 0 : 1;'),
  F('11', 'variadic templates', [], 'template <typename... Ts>\nint count(Ts...) { return sizeof...(Ts); }', '    return count(1, 2.0, \'c\') == 3 ? 0 : 1;'),
  F('11', 'raw string literals', [], '', '    const char* s = R"(a\\b)";\n    return s[1] == \'\\\\\' ? 0 : 1;'),
  F('11', 'alias declarations (using X = …)', [], '', '    using Num = int;\n    Num n = 3;\n    return n == 3 ? 0 : 1;'),
  F('11', '= delete', [], 'struct NC {\n    NC() {}\n    NC(const NC&) = delete;\n};', '    NC n;\n    (void)n;\n    return 0;'),
  F('11', 'noexcept', [], 'void f() noexcept {}', '    f();\n    return 0;'),
  F('11', 'user-defined literals', [], 'long long operator""_km(unsigned long long v) { return v * 1000; }', '    return 2_km == 2000 ? 0 : 1;'),
  F('11', 'decltype', [], '', '    int a = 1;\n    decltype(a) b = 2;\n    return b == 2 ? 0 : 1;'),
  F('11', 'final classes', [], 'struct Leaf final {};', '    Leaf l;\n    (void)l;\n    return 0;'),
  F('11', 'std::unique_ptr', ['memory'], '', '    std::unique_ptr<int> p(new int(5));\n    return *p == 5 ? 0 : 1;'),
  F('11', 'std::array', ['array'], '', '    std::array<int, 3> a = {1, 2, 3};\n    return a.size() == 3 ? 0 : 1;'),
  // ---- C++14 ----
  F('14', 'function return type deduction (auto)', [], 'auto twice(int x) { return x * 2; }', '    return twice(2) == 4 ? 0 : 1;'),
  F('14', 'generic lambdas (auto parameters)', [], '', '    auto add = [](auto a, auto b) { return a + b; };\n    return add(1, 2) == 3 ? 0 : 1;'),
  F('14', 'binary literals (0b…)', [], '', '    int x = 0b1010;\n    return x == 10 ? 0 : 1;'),
  F('14', 'digit separators', [], '', "    int x = 1'000'000;\n    return x == 1000000 ? 0 : 1;"),
  F('14', 'variable templates', [], 'template <typename T>\nconstexpr T pi = T(3.14);', '    return pi<int> == 3 ? 0 : 1;'),
  F('14', 'std::make_unique', ['memory'], '', '    auto p = std::make_unique<int>(5);\n    return *p == 5 ? 0 : 1;'),
  F('14', 'std::exchange', ['utility'], '', '    int a = 1;\n    int old = std::exchange(a, 2);\n    return old == 1 ? 0 : 1;'),
  F('14', 'relaxed constexpr (loops in constexpr functions)', [], 'constexpr int sum(int n) {\n    int s = 0;\n    for (int i = 1; i <= n; ++i) s += i;\n    return s;\n}', '    static_assert(sum(4) == 10, "bad");\n    return 0;'),
  F('14', 'lambda init-capture', [], '', '    int x = 2;\n    auto f = [y = x * 2]() { return y; };\n    return f() == 4 ? 0 : 1;'),
  // ---- C++17 ----
  F('17', 'nested namespace definitions (namespace A::B)', [], 'namespace A::B {\nconstexpr int v = 7;\n}', '    return A::B::v == 7 ? 0 : 1;'),
  F('17', 'inline variables', [], 'inline int counter = 3;', '    return counter == 3 ? 0 : 1;'),
  F('17', 'static_assert without a message', [], '', '    static_assert(sizeof(int) >= 2);\n    return 0;'),
  F('17', 'structured bindings', ['utility'], '', '    auto [a, b] = std::make_pair(1, 2);\n    return a + b == 3 ? 0 : 1;'),
  F('17', 'if constexpr', [], 'template <typename T>\nint f(T) {\n    if constexpr (sizeof(T) > 2) return 1;\n    else return 0;\n}', '    return f(1.0) == 1 ? 0 : 1;'),
  F('17', 'fold expressions', [], 'template <typename... Ts>\nauto sum(Ts... ts) { return (ts + ...); }', '    return sum(1, 2, 3) == 6 ? 0 : 1;'),
  F('17', 'constexpr lambdas', [], '', '    constexpr auto sq = [](int x) { return x * x; };\n    static_assert(sq(3) == 9, "bad");\n    return 0;'),
  F('17', 'if with initializer', [], '', '    if (int x = 3; x > 2) return 0;\n    return 1;'),
  F('17', 'std::optional', ['optional'], '', '    std::optional<int> o = 3;\n    return o.value() == 3 ? 0 : 1;'),
  F('17', 'std::string_view', ['string_view'], '', '    std::string_view sv = "abc";\n    return sv.size() == 3 ? 0 : 1;'),
  F('17', 'std::variant', ['variant'], '', '    std::variant<int, double> v = 3;\n    return v.index() == 0 ? 0 : 1;'),
  F('17', 'std::any', ['any'], '', '    std::any a = 3;\n    return std::any_cast<int>(a) == 3 ? 0 : 1;'),
  F('17', 'std::gcd', ['numeric'], '', '    return std::gcd(12, 18) == 6 ? 0 : 1;'),
  F('17', 'std::clamp', ['algorithm'], '', '    return std::clamp(10, 1, 5) == 5 ? 0 : 1;'),
  F('17', 'template <auto N> (auto non-type parameter)', [], 'template <auto N>\nint val() { return N; }', '    return val<3>() == 3 ? 0 : 1;'),
  F('17', 'std::filesystem', ['filesystem'], '', '    std::filesystem::path p("/tmp/x");\n    return p.filename() == "x" ? 0 : 1;'),
  // ---- C++20 ----
  F('20', 'designated initializers', [], 'struct P {\n    int x;\n    int y;\n};', '    P p{.x = 1, .y = 2};\n    return p.y == 2 ? 0 : 1;'),
  F('20', 'template lambdas ([]<typename T>)', [], '', '    auto f = []<typename T>(T x) { return x; };\n    return f(3) == 3 ? 0 : 1;'),
  F('20', 'consteval functions', [], 'consteval int one() { return 1; }', '    return one() == 1 ? 0 : 1;'),
  F('20', 'constinit', [], 'constinit int g = 3;', '    return g == 3 ? 0 : 1;'),
  F('20', 'concepts', [], 'template <typename T>\nconcept Small = sizeof(T) <= 4;', '    static_assert(Small<int>);\n    return 0;'),
  F('20', 'requires clauses', [], 'template <typename T>\n    requires (sizeof(T) <= 8)\nint f(T) { return 1; }', '    return f(1) == 1 ? 0 : 1;'),
  F('20', 'std::span', ['span'], '', '    int a[3] = {1, 2, 3};\n    std::span<int> s(a);\n    return s.size() == 3 ? 0 : 1;'),
  F('20', 'std::popcount', ['bit'], '', '    return std::popcount(7u) == 3 ? 0 : 1;'),
  F('20', 'std::erase_if for containers', ['vector'], '', '    std::vector<int> v{1, 2, 3};\n    std::erase_if(v, [](int x) { return x > 1; });\n    return v.size() == 1 ? 0 : 1;'),
  F('20', 'the three-way comparison operator <=>', ['compare'], '', '    return (1 <=> 2) < 0 ? 0 : 1;'),
  F('20', 'using enum', [], 'enum class E { a, b };', '    using enum E;\n    E e = a;\n    (void)e;\n    return 0;'),
  F('20', 'std::ranges algorithms', ['algorithm', 'vector'], '', '    std::vector<int> v{3, 1, 2};\n    std::ranges::sort(v);\n    return v[0] == 1 ? 0 : 1;'),
  F('20', 'char8_t', [], '', "    char8_t c = u8'x';\n    return c == u8'x' ? 0 : 1;"),
  F('20', 'std::format', ['format'], '', '    return std::format("{}", 5) == "5" ? 0 : 1;', { gcc: 13 }),
  // ---- C++23 ----
  F('23', 'if consteval', [], '', '    int r = 0;\n    if consteval { r = 1; }\n    return r;'),
  F('23', 'std::expected', ['expected'], '', '    std::expected<int, int> e = 5;\n    return e.value() == 5 ? 0 : 1;', { gcc: 12 }),
  F('23', 'std::print / std::println', ['print'], '', '    std::println("hello");\n    return 0;', { gcc: 14 }),
  F('23', 'std::to_underlying', ['utility'], 'enum class E : int { a = 3 };', '    return std::to_underlying(E::a) == 3 ? 0 : 1;'),
  F('23', 'std::unreachable', ['utility'], '', '    if (false) std::unreachable();\n    return 0;'),
  F('23', 'static lambdas / static operator()', [], '', '    auto f = [](int x) static { return x; };\n    return f(1) == 1 ? 0 : 1;', { gcc: 13 }),
  F('23', 'multidimensional operator[]', [], 'struct M {\n    int operator[](int a, int b) const { return a + b; }\n};', '    M m;\n    return m[1, 2] == 3 ? 0 : 1;', { gcc: 12 }),
  F('23', 'std::views::zip', ['ranges', 'vector'], '', '    std::vector<int> a{1, 2}, b{3, 4};\n    int s = 0;\n    for (auto [x, y] : std::views::zip(a, b)) s += x * y;\n    return s == 11 ? 0 : 1;', { gcc: 13 }),
  F('23', 'std::ranges::contains', ['algorithm', 'vector'], '', '    std::vector<int> v{1, 2, 3};\n    return std::ranges::contains(v, 2) ? 0 : 1;', { gcc: 13 }),
  F('23', 'std::flat_map', ['flat_map'], '', '    std::flat_map<int, int> m;\n    m[1] = 2;\n    return m.size() == 1 ? 0 : 1;', { gcc: 15 }),
  // ---- C++26 ----
  F('26', 'std::add_sat (saturation arithmetic)', ['numeric'], '', '    return std::add_sat<unsigned char>(200, 100) == 255 ? 0 : 1;', { gcc: 14 }),
  F('26', 'std::saturate_cast', ['numeric'], '', '    return std::saturate_cast<signed char>(300) == 127 ? 0 : 1;', { gcc: 14 }),
  F('26', 'pack indexing (Ts...[N])', [], 'template <typename... Ts>\nauto second(Ts... ts) { return ts...[1]; }', '    return second(1, 2, 3) == 2 ? 0 : 1;', { gcc: 15 }),
  F('26', 'user-generated static_assert messages', ['string_view'], '', '    static_assert(true, std::string_view("never shown"));\n    return 0;', { gcc: 14 }),
  // ---- Removed features ----
  F('98', 'incrementing a bool (++b)', [], '', '    bool b = false;\n    ++b;\n    return b ? 0 : 1;', { until: '17', removed: 'Incrementing a bool was deprecated in C++98 and removed in C++17.' }),
  F('98', 'dynamic exception specifications (throw(int))', [], 'void f() throw(int) {}', '    f();\n    return 0;', { until: '17', removed: 'Dynamic exception specifications such as throw(int) were deprecated in C++11 and removed in C++17.' }),
  F('98', 'the register storage class', [], '', '    register int x = 3;\n    return x == 3 ? 0 : 1;', { until: '17', removed: 'The `register` storage-class specifier was deprecated in C++11 and removed in C++17.' }),
];

module.exports = [
  {
    id: 'feature-availability', topic: 'Which standard introduced it?', minStd: '98', kind: 'compile', weight: 4,
    build(R, S, ctx) {
      const usable = FEATURES.filter((f) => (f.gcc || 0) <= ctx.gcc);
      // Prefer features whose answer is interesting: those near the chosen standard.
      const near = usable.filter((f) => Math.abs(S.rank - require('../standards').rankOf(f.since)) <= 2 || f.until);
      const f = R.pick(R.chance(0.7) && near.length ? near : usable);
      const { rankOf } = require('../standards');
      const available = S.rank >= rankOf(f.since) && (!f.until || S.rank < rankOf(f.until));
      const includes = ['iostream', ...f.includes].filter((x) => x !== 'iostream' || false);
      const code = `${f.includes.length ? inc(...f.includes) : ''}${f.decl ? f.decl + '\n\n' : ''}int main() {\n${f.body}\n}\n`;
      const sinceLbl = `C++${f.since}`;
      void includes;
      let explain;
      if (f.until) explain = available ? `${f.removed} Under this earlier standard it is still accepted.` : f.removed;
      else explain = available ? `${f.name} is part of ${sinceLbl}, so it is available here.` : `${f.name} was introduced in ${sinceLbl}, so it is not available under this older standard (compiled with -pedantic-errors, so extension fall-backs are rejected too).`;
      return { kind: 'compile', code, expected: available ? 'ok' : 'error', errorRe: null, explain, feature: f.name };
    },
  },
];
