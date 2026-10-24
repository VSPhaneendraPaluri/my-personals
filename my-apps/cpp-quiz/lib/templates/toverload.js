// Overloading, overriding and operator-overloading question templates (C++98 .. C++17).
const { inc, NL } = require('./common');

const say = (tag) => `{ std::cout << "${tag} "; }`;

module.exports = [
  // ---------------------------------------------------------------------------
  {
    id: 'overload-resolution', topic: 'Overload resolution (ranking of conversions)', minStd: '98',
    build(R, S) {
      const cases = [];
      // 1. exact > promotion > conversion
      {
        const withLong = R.chance(0.5);
        const decl = `void f(int) ${say('int')}\nvoid f(double) ${say('double')}\n${withLong ? 'void f(long) ' + say('long') + '\n' : ''}`;
        const calls = [["'a'", 'int', 'char -> int is an integral promotion, better than any conversion'], ['true', 'int', 'bool -> int is an integral promotion'], ['1.5f', 'double', 'float -> double is a floating-point promotion'], ['(short)3', 'int', 'short -> int is an integral promotion'], ['1', 'int', 'int is an exact match'], ['1.5', 'double', 'double is an exact match']];
        if (withLong) calls.push(['1L', 'long', 'long is an exact match']);
        cases.push({ decl, calls, why: 'Overload resolution ranks implicit conversions: exact match beats promotion (char/short/bool -> int, float -> double), which beats other standard conversions.' });
      }
      // 2. pointer / bool / string traps
      {
        cases.push({
          decl: `void f(bool) ${say('bool')}\nvoid f(const std::string&) ${say('string')}\n`, extra: ['string'],
          calls: [['"hi"', 'bool', 'a string literal decays to const char*, and pointer -> bool is a standard conversion, which beats the user-defined conversion to std::string'], ['std::string("hi")', 'string', 'exact match with the std::string overload'], ['true', 'bool', 'exact match']],
          why: 'A standard conversion (pointer -> bool) always beats a user-defined conversion (const char* -> std::string via its constructor), even though the programmer probably meant the string overload.',
        });
        cases.push({
          decl: `void f(bool) ${say('bool')}\nvoid f(const char*) ${say('cstr')}\n`,
          calls: [['"hi"', 'cstr', 'the array decays to const char*, an exact match; pointer -> bool would only be a conversion'], ['true', 'bool', 'exact match']],
          why: 'The const char* overload is an exact match (after array-to-pointer conversion) for a string literal, so it beats the boolean conversion.',
        });
        cases.push({
          decl: `void f(int) ${say('int')}\nvoid f(const void*) ${say('voidp')}\nvoid f(bool) ${say('bool')}\n`, vars: 'int x = 0;',
          calls: [['&x', 'voidp', 'int* -> const void* is a pointer conversion; int* -> bool is also a conversion, but a pointer-to-bool conversion ranks worse than other conversions'], ['1', 'int', 'exact match'], ['true', 'bool', 'exact match']],
          why: 'Among conversions, converting a pointer to bool is explicitly ranked worse than converting it to another pointer type.',
        });
      }
      // 3. lvalue / const / rvalue references
      {
        const rv = S.ge('11') && R.chance(0.6);
        const decl = `void f(int&) ${say('lref')}\nvoid f(const int&) ${say('const-ref')}\n${rv ? 'void f(int&&) ' + say('rref') + '\n' : ''}`;
        const calls = [['x', 'lref', 'a modifiable lvalue binds best to int&'], ['c', 'const-ref', 'a const lvalue can only bind to const int&'], [rv ? '3' : '3', rv ? 'rref' : 'const-ref', rv ? 'a prvalue prefers int&& over const int&' : 'a temporary cannot bind to int&, only to const int&']];
        if (rv) calls.push(['x + 1', 'rref', 'x + 1 is a prvalue, which binds to int&&'], ['std::move(x)', 'rref', 'std::move casts to an xvalue, which binds to int&&']);
        else calls.push(['x + 1', 'const-ref', 'x + 1 is a temporary, which can only bind to const int&']);
        cases.push({ decl, vars: 'int x = 1;\n    const int c = 2;', calls, extraInc: ['utility'], why: 'Reference binding rules: non-const lvalue references only bind to modifiable lvalues; const references accept everything; an rvalue reference (C++11) is preferred for rvalues.' });
      }
      // 4. const member overloads
      {
        cases.push({
          raw: true,
          decl: `struct A {\n    void f() ${say('non-const')}\n    void f() const ${say('const')}\n};\n`, vars: 'A a;\n    const A ca = A();\n    const A& r = a;\n    A& r2 = a;',
          calls: [['a.f()', 'non-const', 'a is a non-const object'], ['ca.f()', 'const', 'ca is const, so only the const member is viable'], ['r.f()', 'const', 'the reference is to const A: the static type decides, not the object\'s real constness'], ['r2.f()', 'non-const', 'r2 is a non-const reference'], ['A().f()', 'non-const', 'a non-const temporary prefers the non-const overload']],
          why: 'Member functions overloaded on const are chosen from the constness of the expression used to call them (the implicit object parameter).',
        });
      }
      // 5. template vs non-template
      {
        cases.push({
          decl: `void f(int) ${say('int')}\ntemplate <class T> void f(T) ${say('template')}\n`,
          calls: [['1', 'int', 'both are exact matches; a non-template function is preferred over a template specialization'], ["'a'", 'template', 'the template deduces T = char (exact match), which beats the promotion char -> int'], ['1.5', 'template', 'T = double is exact; f(int) would need a conversion'], ['1L', 'template', 'T = long is exact; f(int) would need a conversion'], ['(short)2', 'template', 'T = short is exact']],
          why: 'A template is only used when it is a better match; on a tie the non-template wins. Exact matches via template deduction beat promotions and conversions needed by the non-template.',
        });
      }
      // 6. ellipsis is the worst match
      {
        cases.push({
          decl: `void f(int) ${say('int')}\nvoid f(...) ${say('ellipsis')}\n`,
          calls: [['1', 'int', 'exact match'], ["'a'", 'int', 'promotion'], ['1.5', 'int', 'double -> int is a standard conversion, still better than the ellipsis conversion sequence'], ['"x"', 'ellipsis', 'const char* cannot convert to int, so only f(...) is viable'], ['2L', 'int', 'long -> int is a standard conversion, beating ellipsis']],
          why: 'The ellipsis conversion sequence is always the worst, so f(...) is only chosen when nothing else is viable.',
        });
      }
      // 7. pointer-to-const
      {
        cases.push({
          decl: `void f(int*) ${say('int*')}\nvoid f(const int*) ${say('const-int*')}\n`, vars: 'int x = 0;\n    const int cx = 0;',
          calls: [['&x', 'int*', 'int* is an exact match; adding const would be a qualification conversion'], ['&cx', 'const-int*', 'const int* cannot convert to int*'], ['static_cast<const int*>(&x)', 'const-int*', 'the expression has type const int*']],
          why: 'Pointer-to-const and pointer-to-non-const parameters are distinct overloads; the most cv-qualified-compatible exact match wins.',
        });
      }
      // 8. nullptr (C++11)
      if (S.ge('11')) {
        cases.push({
          decl: `void f(int) ${say('int')}\nvoid f(char*) ${say('char*')}\n`,
          calls: [['0', 'int', 'the literal 0 is an exact int; it is only a null-pointer conversion for f(char*)'], ['nullptr', 'char*', 'std::nullptr_t converts to pointers but not to int'], ['(char*)0', 'char*', 'exact match for char*']],
          why: 'The literal 0 is an int first; nullptr has its own type and converts only to pointer types and bool.',
        });
      }
      const c = R.pick(cases);
      const picks = R.sample(c.calls, Math.min(3, c.calls.length));
      const incs = ['iostream', ...(c.extra || []), ...(c.extraInc || [])];
      const tags = [...new Set(c.calls.map((x) => x[1]))];
      const expected = picks.map((p) => p[1]).join(' ');
      const wrong = [picks.map((p) => tags[(tags.indexOf(p[1]) + 1) % tags.length]).join(' '), picks.map((p) => tags[(tags.indexOf(p[1]) + 2) % tags.length]).join(' '), picks.map((p, i) => (i === 0 ? tags[(tags.indexOf(p[1]) + 1) % tags.length] : p[1])).join(' ')];
      const call = (p) => (c.raw ? `    ${p[0]};` : `    f(${p[0]});`);
      return {
        kind: 'output',
        code: `${inc(...incs)}${c.decl}\nint main() {\n${c.vars ? '    ' + c.vars + '\n' : ''}${picks.map(call).join('\n')}\n    std::cout << "${NL}";\n}\n`,
        expected, wrong,
        explain: c.why + ' ' + picks.map((p) => `${c.raw ? p[0] : `f(${p[0]})`}: ${p[2]}.`).join(' '),
      };
    },
  },
  // ---------------------------------------------------------------------------
  {
    id: 'overload-compile', topic: 'Overloading: ambiguity & illegal overloads', minStd: '98', kind: 'compile',
    build(R, S) {
      const ERR = /ambiguous|ambiguating|overload|redefinition|conflicting|redeclar|different/i;
      const cases = [
        { ok: false, code: 'void f(int) {}\nvoid f(long) {}\n\nint main() {\n    f(1u);\n}\n', why: 'unsigned int converts to int and to long by integral conversions of equal rank, so the call is ambiguous.' },
        { ok: true, code: 'void f(int) {}\nvoid f(long) {}\n\nint main() {\n    f(1);\n    f(1L);\n}\n', why: 'Both calls are exact matches for one of the overloads.' },
        { ok: false, code: 'void f(int) {}\nvoid f(double) {}\n\nint main() {\n    f(1L);\n}\n', why: 'long -> int and long -> double are both conversions of the same rank: ambiguous.' },
        { ok: false, code: 'void f(int*) {}\nvoid f(char*) {}\n\nint main() {\n    f(0);\n}\n', why: 'The literal 0 is a null pointer constant convertible to both pointer types equally well: ambiguous.' },
        { ok: false, code: 'int f(int) { return 0; }\ndouble f(int) { return 0.0; }\n\nint main() {}\n', why: 'Functions cannot be overloaded on the return type alone.' },
        { ok: false, code: 'void f(int) {}\nvoid f(const int) {}\n\nint main() {}\n', why: 'A top-level const on a by-value parameter is not part of the function type, so both declare the same function: redefinition.' },
        { ok: true, code: 'void f(int&) {}\nvoid f(const int&) {}\n\nint main() {\n    int x = 0;\n    f(x);\n    f(5);\n}\n', why: 'const on the referred-to type IS part of the signature, so these are distinct overloads.' },
        { ok: true, code: 'void f(int*) {}\nvoid f(const int*) {}\n\nint main() {\n    int x = 0;\n    f(&x);\n}\n', why: 'const on the pointed-to type is part of the signature, so these are distinct overloads.' },
        { ok: false, code: 'void f(int*) {}\nvoid f(int* const) {}\n\nint main() {}\n', why: 'A top-level const on the pointer itself is ignored in the function type: same signature, redefinition.' },
        { ok: false, code: 'void f(int a[]) {}\nvoid f(int* a) {}\n\nint main() {}\n', why: 'A parameter of array type is adjusted to a pointer, so both functions have the signature f(int*): redefinition.' },
        { ok: false, code: 'void f(int) {}\nvoid f(int, int = 0) {}\n\nint main() {\n    f(1);\n}\n', why: 'f(1) matches both f(int) and f(int, int = 0) equally well: ambiguous. Default arguments do not take part in ranking.' },
        { ok: false, code: 'struct A {\n    void f() {}\n    static void f() {}\n};\n\nint main() {}\n', why: 'A static and a non-static member function with the same parameter list cannot be overloaded.' },
        { ok: true, code: 'struct A {\n    void f() {}\n    void f() const {}\n};\n\nint main() {\n    A a;\n    a.f();\n}\n', why: 'const-qualification of the member function is part of its signature, so this is a valid overload set.' },
        { ok: false, code: 'void f(char) {}\nvoid f(unsigned char) {}\n\nint main() {\n    f(65);\n}\n', why: 'int -> char and int -> unsigned char are both integral conversions: ambiguous.' },
        { ok: true, code: 'void f(char) {}\nvoid f(int) {}\n\nint main() {\n    f(65);\n    f(\'A\');\n}\n', why: '65 is an exact int; \'A\' is an exact char: no ambiguity.' },
      ];
      if (S.ge('11')) {
        cases.push({ ok: true, code: 'struct A {\n    void f() & {}\n    void f() && {}\n};\n\nint main() {\n    A a;\n    a.f();\n    A().f();\n}\n', why: 'C++11 ref-qualifiers let you overload on the value category of the object: lvalue calls the & version, a temporary the && version.' });
        cases.push({ ok: false, code: 'struct A {\n    void f() & {}\n    void f() {}\n};\n\nint main() {}\n', why: 'A function with a ref-qualifier cannot be overloaded with one without a ref-qualifier when the parameter lists are otherwise identical.' });
      }
      const c = R.pick(cases);
      return { kind: 'compile', code: c.code, expected: c.ok ? 'ok' : 'error', errorRe: c.ok ? null : ERR, explain: c.why };
    },
  },
  // ---------------------------------------------------------------------------
  {
    id: 'override-overload-mix', topic: 'Overriding vs overloading vs hiding', minStd: '98',
    build(R) {
      const overInt = R.chance(0.6), overDouble = !overInt || R.chance(0.4);
      const using = R.chance(0.4);
      const argsPool = [['1', 'int'], ['2.5', 'double'], ["'c'", 'char']];
      const aP = R.pick(argsPool), aD = R.pick(argsPool);
      const declared = new Set([...(overInt ? ['int'] : []), ...(overDouble ? ['double'] : [])]);
      // Pick signature chosen by overload resolution among visible candidates
      const pick = (arg, visible) => {
        if (visible.includes(arg)) return arg;
        if (arg === 'char' && visible.includes('int')) return 'int';
        return visible.includes('double') ? 'double' : 'int';
      };
      const visD = using ? ['int', 'double'] : [...declared];
      const final = (sig) => (declared.has(sig) ? 'Derived' : 'Base');
      const viaP = `${final(pick(aP[1], ['int', 'double']))}::f(${pick(aP[1], ['int', 'double'])})`;
      const sd = pick(aD[1], visD);
      const viaD = `${final(sd)}::f(${sd})`;
      const alt = (sig) => (sig === 'int' ? 'double' : 'int');
      const wrongP = `Base::f(${pick(aP[1], ['int', 'double'])})`;
      return {
        kind: 'output',
        code: `${inc('iostream')}struct Base {\n    virtual void f(int) ${say('Base::f(int)')}\n    virtual void f(double) ${say('Base::f(double)')}\n    virtual ~Base() {}\n};\n\nstruct Derived : Base {\n${using ? '    using Base::f;\n' : ''}${overInt ? '    void f(int) ' + say('Derived::f(int)') + '\n' : ''}${overDouble ? '    void f(double) ' + say('Derived::f(double)') + '\n' : ''}};\n\nint main() {\n    Derived d;\n    Base* p = &d;\n    p->f(${aP[0]});\n    d.f(${aD[0]});\n    std::cout << "${NL}";\n}\n`,
        expected: `${viaP} ${viaD}`,
        wrong: [`${wrongP} ${viaD}`, `${viaP} Base::f(${sd})`, `${viaP} ${final(sd)}::f(${alt(sd)})`],
        explain: 'Through Base* the overload (f(int) vs f(double)) is chosen using Base\'s declarations, then the virtual call goes to the final overrider of that exact signature (Derived if it declares it, otherwise Base). Through a Derived object, name lookup finds Derived::f first and hides all Base::f' + (using ? ' except those re-exposed by the using-declaration' : '') + ', so overload resolution only sees the visible candidates.',
      };
    },
  },
  // ---------------------------------------------------------------------------
  {
    id: 'operator-incr-overload', topic: 'Overloading ++ (prefix vs postfix) and operators', minStd: '98',
    build(R) {
      let v = R.int(0, 9);
      const v0 = v;
      const stmts = [], outs = [];
      const n = R.int(3, 4);
      for (let i = 0; i < n; i++) {
        const k = R.pick(['post', 'pre', 'val', 'post', 'pre']);
        if (k === 'post') { stmts.push('(c++).v'); outs.push(v); v++; }
        else if (k === 'pre') { v++; stmts.push('(++c).v'); outs.push(v); }
        else { stmts.push('c.v'); outs.push(v); }
      }
      const wrongShift = stmts.map((s, i) => outs[i] + (s.includes('++') ? (s.startsWith('(c') ? 1 : -1) : 0));
      return {
        kind: 'output',
        code: `${inc('iostream')}struct C {\n    int v;\n    explicit C(int x) : v(x) {}\n    C& operator++() { ++v; return *this; }\n    C operator++(int) { C old(*this); ++v; return old; }\n};\n\nint main() {\n    C c(${v0});\n${stmts.map((s) => `    std::cout << ${s} << " ";`).join('\n')}\n    std::cout << "${NL}";\n}\n`,
        expected: outs.join(' '),
        wrong: [wrongShift.join(' '), stmts.map((s, i) => outs[i] + (s.includes('++') ? 1 : 0)).join(' '), stmts.map((s, i) => outs[i] - (s.includes('++') ? 1 : 0)).join(' ')],
        explain: 'operator++() (prefix) increments and returns the updated object; operator++(int) (postfix, the dummy int tells them apart) returns a copy of the OLD value and then increments. Reading c.v shows the current state.',
      };
    },
  },
  // ---------------------------------------------------------------------------
  {
    id: 'operator-overload-compile', topic: 'Operator overloading rules', minStd: '98', kind: 'compile',
    build(R) {
      const ERR = /no match|must have|invalid operands|argument of class|not declared|no operator|ambiguous/i;
      const cases = [
        { ok: true, code: 'struct A {\n    int v;\n    A operator+(int x) const { A r = *this; r.v += x; return r; }\n};\n\nint main() {\n    A a = {1};\n    A b = a + 2;\n    (void)b;\n}\n', why: 'a + 2 calls the member a.operator+(2).' },
        { ok: false, code: 'struct A {\n    int v;\n    A operator+(int x) const { A r = *this; r.v += x; return r; }\n};\n\nint main() {\n    A a = {1};\n    A b = 2 + a;\n    (void)b;\n}\n', why: 'For 2 + a the left operand is an int, so a member operator+ of A cannot be used (no implicit conversion on the left operand of a member operator). A non-member operator+(int, const A&) would be needed.' },
        { ok: true, code: 'struct A {\n    int v;\n};\n\nA operator+(int x, const A& a) {\n    A r = a;\n    r.v += x;\n    return r;\n}\n\nint main() {\n    A a = {1};\n    A b = 2 + a;\n    (void)b;\n}\n', why: 'A non-member operator+(int, const A&) makes 2 + a valid.' },
        { ok: false, code: 'struct A {\n    int v;\n};\n\nint main() {\n    A a = {1}, b = {2};\n    bool same = (a == b);\n    (void)same;\n}\n', why: 'There is no built-in == for a user-defined struct and no operator== has been declared, so the expression does not compile.' },
        { ok: false, code: 'int operator+(int a, int b) { return a - b; }\n\nint main() {}\n', why: 'An overloaded operator must have at least one parameter of class or enumeration type: operators on built-in types cannot be redefined.' },
        { ok: false, code: '#include <iostream>\n\nstruct A {\n    int v;\n    std::ostream& operator<<(std::ostream& os) const { return os << v; }\n};\n\nint main() {\n    A a = {1};\n    std::cout << a << "\\n";\n}\n', why: 'A member operator<< takes the object as its LEFT operand (a << cout). For std::cout << a you need a non-member operator<<(std::ostream&, const A&).' },
        { ok: true, code: '#include <iostream>\n\nstruct A {\n    int v;\n};\n\nstd::ostream& operator<<(std::ostream& os, const A& a) { return os << a.v; }\n\nint main() {\n    A a = {1};\n    std::cout << a << "\\n";\n}\n', why: 'The non-member stream inserter has std::ostream& as its left operand, which is the form std::cout << a requires.' },
        { ok: true, code: 'struct F {\n    int operator()(int x) const { return x * 2; }\n};\n\nint main() {\n    F f;\n    return f(2) == 4 ? 0 : 1;\n}\n', why: 'operator() makes the object callable; f(2) returns 4.' },
        { ok: false, code: 'struct A {\n    int v;\n    A& operator+=(const A& o) { v += o.v; return *this; }\n};\n\nint main() {\n    A a = {1}, b = {2};\n    A c = a + b;\n    (void)c;\n}\n', why: 'Defining operator+= does not give you operator+; each operator must be declared separately.' },
        { ok: false, code: 'struct A {\n    int v;\n    int operator[](int i, int j) const { return v; }\n};\n\nint main() {}\n', why: 'Before C++23, operator[] must be a member function with exactly one parameter.' },
        { ok: true, code: 'struct A {\n    int v[3];\n    int& operator[](int i) { return v[i]; }\n    const int& operator[](int i) const { return v[i]; }\n};\n\nint main() {\n    A a = {{1, 2, 3}};\n    const A& r = a;\n    a[0] = 5;\n    return r[0] == 5 ? 0 : 1;\n}\n', why: 'Providing const and non-const operator[] overloads is the standard idiom: a[0] = 5 uses the non-const one, r[0] the const one.' },
      ];
      const c = R.pick(cases);
      return { kind: 'compile', code: c.code, expected: c.ok ? 'ok' : 'error', errorRe: c.ok ? null : ERR, explain: c.why };
    },
  },
];
