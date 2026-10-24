const { inc, NL, pad } = require('./common');

const TYPES = [['char', 1], ['short', 2], ['int', 4], ['double', 8]];

module.exports = [
  {
    id: 'int-div-mod', topic: 'Integer arithmetic', minStd: '98',
    build(R, S) {
      const neg = S.ge('11');   // rounding of negative operands is implementation-defined before C++11
      const a = R.int(7, 45) * (neg && R.chance(0.6) ? -1 : 1);
      const b = R.int(2, 7) * (neg && R.chance(0.2) ? -1 : 1);
      const q = Math.trunc(a / b), r = a % b;
      return {
        kind: 'output',
        code: `${inc('iostream')}int main() {\n    int a = ${a};\n    int b = ${b};\n    std::cout << a / b << " " << a % b << "${NL}";\n}\n`,
        expected: `${q} ${r}`,
        wrong: [`${Math.floor(a / b)} ${((a % b) + b) % b}`, `${Math.floor(a / b)} ${r}`, `${q} ${Math.abs(r)}`, `${r} ${q}`, `${q + 1} ${r}`, `${q} ${Math.abs(b) - Math.abs(r)}`],
        wrongWhy: ["Integer division truncates toward zero, it does not round down, and the remainder keeps the sign of the dividend (it is not forced positive).", "Division truncates toward zero rather than rounding down, so for a negative quotient the result is not the floor.", "The remainder keeps the sign of the dividend, so it is not made positive: (a / b) * b + a % b == a must hold.", "The two values are swapped: a / b is printed first (the quotient), then a % b (the remainder).", "The quotient is a / b with the fraction discarded; it is not rounded up.", "a % b is the remainder itself, not the distance from the remainder to the divisor."],
        explain: neg ? 'Integer division truncates toward zero (guaranteed since C++11), and the remainder takes the sign of the dividend, so (a / b) * b + a % b == a.' : 'Integer division discards the fraction and a % b is the remainder, so (a / b) * b + a % b == a. (Negative operands are implementation-defined before C++11, so this question only uses positive values.)',
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
        wrongWhy: ["Each captured value is off by one: x++ and x-- capture the old value, ++x and --x the new one.", "x itself is changed exactly once by each of the three statements; recount the increments and decrements for the final x."],
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
          wrongWhy: ["The two numbers are swapped: sizeof(arr) / sizeof(arr[0]) is the element count, and sizeof(arr) the total size in bytes.", "sizeof(arr) / sizeof(arr[0]) divides the total size by the element size, which gives the element count, not the size of one element.", "sizeof(arr) is the element size times the number of elements; it is not a pointer size."],
          explain: `sizeof(arr) is the whole array (${n} x ${sz} bytes on x86-64); dividing by sizeof(arr[0]) gives the element count.`,
        };
      }
      const n = R.int(3, 9);
      return {
        kind: 'output',
        code: `${inc('iostream')}void f(int a[${n}]) {\n    std::cout << sizeof(a) << " ";\n}\n\nint main() {\n    int arr[${n}] = {0};\n    f(arr);\n    std::cout << sizeof(arr) << "${NL}";\n}\n`,
        expected: `8 ${n * 4}`,
        wrong: [`${n * 4} ${n * 4}`, `4 ${n * 4}`, `8 8`],
        wrongWhy: ["A function parameter declared as an array is adjusted to a pointer, so sizeof(a) inside f is the pointer size, not the array size.", "sizeof(a) inside f is the size of a pointer (int*), not of one int.", "In main, arr is a real array, so sizeof(arr) is the whole array size and not a pointer size."],
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
        wrongWhy: ["Close, but off by one: apply the precedence rules and integer truncation step by step.", "Close, but off by one in the other direction: apply the precedence rules and integer truncation step by step.", "This groups the operands differently from the C++ grammar: check which operator binds tighter.", "Re-evaluate using each operator's precedence and the associativity of operators of equal precedence."],
        explain: why,
      };
    },
  },
  {
    id: 'uchar-wrap', topic: 'Integer conversions', minStd: '98',
    build(R) {
      const x = R.int(200, 250), y = R.int(Math.max(10, 256 - x), 90); // the sum always exceeds 255, so it really wraps
      const v = (x + y) % 256;
      return {
        kind: 'output',
        code: `${inc('iostream')}int main() {\n    unsigned char c = ${x};\n    c += ${y};\n    std::cout << (int)c << "${NL}";\n}\n`,
        expected: `${v}`,
        wrong: [`${x + y}`, `${(x + y) % 255}`, '255', `${v + 1}`],
        wrongWhy: ["An unsigned char cannot hold the sum: the result wraps around modulo 256 instead of growing past 255.", "Wrap-around for an 8-bit unsigned type is modulo 256 (2^8), not modulo 255.", "Unsigned arithmetic wraps around; it does not saturate (clamp) at the maximum value.", "Off by one: reduce the sum modulo 256 exactly."],
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
        wrongWhy: ["Members are constructed in declaration order, not in the order of the mem-initializer list.", "Destruction runs in exactly the reverse order of construction, so members are destroyed in reverse declaration order.", "Base classes are constructed before members and destroyed after them."],
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
        wrongWhy: ["Only functions declared virtual in Base are dispatched dynamically; non-virtual ones are resolved from the static type Base*.", "Virtual functions called through a Base* reach the Derived override, so not all calls run Base's version.", "The result is inverted: virtual calls go to Derived, non-virtual calls stay with Base."],
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
        wrongWhy: ["A by-value parameter changes only a copy, so not every function's increment reaches the caller's variable.", "Off by one: add exactly the increments of the by-reference and by-pointer functions.", "References and pointers do modify the caller's variable, so v does change."],
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
        wrongWhy: ["Without a break, execution continues into the following labels, so more than the matching label's statement runs.", "Add the statements from the matching label up to and including the first break, nothing more.", "Execution starts at the matching label, not at the first one, and a break stops the fall-through."],
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
        wrongWhy: ["substr(pos, len) starts at index pos (0-based), not at pos - 1.", "find returns the FIRST match; rfind would return the last one.", "Indices are 0-based: find returns the index itself, not index + 1.", "size() is the number of characters; it does not count a terminator."],
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
        wrongWhy: ["Off by one: post-increment returns the old value, pre-increment the new value; check which one this function uses.", "The static is initialised only once and keeps its value between calls, so the earlier calls have already advanced it.", "Off by one in the other direction: count the calls made before the two printed ones.", "A function-local static is NOT re-initialised on every call; it keeps counting."],
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
        wrongWhy: ["p += j moves j elements forward, so *p is arr[i + j], not the element before it.", "Subtracting two pointers gives the distance in elements from arr (i + j), not just j.", "x was read from arr + i before the pointer moved, so it is arr[i], not the next element."],
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
        wrongWhy: ["sizeof(S) is not the sum of the member sizes: padding is inserted to align each member.", "Members are laid out in declaration order, so a reordered (smaller) layout does not apply.", "Padding is the minimum needed to align every member and the end of the struct; recompute the offsets.", "Recompute: each member starts at a multiple of its own alignment, and the total is rounded up to the strictest alignment."],
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
      const right = S.ge('17') ? text : conv;
      const cands = [
        [S.ge('17') ? conv : text, S.ge('17') ? 'Trigraphs were removed in C++17, so the sequences are NOT replaced: the characters are printed as written.' : 'Before C++17 the preprocessor replaces trigraphs, so the converted characters are printed.'],
        [text.replace(keys[0], map[keys[0]]), 'The preprocessor treats every trigraph the same way: either all of them are replaced or none of them are.'],
        [text.replace(keys[1], map[keys[1]]), 'The preprocessor treats every trigraph the same way: either all of them are replaced or none of them are.'],
      ].filter(([w]) => w !== right);
      return {
        kind: 'output',
        code: `${inc('iostream')}int main() {\n    std::cout << "${text}" << "${NL}";\n}\n`,
        expected: right,
        wrong: cands.map((c) => c[0]),
        wrongWhy: cands.map((c) => c[1]),
        explain: 'Trigraph sequences such as ??= were replaced by the preprocessor in strict ISO modes up to C++14, and were removed in C++17.',
      };
    },
  },
  {
    id: 'override-compile', topic: 'override & virtual signatures', minStd: '98', kind: 'compile',
    build(R, S) {
      const fn = R.pick(['run', 'step', 'apply', 'handle', 'process', 'update']);
      const ptys = R.pick([['int', 'long'], ['int', 'unsigned'], ['double', 'float'], ['int', 'short'], ['const char*', 'char*']]);
      const [P, Q] = R.chance(0.5) ? ptys : [ptys[1], ptys[0]];
      const ERR = /override|virtual|conflicting|covariant|looser|final|throw/i;
      // Each case: lines placed in Base / Derived; ok = whether it should compile in C++11+.
      const cases = [
        { ok: true, base: `virtual void ${fn}(${P}) {}`, der: `void ${fn}(${P}) override {}`, why: 'The signature matches the base virtual function exactly, so `override` is accepted.' },
        { ok: true, base: `virtual void ${fn}(${P}) const {}`, der: `void ${fn}(${P}) const override {}`, why: 'The const qualifier matches too, so this really overrides the base function.' },
        { ok: false, base: `virtual void ${fn}(${P}) const {}`, der: `void ${fn}(${P}) override {}`, why: 'The base function is const but the derived one is not. That is a different signature, so there is nothing to override.' },
        { ok: false, base: `virtual void ${fn}(${P}) {}`, der: `void ${fn}(${P}) const override {}`, why: 'Adding const makes a different function: the derived member does not override the non-const base virtual.' },
        { ok: false, base: `virtual void ${fn}(${P}) {}`, der: `void ${fn}(${Q}) override {}`, why: `The parameter type differs (${P} vs ${Q}), so this is a new function, not an override. \`override\` turns that mistake into an error.` },
        { ok: false, base: `virtual void ${fn}(int) {}`, der: `void ${fn}(const int&) override {}`, why: 'A reference parameter is a different type from a by-value one, so the signatures do not match and nothing is overridden.' },
        { ok: false, base: `virtual void ${fn}(${P}) {}`, der: `int ${fn}(${P}) override { return 0; }`, why: 'Same parameters but a different, non-covariant return type: the derived function conflicts with the base virtual function.' },
        { ok: false, base: `void ${fn}(${P}) {}`, der: `void ${fn}(${P}) override {}`, why: 'The base function is not virtual, so there is nothing to override. `override` requires a virtual function in a base class.' },
        { ok: false, base: `virtual void ${fn}(${P}) {}`, der: `void ${fn}x(${P}) override {}`, why: `The derived name is a typo (${fn}x vs ${fn}); no base virtual has that name, so \`override\` is an error.` },
        { ok: false, base: `virtual void ${fn}(${P}) final {}`, der: `void ${fn}(${P}) override {}`, why: 'The base function is declared `final`, so it cannot be overridden any further.' },
        { ok: true, base: `virtual Base* ${fn}() { return this; }`, der: `Derived* ${fn}() override { return this; }`, why: 'A covariant return type (Derived* instead of Base*) is allowed for an override because Derived derives from Base.' },
        { ok: false, base: `virtual Base* ${fn}() { return this; }`, der: `int* ${fn}() override { return nullptr; }`, why: 'int* is not covariant with Base*: an overriding function may only change its return type to a pointer/reference to a derived class.' },
        { ok: true, base: `virtual void ${fn}(${P}) {}`, der: `void ${fn}(${P}) noexcept override {}`, why: 'An override may use a stricter exception specification (noexcept) than the base function.' },
        { ok: false, base: `virtual void ${fn}(${P}) noexcept {}`, der: `void ${fn}(${P}) override {}`, why: 'The base function is noexcept; an override must not allow more exceptions than the function it overrides.' },
        { ok: true, base: `virtual void ${fn}(${P}) {}`, der: `void ${fn}(${P}) override {}\n    ~Derived() override {}`, why: 'Even a destructor can carry `override`; here the base destructor is virtual and the function signature matches.' },
        { ok: true, base: `virtual void ${fn}(${P}) {}`, der: `void ${fn}(${P}) override {}`, priv: true, why: 'Access control is not part of the signature: a private override of a public virtual function is valid (calls through Base& still reach it).' },
      ];
      const c = R.pick(cases);
      const derBody = c.priv ? `private:\n    ${c.der}` : `    ${c.der}`;
      const code = `struct Base {\n    ${c.base}\n    virtual ~Base() {}\n};\n\nstruct Derived : Base {\n${derBody}\n};\n\nint main() {\n    Derived d;\n    Base& b = d;\n    (void)b;\n}\n`;
      return {
        kind: 'compile', code,
        expected: S.ge('11') && c.ok ? 'ok' : 'error',
        errorRe: S.ge('11') && !c.ok ? ERR : null,
        explain: S.ge('11') ? c.why : '`override` is a C++11 feature; in C++98 it is just an unknown token here, so the declaration is a syntax error.',
      };
    },
  },


  // ── exceptions, conversions, linkage/ODR, template specialisation, temporaries (moved from tgaps.js) ─
  {
      id: 'exception-unwind-order', topic: 'Exceptions: stack unwinding & destructor order', minStd: '98',
      build(R) {
        const n = R.int(2, 4);
        const k0 = R.int(0, n - 1);            // 0 = caught in main, otherwise caught inside f<k0>
        const guardLast = R.chance(0.6);
        const fns = [];
        for (let k = n; k >= 1; k--) {
          let body = '';
          if (k < n || guardLast) body += `    G g(${k});\n`;
          if (k === n) body += '    throw 1;\n';
          else if (k === k0) body += `    try {\n        f${k + 1}();\n    } catch (int) {\n        std::cout << "caught ";\n    }\n`;
          else body += `    f${k + 1}();\n`;
          fns.push(`void f${k}() {\n${body}}\n`);
        }
        const main = k0 === 0
          ? '    try {\n        f1();\n    } catch (int) {\n        std::cout << "caught ";\n    }\n'
          : '    f1();\n';
        const alive = (k) => k < n || guardLast;
        const ev = [];
        for (let k = 1; k <= n; k++) if (alive(k)) ev.push(`G${k}`);
        const unwindTo = k0 === 0 ? 1 : k0 + 1;
        for (let k = n; k >= unwindTo; k--) if (alive(k)) ev.push(`~G${k}`);
        ev.push('caught');
        if (k0 > 0) for (let k = k0; k >= 1; k--) if (alive(k)) ev.push(`~G${k}`);
        ev.push('end');
        const noUnwind = ev.filter((e) => !e.startsWith('~'));
        const constructOrder = [];
        for (let k = 1; k <= n; k++) if (alive(k)) constructOrder.push(`G${k}`);
        const ctorOrderDtors = [...constructOrder, ...constructOrder.map((g) => '~' + g), 'caught', 'end'];
        const caughtFirst = ['caught', ...ev.filter((e) => e !== 'caught')];
        return {
          kind: 'output',
          code: `${inc('iostream')}struct G {\n    int id;\n    explicit G(int i) : id(i) { std::cout << "G" << i << " "; }\n    ~G() { std::cout << "~G" << id << " "; }\n};\n\n${fns.join('\n')}\nint main() {\n${main}    std::cout << "end${NL}";\n}\n`,
          expected: ev.join(' '),
          wrong: [caughtFirst.join(' '), ctorOrderDtors.join(' '), noUnwind.join(' ')],
          wrongWhy: [
            'The handler only runs AFTER the stack has been unwound up to it, so the destructors of the frames being left run first.',
            'Local objects are destroyed in the reverse order of construction (innermost frame first), not in construction order.',
            'Unwinding does call destructors of fully constructed locals: that is the whole point of RAII.',
          ],
          explain: 'When the exception is thrown the runtime unwinds the stack frame by frame up to the matching handler, destroying every fully constructed local on the way in reverse order of construction. Only then does the handler run. Frames above (outside) the handler return normally afterwards and destroy their locals as usual.',
        };
      },
    }
,
  // ---------------------------------------------------------------------------
  {
      id: 'exception-catch-matching', topic: 'Exceptions: which catch handler is chosen', minStd: '98',
      build(R) {
        const thrown = R.pick([
          ['D', 'D()'], ['B', 'B()'], ['int', '1'], ['long', '1L'], ['double', '1.5'], ['char', "'c'"], ['cstr', '"text"'], ['string', 'std::string("s")'],
        ]);
        const handlers = [
          ['const B&', (t) => t === 'B' || t === 'D', 'B'], ['D&', (t) => t === 'D', 'D'], ['B', (t) => t === 'B' || t === 'D', 'B-val'],
          ['int', (t) => t === 'int', 'int'], ['long', (t) => t === 'long', 'long'], ['double', (t) => t === 'double', 'double'],
          ['char', (t) => t === 'char', 'char'], ['const char*', (t) => t === 'cstr', 'cstr'], ['const std::string&', (t) => t === 'string', 'string'],
        ];
        // make sure at least one handler can match, to keep the question interesting, but allow fall-through to (...)
        const picks = R.sample(handlers, 3);
        const label = (h) => h[2];
        const chosen = picks.find((h) => h[1](thrown[0]));
        const out = chosen ? label(chosen) : 'catch-all';
        const labels = [...picks.map(label), 'catch-all'];
        const wrongs = labels.filter((l) => l !== out);
        return {
          kind: 'output',
          code: `${inc('iostream', 'string')}struct B {};\nstruct D : B {};\n\nint main() {\n    try {\n        throw ${thrown[1]};\n${picks.map((h) => `    } catch (${h[0]}) {\n        std::cout << "${label(h)}";`).join('\n')}\n    } catch (...) {\n        std::cout << "catch-all";\n    }\n    std::cout << "${NL}";\n}\n`,
          expected: out,
          wrong: wrongs.slice(0, 3),
          wrongWhy: [
            'Handlers are tried in the order written and the first one that matches wins; matching uses the thrown object\'s exact type, a base class of it, or a pointer conversion, never arithmetic conversions.',
            'A handler matches only if the thrown type is the same (ignoring cv/reference) or publicly derives from it. int does not match long or double, and char does not match int.',
            'Not every handler can match; check each against the thrown type in order, and remember catch(...) only runs when nothing before it matched.',
          ],
          explain: `The thrown object has type ${thrown[0] === 'cstr' ? 'const char*' : thrown[0] === 'string' ? 'std::string' : thrown[0]}. Handlers are tried top to bottom; a handler matches when its type is the same, a (public) base class, or a pointer convertible by the limited exception rules. Integral/floating conversions are never applied, so ${thrown[0] === 'int' ? 'an int does not match catch(long) or catch(double)' : 'a mismatched arithmetic type falls through'} and the first real match wins (catch(...) is the last resort).`,
        };
      },
    }
,
  // ---------------------------------------------------------------------------
  {
      id: 'exception-ctor-throw', topic: 'Exceptions thrown from constructors (partial construction)', minStd: '98',
      build(R) {
        const nm = R.int(2, 3), hasBase = R.chance(0.5);
        const where = R.int(0, nm); // 0 = in the body, j = while constructing member j
        const members = Array.from({ length: nm }, (_, i) => `    M m${i + 1};`).join('\n');
        const inits = [...(hasBase ? ['Base()'] : []), ...Array.from({ length: nm }, (_, i) => `m${i + 1}(${i + 1})`)];
        const ev = [];
        const built = [];
        if (hasBase) { ev.push('Base'); built.push('Base'); }
        let thrownInMember = 0;
        for (let j = 1; j <= nm; j++) {
          if (where === j) { thrownInMember = j; break; }
          ev.push(`M${j}`); built.push(`M${j}`);
        }
        if (!thrownInMember) ev.push('body');
        for (const b of [...built].reverse()) ev.push('~' + b);
        ev.push('caught');
        const all = [...(hasBase ? ['Base'] : []), ...Array.from({ length: nm }, (_, i) => `M${i + 1}`)];
        const wrongWithW = [...ev.slice(0, ev.indexOf('caught')), '~W', 'caught'];
        const wrongNoDtors = ev.filter((e) => !e.startsWith('~'));
        const wrongAllBuilt = [...all, 'body', ...[...all].reverse().map((a) => '~' + a), 'caught'];
        return {
          kind: 'output',
          code: `${inc('iostream')}const int THROW_AT = ${where};\n\n${hasBase ? 'struct Base {\n    Base() { std::cout << "Base "; }\n    ~Base() { std::cout << "~Base "; }\n};\n\n' : ''}struct M {\n    int id;\n    explicit M(int i) : id(i) {\n        if (i == THROW_AT) throw 0;\n        std::cout << "M" << i << " ";\n    }\n    ~M() { std::cout << "~M" << id << " "; }\n};\n\nstruct W${hasBase ? ' : Base' : ''} {\n${members}\n    W() : ${inits.join(', ')} {\n        std::cout << "body ";\n        if (THROW_AT == 0) throw 0;\n    }\n    ~W() { std::cout << "~W "; }\n};\n\nint main() {\n    try {\n        W w;\n    } catch (int) {\n        std::cout << "caught";\n    }\n    std::cout << "${NL}";\n}\n`,
          expected: ev.join(' '),
          wrong: [wrongWithW.join(' '), wrongNoDtors.join(' '), wrongAllBuilt.join(' ')],
          wrongWhy: [
            'If a constructor exits by exception the object never finished construction, so its own destructor ~W() is NOT called.',
            'Base classes and members that were already fully constructed ARE destroyed when the constructor throws; only the object itself is skipped.',
            'Construction stops at the point of the throw: members declared after it are never constructed (and never destroyed).',
          ],
          explain: 'Subobjects are constructed in order (base classes, then members in declaration order). If the constructor throws, the already constructed subobjects are destroyed in reverse order, but the object\'s own destructor does not run, and members after the failure point were never constructed. A member whose own constructor throws is not considered constructed either.',
        };
      },
    }
,
  // ---------------------------------------------------------------------------
  {
      id: 'integer-conversion-traps', topic: 'Integer conversions, unsigned wrap-around & promotions', minStd: '98',
      build(R, S) {
        const n = R.int(260, 700), k = R.int(2, 9), d = R.int(2, 9);
        const U32 = 4294967296;
        const items = [
          ['-1 < 1u', '0', 'In a signed/unsigned comparison the signed operand is converted to unsigned, so -1 becomes 4294967295 and is not less than 1.'],
          ['-1 < 1', '1', 'Both operands are signed int, so it is a plain numeric comparison.'],
          [`static_cast<int>(static_cast<unsigned char>(${n}))`, String(n % 256), `Conversion to an unsigned type is modulo 2^N: ${n} mod 256 = ${n % 256}.`],
          [`0u - ${k}`, String(U32 - k), 'Unsigned arithmetic wraps around modulo 2^32.'],
          ['UINT_MAX + 1u', '0', 'Unsigned overflow is well defined and wraps to 0.'],
          [`static_cast<unsigned>(-${k})`, String(U32 - k), `Converting a negative value to unsigned adds 2^32: 2^32 - ${k}.`],
          ['static_cast<unsigned char>(200) + static_cast<unsigned char>(100)', '300', 'Both unsigned chars are promoted to int before the addition, so there is no wrap-around.'],
          ['+static_cast<unsigned char>(200 + 100)', '44', 'The int 300 is converted to unsigned char (mod 256 = 44); unary plus promotes it back to int for printing.'],
          [`INT_MAX / ${d} * ${d}`, String(Math.floor(2147483647 / d) * d), 'Integer division truncates before the multiplication, so the result is at most INT_MAX.'],
          ['static_cast<long long>(INT_MAX) + 1', '2147483648', 'The addition is done in long long, so there is no int overflow.'],
          [`(7 / 2) * 2.0`, '6', '7 / 2 is integer division (3); only then is it multiplied by the double 2.0.'],
          ['sizeof(char) + sizeof(short) > 2 ? 1 : 0', '1', 'sizeof(char) is 1 and sizeof(short) is 2 here, so the sum 3 is greater than 2.'],
        ];
        const usable = items.filter((p) => S.ge('11') || !p[0].includes('long long')); // `long long` is not C++98
        const picks = R.sample(usable, 3);
        const exp = picks.map((p) => p[1]);
        const bump = (s) => (/^\d+$/.test(s) ? String(Number(s) + 1) : s);
        return {
          kind: 'output',
          code: `${inc('climits', 'iostream')}int main() {\n    std::cout << ${picks.map((p) => `(${p[0]})`).join(' << " " << ')} << "${NL}";\n}\n`,
          expected: exp.join(' '),
          wrong: [exp.map((e) => (e === '0' || e === '1' ? flipDigit(e) : bump(e))).join(' '), picks.map((p, i) => (i === 0 ? (exp[0] === '0' || exp[0] === '1' ? flipDigit(exp[0]) : bump(exp[0])) : exp[i])).join(' '), picks.map((p, i) => (i === 2 ? (exp[2] === '0' || exp[2] === '1' ? flipDigit(exp[2]) : bump(exp[2])) : exp[i])).join(' ')],
          wrongWhy: [
            'Every value is off: check which operand is converted (signed to unsigned, or promoted to int) before the operation.',
            'The first expression is the classic trap: think about which type the operands are converted to first.',
            'The last expression is subtly different from what it looks like: apply the usual arithmetic conversions step by step.',
          ],
          explain: picks.map((p) => `${p[0]}: ${p[2]}`).join(' '),
        };
      },
    }
,
  // ---------------------------------------------------------------------------
  {
      id: 'short-circuit-eval', topic: 'Short-circuit evaluation of && and ||', minStd: '98',
      build(R) {
        const vals = { a: R.chance(0.5), b: R.chance(0.5), c: R.chance(0.5) };
        const pats = [
          ['a() && b() || c()', (t) => ev('or', ev('and', 'a', 'b'), 'c')],
          ['a() || b() && c()', (t) => ev('or', 'a', ev('and', 'b', 'c'))],
          ['a() && (b() || c())', (t) => ev('and', 'a', ev('or', 'b', 'c'))],
          ['(a() || b()) && c()', (t) => ev('and', ev('or', 'a', 'b'), 'c')],
          ['a() || b() || c()', (t) => ev('or', 'a', ev('or', 'b', 'c'))],
          ['a() && b() && c()', (t) => ev('and', 'a', ev('and', 'b', 'c'))],
        ];
        const trace = [];
        function ev(op, l, r) { return { op, l, r }; }
        function run(node) {
          if (typeof node === 'string') { trace.push(node); return vals[node]; }
          const lv = run(node.l);
          if (node.op === 'and') return lv ? run(node.r) : false;
          return lv ? true : run(node.r);
        }
        const [src, mk] = R.pick(pats);
        const r = run(mk());
        const exp = [...trace, r ? '1' : '0'];
        const all = ['a', 'b', 'c'];
        return {
          kind: 'output',
          code: `${inc('iostream')}${all.map((f) => `bool ${f}() {\n    std::cout << "${f} ";\n    return ${vals[f]};\n}\n`).join('\n')}\nint main() {\n    bool r = ${src};\n    std::cout << r << "${NL}";\n}\n`,
          expected: exp.join(' '),
          wrong: [[...all, r ? '1' : '0'].join(' '), [...trace, r ? '0' : '1'].join(' '), [...trace.slice(0, -1), r ? '1' : '0'].join(' ')],
          wrongWhy: [
            '&& and || guarantee left-to-right evaluation and SKIP the right operand when the left one already decides the result, so not every function is called.',
            'The functions that run are right, but the final value is wrong: re-evaluate with && binding tighter than ||.',
            'One call too few: the trace must contain every operand that is actually evaluated before the result is decided.',
          ],
          explain: '&& and || evaluate left to right and short-circuit: the right operand is not evaluated if the left one decides the result (false for &&, true for ||). && has higher precedence than ||. Here the functions return ' + all.map((f) => `${f}=${vals[f]}`).join(', ') + '.',
        };
      },
    }
,
  // ---------------------------------------------------------------------------
  {
      id: 'linkage-odr-compile', topic: 'Linkage, definitions & the One Definition Rule (single TU)', minStd: '98', kind: 'compile',
      build(R) {
        const ERR = /redefinition|undefined reference|ambiguous|multiple definition|never defined|ld returned/i;
        const cases = [
          { ok: false, code: 'int x;\nint x;\n\nint main() {}\n', why: 'In C++ there are no "tentative definitions": two definitions of x in the same scope are an error (unlike C).' },
          { ok: true, code: 'extern int x;\nextern int x;\nint x = 1;\n\nint main() {\n    return x - 1;\n}\n', why: 'Any number of declarations is fine as long as there is exactly one definition.' },
          { ok: false, code: 'extern int x;\n\nint main() {\n    return x;\n}\n', why: 'x is declared but never defined, so the linker reports an undefined reference.' },
          { ok: true, code: 'extern int x;\n\nint main() {\n    return 0;\n}\n', why: 'A declaration that is never odr-used needs no definition.' },
          { ok: false, code: 'static int f();\n\nint main() {\n    return f();\n}\n', why: 'A static (internal linkage) function that is used must be defined in this translation unit: it is used but never defined, so linking fails.' },
          { ok: true, code: 'static int f();\n\nint main() {\n    return f() - 1;\n}\n\nstatic int f() {\n    return 1;\n}\n', why: 'The static function is declared first and defined later in the same file: fine.' },
          { ok: false, code: 'void f() {}\nvoid f() {}\n\nint main() {}\n', why: 'A function may be defined only once: the second body is a redefinition.' },
          { ok: false, code: 'inline void f() {}\ninline void f() {}\n\nint main() {}\n', why: 'inline lets the same definition appear in several translation units, but a single translation unit may still contain it only once.' },
          { ok: false, code: 'namespace {\n    int g = 1;\n}\nint g = 2;\n\nint main() {\n    return g;\n}\n', why: 'The unnamed namespace\'s g is visible in the enclosing scope as well, so the unqualified name g is ambiguous between ::g and the unnamed-namespace g.' },
          { ok: true, code: 'namespace {\n    int g = 1;\n}\n\nint main() {\n    return g - 1;\n}\n', why: 'Names in an unnamed namespace are accessible in the enclosing scope and have internal linkage.' },
          { ok: true, code: 'struct S {\n    static const int k = 3;\n};\n\nint main() {\n    int a = S::k;\n    return a - 3;\n}\n', why: 'A static const integral member with an in-class initialiser can be used as a constant without a separate definition, as long as it is not odr-used.' },
          { ok: false, code: 'struct S {\n    static const int k = 3;\n};\n\nconst int& r = S::k;\n\nint main() {}\n', why: 'Binding a reference to S::k odr-uses it, so a definition (const int S::k;) outside the class is required; without it the linker reports an undefined reference.' },
          { ok: true, code: 'struct S {\n    static const int k = 3;\n};\n\nconst int S::k;\n\nconst int& r = S::k;\n\nint main() {\n    return r - 3;\n}\n', why: 'With the out-of-class definition, S::k exists as an object and a reference can bind to it.' },
        ];
        const c = R.pick(cases);
        return { kind: 'compile', code: c.code, expected: c.ok ? 'ok' : 'error', errorRe: c.ok ? null : ERR, explain: c.why };
      },
    }
,
  // ---------------------------------------------------------------------------
  {
      id: 'specialization-vs-overload', topic: 'Function template specialization vs overloading', minStd: '98',
      build(R) {
        const caseA = R.chance(0.5);
        const decl = caseA
          ? `template <class T> void f(T) { std::cout << "f1 "; }\ntemplate <> void f<int*>(int*) { std::cout << "spec-f1 "; }\ntemplate <class T> void f(T*) { std::cout << "f2 "; }\n`
          : `template <class T> void f(T) { std::cout << "f1 "; }\ntemplate <class T> void f(T*) { std::cout << "f2 "; }\ntemplate <> void f<int>(int*) { std::cout << "spec-f2 "; }\n`;
        const calls = caseA
          ? [['f(p)', 'f2'], ['f<int*>(p)', 'spec-f1'], ['f(1)', 'f1']]
          : [['f(p)', 'spec-f2'], ['f<int*>(p)', 'f1'], ['f<int>(p)', 'spec-f2'], ['f(1)', 'f1']];
        const picks = R.sample(calls, 3);
        const tags = ['f1', 'f2', 'spec-f1', 'spec-f2'];
        return {
          kind: 'output',
          code: `${inc('iostream')}${decl}\nint main() {\n    int x = 0;\n    int* p = &x;\n${picks.map((c) => `    ${c[0]};`).join('\n')}\n    std::cout << "${NL}";\n}\n`,
          expected: picks.map((c) => c[1]).join(' '),
          wrong: [picks.map((c) => (c[1] === 'f2' ? 'spec-f1' : c[1] === 'spec-f1' ? 'f2' : c[1] === 'spec-f2' ? 'f2' : 'f2')).join(' '), picks.map((c) => (c[1].startsWith('spec') ? c[1].replace('spec-', '') : c[1])).join(' '), picks.map(() => 'f1').join(' ')],
          wrongWhy: [
            'Overload resolution picks the best PRIMARY template first; explicit specializations are not candidates themselves, they only provide the body of the template they specialize.',
            'A specialization replaces the body of the primary template it belongs to; once that template is chosen, its specialization (if one matches) is used.',
            'f(T*) is more specialized than f(T) for a pointer argument, so f1 is not always the winner.',
          ],
          explain: caseA
            ? 'The explicit specialization f<int*>(int*) was declared when only the first template existed, so it specializes f(T). Overload resolution for f(p) then compares the primary templates f(T) and f(T*): f(T*) is more specialized, so f2 wins and the specialization is never considered. With explicit arguments <int*>, only f(T) is viable, and its specialization is used. f(1) can only use f(T).'
            : 'Here the specialization f<int>(int*) was declared after both templates and matches f(T*) with T=int, so it specializes f2. Overload resolution picks f(T*) over f(T) for pointer arguments, and its specialization supplies the body. f<int*>(p) can only be f(T) with T=int*, so it prints f1.',
        };
      },
    }
,
  // ---------------------------------------------------------------------------
  {
      id: 'template-deduction-overloads', topic: 'Template argument deduction & overloaded templates', minStd: '98',
      build(R, S) {
        const sets = [
          {
            decl: 'template <class T> void f(T&) { std::cout << "T& "; }\ntemplate <class T> void f(const T&) { std::cout << "const-T& "; }\n', vars: 'int x = 1;\n    const int c = 2;',
            calls: [['f(x)', 'T&', 'x is a non-const lvalue, so T& (T = int) needs no const added'], ['f(c)', 'const-T&', 'both deduce const int&, and const T& is the more specialized template'], ['f(3)', 'const-T&', 'a temporary cannot bind to a non-const lvalue reference'], ['f(x + 1)', 'const-T&', 'x + 1 is an rvalue, which only binds to a const reference']],
          },
          {
            decl: 'template <class T> void f(T) { std::cout << "T "; }\ntemplate <class T> void f(T*) { std::cout << "T* "; }\n', vars: 'int x = 1;\n    int arr[3] = {1, 2, 3};',
            calls: [['f(x)', 'T', 'an int cannot match T*'], ['f(&x)', 'T*', 'both are exact; f(T*) is more specialized'], ['f(arr)', 'T*', 'the array decays to int*; again f(T*) is more specialized'], ['f("lit")', 'T*', 'the literal decays to const char*, which matches T* with T = const char'], ['f(0)', 'T', '0 is deduced as int, not as a pointer']],
          },
        ];
        if (S.ge('11')) {
          sets.push({
            decl: 'template <class T> void f(T&&) { std::cout << "T&& "; }\ntemplate <class T> void f(const T&) { std::cout << "const-T& "; }\n', vars: 'int x = 1;\n    const int c = 2;',
            calls: [['f(x)', 'T&&', 'T&& deduces T = int&, giving int&: a better match than const int&'], ['f(c)', 'const-T&', 'both give const int&; the lvalue-reference overload is considered more specialized'], ['f(3)', 'T&&', 'an rvalue binds better to int&& than to const int&'], ['f(std::move(x))', 'T&&', 'std::move yields an xvalue, which binds to the rvalue reference']],
          });
        }
        const set = R.pick(sets);
        const picks = R.sample(set.calls, 3);
        const tags = [...new Set(set.calls.map((c) => c[1]))];
        const other = (t) => tags[(tags.indexOf(t) + 1) % tags.length];
        return {
          kind: 'output',
          code: `${inc('iostream', 'utility')}${set.decl}\nint main() {\n    ${set.vars}\n${picks.map((c) => `    ${c[0]};`).join('\n')}\n    std::cout << "${NL}";\n}\n`,
          expected: picks.map((c) => c[1]).join(' '),
          wrong: [picks.map((c) => other(c[1])).join(' '), picks.map((c, i) => (i === 0 ? other(c[1]) : c[1])).join(' '), picks.map((c, i) => (i === picks.length - 1 ? other(c[1]) : c[1])).join(' ')],
          wrongWhy: [
            'Deduce T for each overload separately, then compare the resulting parameter types and, on a tie, which template is more specialized.',
            'The first call is the one most people get wrong: check the value category and constness of the argument.',
            'The last call differs: compare what each overload deduces for that argument.',
          ],
          explain: picks.map((c) => `${c[0]}: ${c[2]}.`).join(' '),
        };
      },
    }
,
  // ---------------------------------------------------------------------------
  {
      id: 'temporary-lifetime', topic: 'Temporaries & lifetime extension', minStd: '98',
      build(R, S) {
        const n = R.int(3, 4);
        const kinds = ['stmt', 'named', 'constref', 'print'];
        if (S.ge('11')) kinds.push('rref');
        const lines = [], events = [], pending = []; // pending: objects destroyed at scope end (in creation order)
        for (let i = 1; i <= n; i++) {
          const k = R.pick(kinds);
          if (k === 'stmt') { lines.push(`        T(${i});`); events.push(`T${i}`, `~T${i}`); }
          else if (k === 'named') { lines.push(`        T v${i}(${i});`); events.push(`T${i}`); pending.push(i); }
          else if (k === 'constref') { lines.push(`        const T& r${i} = T(${i});`); events.push(`T${i}`); pending.push(i); }
          else if (k === 'rref') { lines.push(`        T&& r${i} = T(${i});`); events.push(`T${i}`); pending.push(i); }
          else { lines.push(`        std::cout << T(${i}).id << " ";`); events.push(`T${i}`, String(i), `~T${i}`); }
          events.push('|');
          lines.push('        std::cout << "| ";');
        }
        for (const i of [...pending].reverse()) events.push(`~T${i}`);
        // Wrong model 1: lifetime extension ignored (bound temporaries die at the end of their statement).
        const wrongImmediate = [];
        const pend2 = [];
        for (let i = 1; i <= n; i++) {
          const ln = lines[(i - 1) * 2];
          if (/^\s+T\(\d+\);/.test(ln)) wrongImmediate.push(`T${i}`, `~T${i}`);
          else if (/^\s+T v/.test(ln)) { wrongImmediate.push(`T${i}`); pend2.push(i); }
          else if (/^\s+(const T&|T&&) r/.test(ln)) wrongImmediate.push(`T${i}`, `~T${i}`);
          else wrongImmediate.push(`T${i}`, String(i), `~T${i}`);
          wrongImmediate.push('|');
        }
        for (const i of [...pend2].reverse()) wrongImmediate.push(`~T${i}`);
        // Wrong model 2: block-scope objects destroyed in construction order.
        const wrongForward = [...events.slice(0, events.lastIndexOf('|') + 1), ...pending.map((i) => `~T${i}`)];
        return {
          kind: 'output',
          code: `${inc('iostream')}struct T {\n    int id;\n    explicit T(int i) : id(i) { std::cout << "T" << i << " "; }\n    ~T() { std::cout << "~T" << id << " "; }\n};\n\nint main() {\n    {\n${lines.join('\n')}\n    }\n    std::cout << "${NL}";\n}\n`,
          expected: events.join(' '),
          wrong: [wrongImmediate.join(' '), wrongForward.join(' '), [...events].reverse().join(' ')],
          wrongWhy: [
            'Binding a temporary to a const lvalue reference (or an rvalue reference) extends its lifetime to that of the reference, so it lives until the end of the block, not the end of the statement.',
            'Objects that live until the end of the block are destroyed in reverse order of their construction, and each full-expression temporary dies at the end of its own statement.',
            'The whole sequence reversed makes no sense: construction happens in statement order; only the destructors at the end of the block run in reverse.',
          ],
          explain: 'A temporary normally dies at the end of the full-expression that created it (T(n); and the std::cout statement). Binding it to a const T& or T&& extends its lifetime to the reference\'s scope. Named objects and extended temporaries are destroyed at the end of the block in reverse order of construction.',
        };
      },
    },
];
