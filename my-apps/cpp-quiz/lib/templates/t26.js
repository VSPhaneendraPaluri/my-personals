const { inc, NL } = require('./common');

module.exports = [
  {
    id: 'pack-indexing', topic: 'Pack indexing', minStd: '26', gcc: 15,
    build(R) {
      if (R.chance(0.5)) {
        const vals = R.ints(R.int(3, 5), 10, 99), i = R.int(0, vals.length - 1);
        return {
          kind: 'output',
          code: `${inc('iostream')}template <typename... Ts>\nauto pick(Ts... ts) {\n    return ts...[${i}];\n}\n\nint main() {\n    std::cout << pick(${vals.join(', ')}) << "${NL}";\n}\n`,
          expected: `${vals[i]}`,
          wrong: [`${vals[Math.min(i + 1, vals.length - 1)] === vals[i] ? vals[0] : vals[Math.min(i + 1, vals.length - 1)]}`, `${vals[i > 0 ? i - 1 : vals.length - 1]}`, `${vals.length}`],
          explain: 'C++26 pack indexing: `ts...[N]` selects the N-th (0-based) element of a pack.',
        };
      }
      const T = [['char', 1], ['short', 2], ['int', 4], ['double', 8], ['long long', 8], ['float', 4]];
      const picks = R.sample(T, R.int(3, 4)), i = R.int(0, picks.length - 1);
      return {
        kind: 'output',
        code: `${inc('cstddef', 'iostream')}template <typename... Ts>\nconstexpr std::size_t size_of_nth() {\n    return sizeof(Ts...[${i}]);\n}\n\nint main() {\n    std::cout << size_of_nth<${picks.map((p) => p[0]).join(', ')}>() << "${NL}";\n}\n`,
        expected: `${picks[i][1]}`,
        wrong: [`${picks.reduce((a, p) => a + p[1], 0)}`, `${picks[(i + 1) % picks.length][1] === picks[i][1] ? picks[i][1] * 2 : picks[(i + 1) % picks.length][1]}`, `${i}`],
        explain: 'Pack indexing also works on type packs: `Ts...[N]` names the N-th type (0-based), here queried with sizeof.',
      };
    },
  },
  {
    id: 'saturating-arith', topic: 'Saturation arithmetic', minStd: '26', gcc: 14,
    build(R) {
      const signed = R.chance(0.5);
      const [lo, hi, t] = signed ? [-128, 127, 'std::int8_t'] : [0, 255, 'std::uint8_t'];
      const clamp = (v) => Math.min(hi, Math.max(lo, v));
      const pool = [
        () => { const a = signed ? R.int(60, 120) : R.int(180, 250), b = R.int(30, 100); return [`std::add_sat<${t}>(${a}, ${b})`, clamp(a + b)]; },
        () => { const a = signed ? R.int(-120, -50) : R.int(0, 60), b = R.int(40, 100); return [`std::sub_sat<${t}>(${a}, ${b})`, clamp(a - b)]; },
        () => { const a = signed ? R.int(10, 30) : R.int(10, 40), b = R.int(5, 12); return [`std::mul_sat<${t}>(${a}, ${b})`, clamp(a * b)]; },
      ];
      const picks = R.sample(pool, 2).map((f) => f());
      return {
        kind: 'output',
        code: `${inc('cstdint', 'iostream', 'numeric')}int main() {\n    std::cout ${picks.map((p) => `<< static_cast<int>(${p[0]})`).join(' << " " ')} << "${NL}";\n}\n`,
        expected: picks.map((p) => p[1]).join(' '),
        wrong: [picks.map((p) => p[1] - 1).join(' '), picks.map((p) => ((p[1] % 256) + 256) % 256 === p[1] ? p[1] + 1 : p[1] + 2).join(' ')],
        explain: `add_sat / sub_sat / mul_sat clamp to the range of ${t} (${lo}..${hi}) instead of wrapping or overflowing.`,
      };
    },
  },
  {
    id: 'underscore-placeholder', topic: 'Placeholder _ declarations', minStd: '11', gcc: 14, kind: 'compile',
    build(R, S) {
      const use = R.chance(0.4);
      const code = use
        ? `int main() {\n    int _ = 1;\n    int _ = 2;\n    return _;\n}\n`
        : R.pick([
          `int make() { return 7; }\n\nint main() {\n    int _ = make();\n    int _ = make();\n    return 0;\n}\n`,
          `#include <utility>\n\nint main() {\n    auto [_, a] = std::pair{1, 2};\n    auto [_, b] = std::pair{3, 4};\n    return a + b == 6 ? 0 : 1;\n}\n`,
        ]);
      return {
        kind: 'compile', code,
        expected: S.ge('26') && !use ? 'ok' : 'error',
        errorRe: S.ge('26') && use ? /ambiguous/i : null,
        explain: !S.ge('26') ? 'Before C++26 `_` is an ordinary identifier, so declaring it twice in one scope is a redefinition error.' : (use ? 'Since C++26 several `_` declarations may coexist in one scope, but they are unnamed placeholders: *using* `_` afterwards is ambiguous.' : 'C++26 placeholder variables: `_` may be declared repeatedly in the same scope as long as it is never used.'),
      };
    },
  },
];
