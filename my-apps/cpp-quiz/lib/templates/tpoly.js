// Polymorphism & inheritance question templates (C++98 .. C++17).
// Every template is a parametric generator; the compiler-confirmation loop
// (lib/pool.js / test/validate-templates.js) guards each generated question.
const { inc, NL } = require('./common');

const NAMES = ['Shape', 'Animal', 'Vehicle', 'Widget', 'Device', 'Account', 'Employee', 'Logger', 'Sensor', 'Task'];
const SUBS = ['Circle', 'Dog', 'Car', 'Button', 'Phone', 'Savings', 'Manager', 'FileLog', 'Probe', 'Job', 'Square', 'Truck', 'Cat', 'Lamp'];

module.exports = [
  // ---------------------------------------------------------------------------
  {
    id: 'slicing', topic: 'Object slicing & static vs dynamic type', minStd: '98',
    build(R) {
      const mode = R.int(0, 2);
      const head = `struct Base {\n    virtual const char* who() const { return "Base"; }\n    virtual ~Base() {}\n};\n\nstruct Derived : Base {\n    const char* who() const { return "Derived"; }\n};\n\n`;
      if (mode === 0) {
        const fns = {
          byValue: ['void byValue(Base b) { std::cout << b.who() << " "; }', 'Base'],
          byRef: ['void byRef(const Base& b) { std::cout << b.who() << " "; }', 'Derived'],
          byPtr: ['void byPtr(const Base* b) { std::cout << b->who() << " "; }', 'Derived'],
        };
        const calls = Array.from({ length: 3 }, () => R.pick(Object.keys(fns)));
        const used = [...new Set(calls)];
        const arg = (c) => (c === 'byPtr' ? '&d' : 'd');
        const exp = calls.map((c) => fns[c][1]);
        return {
          kind: 'output',
          code: `${inc('iostream')}${head}${used.map((u) => fns[u][0]).join('\n')}\n\nint main() {\n    Derived d;\n${calls.map((c) => `    ${c}(${arg(c)});`).join('\n')}\n    std::cout << "${NL}";\n}\n`,
          expected: exp.join(' '),
          wrong: [exp.map(() => 'Derived').join(' '), exp.map(() => 'Base').join(' '), exp.map((e) => (e === 'Base' ? 'Derived' : 'Base')).join(' ')],
          explain: 'Passing by value copy-constructs a Base from the Derived object (slicing): the Derived part is cut off, so who() is Base\'s. References and pointers keep the dynamic type, so the virtual call reaches Derived::who().',
        };
      }
      if (mode === 1) {
        const pool = [
          ['Base b = d;', 'b.who()', 'Base'],
          ['Base& r = d;', 'r.who()', 'Derived'],
          ['Base* p = &d;', 'p->who()', 'Derived'],
          ['Base c(d);', 'c.who()', 'Base'],
          ['const Base& cr = d;', 'cr.who()', 'Derived'],
        ];
        const picks = R.sample(pool, 3);
        return {
          kind: 'output',
          code: `${inc('iostream')}${head}int main() {\n    Derived d;\n${picks.map((p) => '    ' + p[0]).join('\n')}\n    std::cout << ${picks.map((p) => p[1]).join(' << " " << ')} << "${NL}";\n}\n`,
          expected: picks.map((p) => p[2]).join(' '),
          wrong: [picks.map((p) => (p[2] === 'Base' ? 'Derived' : 'Base')).join(' '), picks.map(() => 'Derived').join(' '), picks.map(() => 'Base').join(' ')],
          explain: 'Only references and pointers preserve the dynamic type. Initialising a Base object from a Derived (Base b = d; Base c(d);) slices: the new object is a plain Base whose virtual calls resolve to Base.',
        };
      }
      return {
        kind: 'output',
        code: `${inc('iostream', 'vector')}${head}int main() {\n    Derived d;\n    std::vector<Base> objs;\n    std::vector<Base*> ptrs;\n    objs.push_back(d);\n    ptrs.push_back(&d);\n    std::cout << objs[0].who() << " " << ptrs[0]->who() << "${NL}";\n}\n`,
        expected: 'Base Derived',
        wrong: ['Derived Derived', 'Base Base', 'Derived Base'],
        explain: 'std::vector<Base> stores Base objects by value, so push_back(d) slices the Derived. A vector of Base* keeps the pointers to the original Derived object, so the virtual call dispatches dynamically.',
      };
    },
  },
  // ---------------------------------------------------------------------------
  {
    id: 'virtual-dtor-chain', topic: 'Virtual destructors & deleting via a base pointer', minStd: '98',
    build(R) {
      const n = R.int(3, 4);
      const names = R.sample(NAMES.concat(SUBS), n);
      const k = R.int(1, n - 1);       // dynamic type level
      const j = R.int(0, k);           // static pointer type level
      const showCtor = R.chance(0.5);
      const cls = names.map((nm, i) => `struct ${nm}${i ? ' : ' + names[i - 1] : ''} {\n${showCtor ? `    ${nm}() { std::cout << "${nm} "; }\n` : ''}    ${i === 0 ? 'virtual ' : ''}~${nm}() { std::cout << "~${nm} "; }\n};\n`).join('\n');
      const ctors = showCtor ? names.slice(0, k + 1) : [];
      const dtors = names.slice(0, k + 1).reverse().map((x) => '~' + x);
      const exp = [...ctors, ...dtors];
      const wrongPartial = [...ctors, '~' + names[j]];
      return {
        kind: 'output',
        code: `${inc('iostream')}${cls}\nint main() {\n    ${names[j]}* p = new ${names[k]};\n    delete p;\n    std::cout << "${NL}";\n}\n`,
        expected: exp.join(' '),
        wrong: [wrongPartial.join(' '), [...ctors, ...names.slice(0, k + 1).map((x) => '~' + x)].join(' '), [...ctors, '~' + names[k]].join(' ')],
        explain: `The destructor is virtual (declared virtual in ${names[0]}, and virtual-ness is inherited by every overrider), so delete through a ${names[j]}* runs the destructor of the dynamic type ${names[k]} first and then each base destructor in reverse order of construction.`,
      };
    },
  },
  // ---------------------------------------------------------------------------
  {
    id: 'virtual-in-ctor', topic: 'Virtual calls inside constructors & destructors', minStd: '98',
    build(R) {
      const n = R.int(2, 3);
      const names = R.sample(SUBS, n);
      const ov = names.map((_, i) => i === 0 || R.chance(0.6));
      const nameAt = (i) => { let x = i; while (!ov[x]) x--; return names[x]; };
      const cls = names.map((nm, i) => `struct ${nm}${i ? ' : ' + names[i - 1] : ''} {\n    ${nm}() { std::cout << who() << " "; }\n    ~${nm}() { std::cout << who() << " "; }\n${ov[i] ? `    ${i === 0 ? 'virtual ' : ''}const char* who() const { return "${nm}"; }\n` : ''}};\n`);
      // `who` must be declared before it is used inside ctors: forward-declare via the class body (member functions bodies see the full class).
      const exp = [];
      for (let i = 0; i < n; i++) exp.push(nameAt(i));
      for (let i = n - 1; i >= 0; i--) exp.push(nameAt(i));
      const dynamicAll = names[n - 1];
      return {
        kind: 'output',
        code: `${inc('iostream')}${cls.join('\n')}\nint main() {\n    {\n        ${names[n - 1]} obj;\n    }\n    std::cout << "${NL}";\n}\n`,
        expected: exp.join(' '),
        wrong: [Array(2 * n).fill(dynamicAll).join(' '), [...exp].reverse().join(' '), [...exp.slice(0, n), ...exp.slice(0, n).reverse().map(() => dynamicAll)].join(' ')],
        explain: 'While a constructor (or destructor) of class X runs, the object\'s dynamic type is X, so a virtual call inside it resolves to X\'s version (or the nearest base-class version if X does not override it), never to a further-derived override.',
      };
    },
  },
  // ---------------------------------------------------------------------------
  {
    id: 'default-arg-virtual', topic: 'Default arguments are bound statically', minStd: '98',
    build(R) {
      const A = R.int(1, 5), B = R.int(6, 9), K = R.int(10, 19);
      const calls = [
        ['pb->f()', 'Base default', A], ['pd->f()', 'Derived default', B], ['rb.f()', 'Base default', A], ['d.f()', 'Derived default', B],
        [`pb->f(${K})`, 'explicit', K], [`pd->f(${K})`, 'explicit', K],
      ];
      const picks = R.sample(calls, 3);
      const out = (c) => `Derived${c[2]}`;
      const alt = (c) => `Derived${c[1] === 'Base default' ? B : c[1] === 'Derived default' ? A : c[2]}`;
      return {
        kind: 'output',
        code: `${inc('iostream')}struct Base {\n    virtual void f(int x = ${A}) { std::cout << "Base" << x << " "; }\n    virtual ~Base() {}\n};\n\nstruct Derived : Base {\n    void f(int x = ${B}) { std::cout << "Derived" << x << " "; }\n};\n\nint main() {\n    Derived d;\n    Base* pb = &d;\n    Derived* pd = &d;\n    Base& rb = d;\n${picks.map((c) => `    ${c[0]};`).join('\n')}\n    std::cout << "${NL}";\n}\n`,
        expected: picks.map(out).join(' '),
        wrong: [picks.map(alt).join(' '), picks.map((c) => `Base${c[2]}`).join(' '), picks.map((c) => `Base${c[1] === 'Base default' ? A : c[1] === 'Derived default' ? B : c[2]}`).join(' ')],
        explain: 'Which function body runs is decided at run time (always Derived::f here), but a default argument is substituted at compile time from the static type of the expression: through Base* / Base& you get Base\'s default, through Derived* / Derived you get Derived\'s default.',
      };
    },
  },
  // ---------------------------------------------------------------------------
  {
    id: 'name-hiding', topic: 'Name hiding vs overriding', minStd: '98',
    build(R) {
      const using = R.chance(0.5);
      const argsPool = [['1', 'int'], ['2.5', 'double'], ["'c'", 'char']];
      const a1 = R.pick(argsPool), a2 = R.pick(argsPool);
      // Via Derived object: with using-declaration the best overload wins, otherwise only Derived::f(double) is visible.
      const viaD = (a) => (using ? (a[1] === 'double' ? 'Derived::f(double)' : 'Base::f(int)') : 'Derived::f(double)');
      const viaB = () => 'Base::f(int)'; // Base only has f(int); double converts to int
      const flipD = (a) => (viaD(a) === 'Base::f(int)' ? 'Derived::f(double)' : 'Base::f(int)');
      return {
        kind: 'output',
        code: `${inc('iostream')}struct Base {\n    void f(int) { std::cout << "Base::f(int) "; }\n};\n\nstruct Derived : Base {\n${using ? '    using Base::f;\n' : ''}    void f(double) { std::cout << "Derived::f(double) "; }\n};\n\nint main() {\n    Derived d;\n    Base& b = d;\n    d.f(${a1[0]});\n    b.f(${a2[0]});\n    std::cout << "${NL}";\n}\n`,
        expected: `${viaD(a1)} ${viaB(a2)}`,
        wrong: [`${flipD(a1)} ${viaB(a2)}`, `${viaD(a1)} Derived::f(double)`, `${flipD(a1)} Derived::f(double)`],
        explain: using
          ? 'The using-declaration brings Base::f(int) into Derived, so d.f(...) does normal overload resolution between f(int) and f(double) (exact/promotion beats conversion). A Base& only sees Base::f(int), whatever the argument type.'
          : 'Declaring f in Derived hides every Base::f (name hiding, not overriding: f is not virtual and the signatures differ). d.f(...) can only see Derived::f(double); a Base& looks up f in Base and finds only f(int).',
      };
    },
  },
  // ---------------------------------------------------------------------------
  {
    id: 'diamond-ctor-order', topic: 'Multiple & virtual inheritance (diamond)', minStd: '98',
    build(R) {
      const [root, x, y, d] = R.sample(['Root', 'Left', 'Right', 'Mid', 'Top', 'Core', 'Item', 'Part', 'Unit', 'Node'], 4);
      const vx = R.chance(0.5), vy = R.chance(0.5), dtors = R.chance(0.5);
      const cls = (n, base, virt) => `struct ${n}${base ? ` : ${virt ? 'virtual ' : ''}${base}` : ''} {\n    ${n}() { std::cout << "${n} "; }\n${dtors ? `    ~${n}() { std::cout << "~${n} "; }\n` : ''}};\n`;
      const seq = [];
      if (vx || vy) seq.push(root);
      if (!vx) seq.push(root); seq.push(x);
      if (!vy) seq.push(root); seq.push(y);
      seq.push(d);
      const rev = [...seq].reverse().map((s) => '~' + s);
      const exp = dtors ? [...seq, ...rev] : seq;
      const allV = [root, x, y, d];
      const naive = [root, x, y, d];
      return {
        kind: 'output',
        code: `${inc('iostream')}${cls(root)}\n${cls(x, root, vx)}\n${cls(y, root, vy)}\nstruct ${d} : ${x}, ${y} {\n    ${d}() { std::cout << "${d} "; }\n${dtors ? `    ~${d}() { std::cout << "~${d} "; }\n` : ''}};\n\nint main() {\n    { ${d} obj; }\n    std::cout << "${NL}";\n}\n`,
        expected: exp.join(' '),
        wrong: [dtors ? [...naive, ...[...naive].reverse().map((s) => '~' + s)].join(' ') : naive.join(' '), dtors ? [...seq, ...seq.map((s) => '~' + s)].join(' ') : [...seq].reverse().join(' '), dtors ? [...seq.slice(0, -1), ...rev].join(' ') : [root, x, root, y, d].join(' ')],
        explain: 'Virtual base subobjects are constructed first, once, by the most-derived class. Then the direct bases are constructed in declaration order; every NON-virtual inheritance path gets its own copy of the shared base, constructed right before the class that derives from it. Destruction runs in exactly the reverse order.',
      };
    },
  },
  // ---------------------------------------------------------------------------
  {
    id: 'dynamic-cast-typeid', topic: 'dynamic_cast & typeid on a hierarchy', minStd: '98',
    build(R) {
      const parent = { Animal: null, Dog: 'Animal', Cat: 'Animal', Puppy: 'Dog' };
      const isa = (t, anc) => { for (let c = t; c; c = parent[c]) if (c === anc) return true; return false; };
      const obj = R.pick(['Animal', 'Dog', 'Cat', 'Puppy']);
      const checks = R.sample([
        ['dynamic_cast<Dog*>(p) != 0', (o) => isa(o, 'Dog')],
        ['dynamic_cast<Cat*>(p) != 0', (o) => isa(o, 'Cat')],
        ['dynamic_cast<Puppy*>(p) != 0', (o) => isa(o, 'Puppy')],
        ['dynamic_cast<Animal*>(p) != 0', (o) => isa(o, 'Animal')],
        ['typeid(*p) == typeid(Dog)', (o) => o === 'Dog'],
        ['typeid(*p) == typeid(Animal)', (o) => o === 'Animal'],
        ['typeid(*p) == typeid(Puppy)', (o) => o === 'Puppy'],
      ], 3);
      const exp = checks.map((c) => (c[1](obj) ? '1' : '0'));
      return {
        kind: 'output',
        code: `${inc('iostream', 'typeinfo')}struct Animal { virtual ~Animal() {} };\nstruct Dog : Animal {};\nstruct Cat : Animal {};\nstruct Puppy : Dog {};\n\nint main() {\n    Animal* p = new ${obj};\n    std::cout << ${checks.map((c) => `(${c[0]})`).join(' << " " << ')} << "${NL}";\n    delete p;\n}\n`,
        expected: exp.join(' '),
        wrong: [exp.map((e) => (e === '1' ? '0' : '1')).join(' '), checks.map((c) => (c[0].startsWith('typeid') ? (isa(obj, c[0].match(/typeid\((\w+)\)$/)[1]) ? '1' : '0') : (c[1](obj) ? '0' : '1'))).join(' '), exp.map((_, i) => (i === 0 ? (exp[0] === '1' ? '0' : '1') : exp[i])).join(' ')],
        explain: 'dynamic_cast<T*> succeeds when the dynamic type is T or derives from T (an is-a test), and yields a null pointer otherwise. typeid(*p) == typeid(T) is an exact-type test: a Puppy is-a Dog, but its typeid is not Dog\'s.',
      };
    },
  },
  // ---------------------------------------------------------------------------
  {
    id: 'abstract-class-compile', topic: 'Abstract classes & pure virtual functions', minStd: '98', kind: 'compile',
    build(R) {
      const base = R.pick(NAMES), der = R.pick(SUBS), fn = R.pick(['draw', 'area', 'run', 'speak', 'render']);
      const ERR = /abstract|pure virtual|undefined reference/i;
      const baseDecl = (extra = '') => `struct ${base} {\n    virtual void ${fn}() = 0;\n${extra}    virtual ~${base}() {}\n};\n\n`;
      const cases = [
        { ok: true, code: `${baseDecl()}struct ${der} : ${base} {\n    void ${fn}() {}\n};\n\nint main() {\n    ${der} x;\n    x.${fn}();\n}\n`, why: `${der} overrides every pure virtual function of ${base}, so it is a concrete class and can be instantiated.` },
        { ok: false, code: `${baseDecl()}int main() {\n    ${base} x;\n}\n`, why: `${base} has a pure virtual function, so it is an abstract class and objects of it cannot be created.` },
        { ok: false, code: `${baseDecl('    virtual void other() = 0;\n')}struct ${der} : ${base} {\n    void ${fn}() {}\n};\n\nint main() {\n    ${der} x;\n}\n`, why: `${der} overrides ${fn}() but not other(), so it is still abstract and cannot be instantiated.` },
        { ok: true, code: `${baseDecl()}struct ${der} : ${base} {\n    void ${fn}() {}\n};\n\nint main() {\n    ${base}* p = new ${der};\n    p->${fn}();\n    delete p;\n}\n`, why: `Pointers and references to an abstract class are fine; the object created is of the concrete type ${der}.` },
        { ok: false, code: `${baseDecl()}void use(${base} x) {}\n\nint main() {}\n`, why: `A by-value parameter of abstract type would need an object of the abstract class, which cannot exist.` },
        { ok: true, code: `${baseDecl()}void ${base}::${fn}() {}\n\nstruct ${der} : ${base} {\n    void ${fn}() { ${base}::${fn}(); }\n};\n\nint main() {\n    ${der} x;\n    x.${fn}();\n}\n`, why: 'A pure virtual function may still have a definition (outside the class); derived classes must override it anyway, but can call the base version explicitly.' },
        { ok: false, code: `struct ${base} {\n    virtual ~${base}() = 0;\n};\n\nstruct ${der} : ${base} {};\n\nint main() {\n    ${der} x;\n}\n`, why: `A pure virtual destructor must still be defined: ~${der}() calls ~${base}(), which has no definition, so linking fails.` },
        { ok: true, code: `struct ${base} {\n    virtual ~${base}() = 0;\n};\n\n${base}::~${base}() {}\n\nstruct ${der} : ${base} {};\n\nint main() {\n    ${der} x;\n}\n`, why: `A pure virtual destructor makes ${base} abstract, and with its out-of-class definition the derived class is concrete and links fine.` },
        { ok: false, code: `${baseDecl()}${base} make() {\n    throw 0;\n}\n\nint main() {}\n`, why: 'A function cannot return an abstract class by value: an object of the abstract type would have to be created for the return value.' },
      ];
      const c = R.pick(cases);
      return { kind: 'compile', code: c.code, expected: c.ok ? 'ok' : 'error', errorRe: c.ok ? null : ERR, explain: c.why };
    },
  },
  // ---------------------------------------------------------------------------
  {
    id: 'inheritance-access', topic: 'Public / protected / private inheritance & access', minStd: '98', kind: 'compile',
    build(R) {
      const ERR = /inaccessible|private|protected|context/i;
      const B = `struct Base {\n    int pub;\n    Base() : pub(1), prot(2), priv(3) {}\nprotected:\n    int prot;\nprivate:\n    int priv;\n};\n\n`;
      const cases = [
        { ok: true, code: `${B}struct D : Base {};\n\nint main() {\n    D d;\n    d.pub = 5;\n}\n`, why: 'A struct inherits publicly by default, so the public member stays public in D.' },
        { ok: false, code: `${B}class D : Base {};\n\nint main() {\n    D d;\n    d.pub = 5;\n}\n`, why: 'A class inherits privately by default, so Base\'s public members become private members of D and are inaccessible from main.' },
        { ok: false, code: `${B}struct D : Base {};\n\nint main() {\n    D d;\n    d.prot = 5;\n}\n`, why: 'A protected member is accessible inside D and its derived classes, but not from non-member code such as main.' },
        { ok: true, code: `${B}struct D : Base {\n    int get() { return prot; }\n};\n\nint main() {\n    D d;\n    return d.get() == 2 ? 0 : 1;\n}\n`, why: 'Derived classes may access protected members of their base.' },
        { ok: false, code: `${B}struct D : Base {\n    int get() { return priv; }\n};\n\nint main() {\n    D d;\n    d.get();\n}\n`, why: 'Private members of Base are not accessible from derived classes (only from Base and its friends).' },
        { ok: false, code: `${B}struct D : private Base {};\n\nint main() {\n    D d;\n    Base* p = &d;\n    (void)p;\n}\n`, why: 'With private inheritance the conversion D* -> Base* is only allowed inside D (and its friends); in main the base class is inaccessible.' },
        { ok: false, code: `${B}struct D : protected Base {};\n\nint main() {\n    D d;\n    Base& r = d;\n    (void)r;\n}\n`, why: 'With protected inheritance the derived-to-base conversion is only available to D, its friends and classes derived from D, not to main.' },
        { ok: true, code: `${B}struct D : public Base {};\n\nint main() {\n    D d;\n    Base* p = &d;\n    return p->pub == 1 ? 0 : 1;\n}\n`, why: 'Public inheritance models "is-a": a D* converts implicitly to Base*, and public members stay public.' },
        { ok: true, code: `${B}struct D : private Base {\n    using Base::pub;\n};\n\nint main() {\n    D d;\n    d.pub = 5;\n}\n`, why: 'A using-declaration in D re-exposes the (otherwise private-by-inheritance) member with the access level of the using-declaration, which is public here.' },
        { ok: false, code: `${B}struct D : private Base {};\nstruct E : D {\n    int get() { return pub; }\n};\n\nint main() {\n    E e;\n    e.get();\n}\n`, why: 'D inherits Base privately, so Base\'s members are private in D and inaccessible to E, even the public ones.' },
        { ok: true, code: `${B}struct D : protected Base {};\nstruct E : D {\n    int get() { return pub + prot; }\n};\n\nint main() {\n    E e;\n    return e.get() == 3 ? 0 : 1;\n}\n`, why: 'Protected inheritance makes Base\'s public and protected members protected in D, which classes derived from D (like E) can still use.' },
      ];
      const c = R.pick(cases);
      return { kind: 'compile', code: c.code, expected: c.ok ? 'ok' : 'error', errorRe: c.ok ? null : ERR, explain: c.why };
    },
  },
  // ---------------------------------------------------------------------------
  {
    id: 'final-compile', topic: 'final classes & final virtual functions', minStd: '11', kind: 'compile',
    build(R) {
      const ERR = /final/i;
      const cases = [
        { ok: true, code: 'struct Base {\n    virtual void f() {}\n    virtual ~Base() {}\n};\n\nstruct Derived final : Base {\n    void f() override {}\n};\n\nint main() {\n    Derived d;\n    d.f();\n}\n', why: 'A final class can be instantiated and can itself derive from other classes; it just cannot be a base.' },
        { ok: false, code: 'struct Base final {\n    virtual void f() {}\n};\n\nstruct Derived : Base {};\n\nint main() {}\n', why: 'Base is declared final, so no class may derive from it.' },
        { ok: false, code: 'struct Base {\n    virtual void f() final {}\n    virtual ~Base() {}\n};\n\nstruct Derived : Base {\n    void f() override {}\n};\n\nint main() {}\n', why: 'Base::f is final, so Derived cannot override it.' },
        { ok: true, code: 'struct Base {\n    virtual void f() {}\n    virtual void g() {}\n    virtual ~Base() {}\n};\n\nstruct Mid : Base {\n    void f() override final {}\n};\n\nstruct Derived : Mid {\n    void g() override {}\n};\n\nint main() {\n    Derived d;\n    d.f();\n    d.g();\n}\n', why: 'Mid::f is final, but Derived only overrides g(), which is still allowed.' },
        { ok: false, code: 'struct Base {\n    void f() final {}\n};\n\nint main() {}\n', why: '`final` can only be applied to a virtual function; f() is not virtual here.' },
        { ok: false, code: 'struct Base {\n    virtual void f() {}\n    virtual ~Base() {}\n};\n\nstruct Mid : Base {\n    void f() final {}\n};\n\nstruct Derived : Mid {\n    void f() override {}\n};\n\nint main() {}\n', why: 'Mid::f is final (it implicitly overrides Base::f), so Derived cannot override it again.' },
        { ok: true, code: 'struct Base final {\n    int x = 1;\n};\n\nint main() {\n    Base b;\n    return b.x == 1 ? 0 : 1;\n}\n', why: 'final only prevents deriving from the class; it can be used like any other class.' },
      ];
      const c = R.pick(cases);
      return { kind: 'compile', code: c.code, expected: c.ok ? 'ok' : 'error', errorRe: c.ok ? null : ERR, explain: c.why };
    },
  },
  // ---------------------------------------------------------------------------
  {
    id: 'static-member-inheritance', topic: 'Static members shared across a hierarchy', minStd: '98',
    build(R) {
      let outer = 1; // Base a;
      const ops = [];
      let haveD = false, inner = 0;
      const nOps = R.int(3, 5);
      for (let i = 0; i < nOps; i++) {
        const choices = ['base', 'derived', 'tmp', 'newdel'];
        if (haveD) choices.push('copyD', 'slice');
        const o = R.pick(choices);
        const id = i;
        if (o === 'base') { ops.push(`        Base b${id};`); inner++; }
        else if (o === 'derived') { ops.push(`        Derived d${id};`); inner++; if (!haveD) haveD = id; }
        else if (o === 'tmp') { ops.push('        Derived();'); }
        else if (o === 'newdel') { ops.push('        delete new Derived;'); }
        else if (o === 'copyD') { ops.push(`        Derived c${id} = d${haveD};`); inner++; }
        else { ops.push(`        Base s${id} = d${haveD};`); inner++; }
      }
      const tail = R.chance(0.5);
      return {
        kind: 'output',
        code: `${inc('iostream')}struct Base {\n    static int n;\n    Base() { ++n; }\n    Base(const Base&) { ++n; }\n    virtual ~Base() { --n; }\n};\n\nint Base::n = 0;\n\nstruct Derived : Base {};\n\nint main() {\n    Base a;\n    {\n${ops.join('\n')}\n        std::cout << Base::n << " ";\n    }\n    std::cout << Base::n << "${NL}";\n}\n`,
        expected: `${outer + inner} ${outer}`,
        wrong: [`${outer + inner + 1} ${outer}`, `${outer + inner} ${outer + inner}`, `${outer + inner - 1} ${outer - 1 < 1 ? 0 : outer}`],
        explain: 'Base::n is one static counter shared by Base and every class derived from it. Every constructor of a Derived runs a Base constructor (the implicit copy constructor of Derived calls Base\'s copy constructor, so copies and slices are counted too); temporaries and delete-d objects are balanced by the destructor. Objects declared in the inner block are destroyed when it ends.',
      };
    },
  },
];
