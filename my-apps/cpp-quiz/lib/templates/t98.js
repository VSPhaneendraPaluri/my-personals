const { inc, NL, pad } = require('./common');

const TYPES = [['char', 1], ['short', 2], ['int', 4], ['double', 8]];

module.exports = [
  {
    id: 'int-div-mod', topic: 'Integer arithmetic', minStd: '98',
    build(R) {
      const a = R.int(7, 45) * (R.chance(0.6) ? -1 : 1);
      const b = R.int(2, 7) * (R.chance(0.2) ? -1 : 1);
      const q = Math.trunc(a / b), r = a % b;
      return {
        kind: 'output',
        code: `${inc('iostream')}int main() {\n    int a = ${a};\n    int b = ${b};\n    std::cout << a / b << " " << a % b << "${NL}";\n}\n`,
        expected: `${q} ${r}`,
        wrong: [`${Math.floor(a / b)} ${((a % b) + b) % b}`, `${Math.floor(a / b)} ${r}`, `${q} ${Math.abs(r)}`],
        explain: 'Integer division truncates toward zero (guaranteed since C++11), and the remainder takes the sign of the dividend, so (a / b) * b + a % b == a.',
      };
    },
  },
  {
    id: 'incr-semantics', topic: 'Increment / decrement', minStd: '98',
    build(R) {
      let x = R.int(2, 9);
      const x0 = x;
      const all = [
        ['p', 'x++', () => x++],
        ['q', '++x', () => ++x],
        ['r', 'x--', () => x--],
        ['s', '--x', () => --x],
      ];
      const picks = R.sample(all, 3);
      const lines = [], vals = [], names = [];
      for (const [n, e, f] of picks) { lines.push(`    int ${n} = ${e};`); vals.push(f()); names.push(n); }
      return {
        kind: 'output',
        code: `${inc('iostream')}int main() {\n    int x = ${x0};\n${lines.join('\n')}\n    std::cout << ${names.join(' << " " << ')} << " " << x << "${NL}";\n}\n`,
        expected: `${vals.join(' ')} ${x}`,
        wrong: [`${vals.map((v) => v + 1).join(' ')} ${x}`, `${vals.join(' ')} ${x + 1}`],
        explain: 'Post-increment/decrement yields the old value, pre-increment/decrement yields the new value. Both modify x.',
      };
    },
  },
  {
    id: 'sizeof-array', topic: 'Arrays & sizeof', minStd: '98',
    build(R) {
      if (R.chance(0.5)) {
        const [t, sz] = R.pick(TYPES), n = R.int(3, 9);
        return {
          kind: 'output',
          code: `${inc('iostream')}int main() {\n    ${t} arr[${n}];\n    std::cout << sizeof(arr) / sizeof(arr[0]) << " " << sizeof(arr) << "${NL}";\n}\n`,
          expected: `${n} ${n * sz}`,
          wrong: [`${n * sz} ${n}`, `${sz} ${n * sz}`, `${n} ${n * 8 === n * sz ? n * 4 : n * 8}`],
          explain: `sizeof(arr) is the whole array (${n} x ${sz} bytes on x86-64); dividing by sizeof(arr[0]) gives the element count.`,
        };
      }
      const n = R.int(3, 9);
      return {
        kind: 'output',
        code: `${inc('iostream')}void f(int a[${n}]) {\n    std::cout << sizeof(a) << " ";\n}\n\nint main() {\n    int arr[${n}] = {0};\n    f(arr);\n    std::cout << sizeof(arr) << "${NL}";\n}\n`,
        expected: `8 ${n * 4}`,
        wrong: [`${n * 4} ${n * 4}`, `4 ${n * 4}`, `8 8`],
        explain: 'An array parameter decays to a pointer, so sizeof(a) is the pointer size (8 on x86-64) no matter what size is written in the parameter.',
      };
    },
  },
  {
    id: 'precedence', topic: 'Operator precedence', minStd: '98',
    build(R) {
      const form = R.int(0, 3);
      let expr, val, why;
      if (form === 0) {
        const [a, b, c, d] = R.ints(4, 2, 9); const e = R.int(2, 4);
        expr = `${a} + ${b} * ${c} - ${d} / ${e}`; val = a + b * c - Math.trunc(d / e);
        why = '* and / bind tighter than + and -, and integer division truncates.';
      } else if (form === 1) {
        const a = R.int(1, 5), b = R.int(0, 3), c = R.int(0, 3);
        expr = `${a} << ${b} + ${c}`; val = a * 2 ** (b + c);
        why = '+ has higher precedence than <<, so this is a << (b + c).';
      } else if (form === 2) {
        const a = R.int(20, 60), b = R.int(3, 9), c = R.int(2, 6);
        expr = `${a} % ${b} * ${c}`; val = (a % b) * c;
        why = '% and * have equal precedence and associate left to right: (a % b) * c.';
      } else {
        const x = R.int(0, 1), y = R.int(0, 1), z = R.int(0, 1);
        expr = `${x} || ${y} && ${z}`; val = x || (y && z) ? 1 : 0;
        why = '&& binds tighter than ||, so this is x || (y && z).';
      }
      return {
        kind: 'output',
        code: `${inc('iostream')}int main() {\n    int r = ${expr};\n    std::cout << r << "${NL}";\n}\n`,
        expected: `${val}`,
        wrong: [`${val + 1}`, `${val - 1}`, `${val * 2}`, `${val + 3}`],
        explain: why,
      };
    },
  },
  {
    id: 'uchar-wrap', topic: 'Integer conversions', minStd: '98',
    build(R) {
      const x = R.int(200, 250), y = R.int(10, 90);
      const v = (x + y) % 256;
      return {
        kind: 'output',
        code: `${inc('iostream')}int main() {\n    unsigned char c = ${x};\n    c += ${y};\n    std::cout << (int)c << "${NL}";\n}\n`,
        expected: `${v}`,
        wrong: [`${x + y}`, `${(x + y) % 255}`, `${v + 1}`],
        explain: 'unsigned arithmetic wraps modulo 2^N; for unsigned char that is modulo 256.',
      };
    },
  },
  {
    id: 'ctor-dtor-order', topic: 'Construction & destruction order', minStd: '98',
    build(R) {
      const [base, m1, m2, der] = R.sample(['Engine', 'Wheel', 'Frame', 'Seat', 'Bell', 'Lamp', 'Chain', 'Brake', 'Pedal', 'Gear'], 4);
      const cls = (n) => `struct ${n} {\n    ${n}() { std::cout << "${n} "; }\n    ~${n}() { std::cout << "~${n} "; }\n};\n`;
      const decl = R.shuffle([m1, m2]);
      const init = R.shuffle([m1, m2]);
      const mem = (t) => t.toLowerCase();
      const code = `${inc('iostream')}${cls(base)}${cls(m1)}${cls(m2)}
struct ${der} : ${base} {
    ${decl.map((t) => `${t} ${mem(t)};`).join('\n    ')}
    ${der}() : ${init.map((t) => `${mem(t)}()`).join(', ')} { std::cout << "${der} "; }
    ~${der}() { std::cout << "~${der} "; }
};

int main() {
    { ${der} d; }
    std::cout << "${NL}";
}
`;
      const ok = [base, decl[0], decl[1], der, '~' + der, '~' + decl[1], '~' + decl[0], '~' + base];
      const bad1 = [base, init[0], init[1], der, '~' + der, '~' + init[1], '~' + init[0], '~' + base];
      const bad2 = [base, decl[0], decl[1], der, '~' + der, '~' + decl[0], '~' + decl[1], '~' + base];
      const bad3 = [decl[0], decl[1], base, der, '~' + der, '~' + base, '~' + decl[1], '~' + decl[0]];
      return {
        kind: 'output', code, expected: ok.join(' '),
        wrong: [bad1, bad2, bad3].map((a) => a.join(' ')),
        explain: 'Base classes are constructed first, then members in declaration order (not mem-initializer-list order), then the constructor body runs. Destruction happens in exactly the reverse order.',
      };
    },
  },
  {
    id: 'virtual-dispatch', topic: 'Virtual functions', minStd: '98',
    build(R) {
      const virt = { f: R.chance(0.5), g: R.chance(0.5), h: R.chance(0.5) };
      const m = (n) => `    ${virt[n] ? 'virtual ' : ''}void ${n}() { std::cout << "Base::${n} "; }`;
      const d = (n) => `    void ${n}() { std::cout << "Derived::${n} "; }`;
      const code = `${inc('iostream')}struct Base {
${m('f')}
${m('g')}
${m('h')}
    virtual ~Base() {}
};

struct Derived : Base {
${d('f')}
${d('g')}
${d('h')}
};

int main() {
    Derived d;
    Base* p = &d;
    p->f();
    p->g();
    p->h();
    std::cout << "${NL}";
}
`;
      const exp = ['f', 'g', 'h'].map((n) => (virt[n] ? 'Derived::' : 'Base::') + n).join(' ');
      const allD = ['f', 'g', 'h'].map((n) => 'Derived::' + n).join(' ');
      const allB = ['f', 'g', 'h'].map((n) => 'Base::' + n).join(' ');
      const inv = ['f', 'g', 'h'].map((n) => (virt[n] ? 'Base::' : 'Derived::') + n).join(' ');
      return {
        kind: 'output', code, expected: exp, wrong: [allD, allB, inv],
        explain: 'Only functions declared virtual in Base are dispatched dynamically through the Base*; non-virtual calls are resolved from the static type (Base).',
      };
    },
  },
  {
    id: 'pass-by', topic: 'Value, reference and pointer parameters', minStd: '98',
    build(R) {
      const fns = R.shuffle([
        ['byValue', 'int x', 'x += %K;', (v) => v],
        ['byRef', 'int& x', 'x += %K;', (v, k) => v + k],
        ['byPtr', 'int* x', '*x += %K;', (v, k) => v + k],
      ]);
      let v = R.int(1, 9); const v0 = v;
      const ks = {};
      let defs = '', calls = '';
      for (const [n, params, body, f] of fns) {
        const k = R.int(2, 20); ks[n] = k;
        defs += `void ${n}(${params}) { ${body.replace('%K', k)} }\n`;
        calls += `    ${n}(${n === 'byPtr' ? '&v' : 'v'});\n`;
        v = f(v, k);
      }
      return {
        kind: 'output',
        code: `${inc('iostream')}${defs}\nint main() {\n    int v = ${v0};\n${calls}    std::cout << v << "${NL}";\n}\n`,
        expected: `${v}`,
        wrong: [`${v0 + Object.values(ks).reduce((a, b) => a + b, 0)}`, `${v + 1}`, `${v0}`],
        explain: 'byValue changes only its own copy; byRef and byPtr modify the caller\'s variable.',
      };
    },
  },
  {
    id: 'switch-fallthrough', topic: 'switch fall-through', minStd: '98',
    build(R) {
      const incs = R.sample([1, 2, 4, 8, 16, 32, 64], 5);
      const items = [1, 2, 3, 4].map((c, i) => ({ label: `case ${c}:`, c, inc: incs[i], brk: R.chance(0.4) }));
      items.splice(R.int(0, 4), 0, { label: 'default:', c: null, inc: incs[4], brk: false });
      const n = R.pick([1, 2, 3, 4, 7]);
      let start = items.findIndex((it) => it.c === n);
      if (start < 0) start = items.findIndex((it) => it.c === null);
      let r = 0;
      for (let i = start; i < items.length; i++) { r += items[i].inc; if (items[i].brk) break; }
      const body = items.map((it) => `        ${it.label} r += ${it.inc};${it.brk ? ' break;' : ''}`).join('\n');
      let allBreak = 0; allBreak = items[start].inc;
      return {
        kind: 'output',
        code: `${inc('iostream')}int main() {\n    int n = ${n};\n    int r = 0;\n    switch (n) {\n${body}\n    }\n    std::cout << r << "${NL}";\n}\n`,
        expected: `${r}`,
        wrong: [`${allBreak}`, `${r + 1}`, `${items.reduce((a, it) => a + it.inc, 0)}`],
        explain: 'Execution jumps to the matching label (or default) and keeps falling through every following label until a break.',
      };
    },
  },
  {
    id: 'string-ops', topic: 'std::string', minStd: '98',
    build(R) {
      const w = R.pick(['compiler', 'template', 'iterator', 'function', 'variable', 'operator', 'standard']);
      const i = R.int(1, 3), l = R.int(2, 4), c = R.pick(w.slice(1).split(''));
      return {
        kind: 'output',
        code: `${inc('iostream', 'string')}int main() {\n    std::string s = "${w}";\n    std::cout << s.substr(${i}, ${l}) << " " << s.find('${c}') << " " << s.size() << "${NL}";\n}\n`,
        expected: `${w.substr(i, l)} ${w.indexOf(c)} ${w.length}`,
        wrong: [`${w.substr(i - 1, l)} ${w.indexOf(c)} ${w.length}`, `${w.substr(i, l)} ${w.lastIndexOf(c)} ${w.length}`, `${w.substr(i, l)} ${w.indexOf(c) + 1} ${w.length}`, `${w.substr(i, l)} ${w.indexOf(c)} ${w.length + 1}`],
        explain: 'substr(pos, len) starts at index pos (0-based); find returns the index of the first match; size() is the number of characters.',
      };
    },
  },
  {
    id: 'static-local', topic: 'Static local variables', minStd: '98',
    build(R) {
      const s = R.int(1, 9), k = R.int(2, 5), pre = R.chance(0.5);
      const first = pre ? s + k + 1 : s + k;
      return {
        kind: 'output',
        code: `${inc('iostream')}int next() {\n    static int n = ${s};\n    return ${pre ? '++n' : 'n++'};\n}\n\nint main() {\n    for (int i = 0; i < ${k}; ++i) next();\n    int a = next();\n    int b = next();\n    std::cout << a << " " << b << "${NL}";\n}\n`,
        expected: `${first} ${first + 1}`,
        wrong: [`${first - 1} ${first}`, `${s + 1} ${s + 2}`, `${first + 1} ${first + 2}`, `${s} ${s}`],
        explain: 'A function-local static is initialised once and keeps its value between calls.',
      };
    },
  },
  {
    id: 'ptr-arith', topic: 'Pointer arithmetic', minStd: '98',
    build(R) {
      const arr = R.ints(6, 10, 99), i = R.int(0, 2), j = R.int(1, 3);
      return {
        kind: 'output',
        code: `${inc('iostream')}int main() {\n    int arr[] = {${arr.join(', ')}};\n    int* p = arr + ${i};\n    int x = *p;\n    p += ${j};\n    int y = *p;\n    std::cout << x << " " << y << " " << (p - arr) << "${NL}";\n}\n`,
        expected: `${arr[i]} ${arr[i + j]} ${i + j}`,
        wrong: [`${arr[i]} ${arr[i + j - 1]} ${i + j}`, `${arr[i]} ${arr[i + j]} ${j}`, `${arr[i + 1]} ${arr[i + j + 1]} ${i + j}`],
        explain: 'Pointer arithmetic moves in units of the element type; subtracting two pointers into the same array gives the element distance.',
      };
    },
  },
  {
    id: 'struct-padding', topic: 'Struct layout & padding', minStd: '98',
    build(R) {
      const members = R.sample(TYPES, 3).concat(R.chance(0.5) ? [R.pick(TYPES)] : []);
      const order = R.shuffle(members);
      const size = (ms) => {
        let off = 0, al = 1;
        for (const [, s] of ms) { off = Math.ceil(off / s) * s + s; al = Math.max(al, s); }
        return Math.ceil(off / al) * al;
      };
      const names = 'abcd';
      const body = order.map(([t], i) => `    ${t} ${names[i]};`).join('\n');
      const best = size([...order].sort((x, y) => y[1] - x[1]));
      const sum = order.reduce((a, [, s]) => a + s, 0);
      return {
        kind: 'output',
        code: `${inc('iostream')}struct S {\n${body}\n};\n\nint main() {\n    std::cout << sizeof(S) << "${NL}";\n}\n`,
        expected: `${size(order)}`,
        wrong: [`${sum}`, `${best === size(order) ? best + 8 : best}`, `${size(order) + 4}`, `${size(order) - 4}`],
        explain: 'Each member is aligned to its own size and the struct is padded to a multiple of its strictest alignment (x86-64 sizes: char 1, short 2, int 4, double 8).',
      };
    },
  },
  {
    id: 'trigraphs', topic: 'Trigraphs (removed in C++17)', minStd: '98',
    build(R, S) {
      const map = { '??=': '#', '??(': '[', '??)': ']', '??!': '|', '??<': '{', '??>': '}', '??-': '~' };
      const keys = R.sample(Object.keys(map), 2);
      const text = `v${keys[0]}1${keys[1]}`;
      const conv = text.replace(/\?\?[=()!<>-]/g, (m) => map[m]);
      return {
        kind: 'output',
        code: `${inc('iostream')}int main() {\n    std::cout << "${text}" << "${NL}";\n}\n`,
        expected: S.ge('17') ? text : conv,
        wrong: [S.ge('17') ? conv : text],
        explain: 'Trigraph sequences such as ??= were replaced by the preprocessor in strict ISO modes up to C++14, and were removed in C++17.',
      };
    },
  },
  {
    id: 'override-compile', topic: 'override & virtual signatures', minStd: '98', kind: 'compile',
    build(R, S) {
      const bad = R.chance(0.55);
      const kind = R.int(0, 1);
      const baseSig = kind ? 'void run(int) const' : 'void run(int)';
      const derSig = bad ? (kind ? 'void run(int)' : 'void run(long)') : baseSig;
      const fixed = `struct Base {\n    virtual ${baseSig} {}\n    virtual ~Base() {}\n};\n\nstruct Derived : Base {\n    ${derSig} override {}\n};\n\nint main() {\n    Derived d;\n    Base& b = d;\n    (void)b;\n}\n`;
      return {
        kind: 'compile', code: fixed,
        expected: S.ge('11') && !bad ? 'ok' : 'error',
        errorRe: S.ge('11') && bad ? /override|virtual/i : null,
        explain: S.ge('11')
          ? (bad ? '`override` makes the compiler check that the function really overrides a base virtual: the parameter list / cv-qualification must match exactly, otherwise it is an error.' : 'The signature matches the base virtual function exactly, so `override` is accepted.')
          : '`override` is a C++11 feature; in C++98 it is just an unknown token here, so the declaration is a syntax error.',
      };
    },
  },
];
