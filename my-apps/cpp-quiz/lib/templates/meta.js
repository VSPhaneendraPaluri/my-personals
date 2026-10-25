// Explicit per-template metadata (item 3 & 4 of question-quality-improvements.md).
//   id: [domains, difficulty, reference-path]
//   domains     one or more of: lifetime move classes templates constexpr types expressions stl lambdas exceptions
//   difficulty  1 beginner, 2 intermediate, 3 advanced, or [lo, hi] when the template's variants span levels
//               (a variant can then set `difficulty` on the question object it returns)
//   reference   path under https://en.cppreference.com/w/cpp/
// lib/templates/index.js refuses to load if a template has no entry here.
const CPPREF = 'https://en.cppreference.com/w/cpp/';

const META = {
  // ── C++98 core ──────────────────────────────────────────────────────────────
  'int-div-mod':               [['expressions'], 1, 'language/operator_arithmetic'],
  'incr-semantics':            [['expressions'], 1, 'language/operator_incdec'],
  'sizeof-array':              [['types'], 1, 'language/sizeof'],
  'precedence':                [['expressions'], 1, 'language/operator_precedence'],
  'uchar-wrap':                [['types'], 1, 'language/implicit_conversion', {ub:true}],
  'ctor-dtor-order':           [['classes', 'lifetime'], 2, 'language/initializer_list'],
  'virtual-dispatch':          [['classes'], 1, 'language/virtual'],
  'pass-by':                   [['types'], 1, 'language/reference'],
  'switch-fallthrough':        [['expressions'], 1, 'language/switch'],
  'string-ops':                [['stl'], 1, 'string/basic_string'],
  'static-local':              [['lifetime'], 2, 'language/storage_duration'],
  'ptr-arith':                 [['types'], 2, 'language/operator_arithmetic', {ub:true}],
  'struct-padding':            [['types'], 2, 'language/object', {ub:true}],
  'trigraphs':                 [['types'], 3, 'language/operator_alternative', {ub:true}],
  'override-compile':          [['classes'], 2, 'language/override', {ub:true}],
  // ── C++11 ───────────────────────────────────────────────────────────────────
  'lambda-capture':            [['lambdas'], 2, 'language/lambda'],
  'range-for-ref':             [['stl'], 1, 'language/range-for'],
  'unique-ptr-move':           [['lifetime', 'move'], 2, 'memory/unique_ptr'],
  'enum-class-values':         [['types'], 1, 'language/enum'],
  'nullptr-overload':          [['types', 'expressions'], 2, 'language/nullptr'],
  'constexpr-calc':            [['constexpr'], 2, 'language/constexpr'],
  'shared-ptr-count':          [['lifetime'], [2, 3], 'memory/shared_ptr'],
  'sort-lambda':               [['stl', 'lambdas'], 1, 'algorithm/sort'],
  'sizeof-types':              [['types'], 2, 'language/types'],
  'copy-vs-move':              [['move', 'lifetime'], [2, 3], 'language/move_constructor'],
  'brace-init-trap':           [['stl', 'types'], 2, 'language/list_initialization'],
  'delegating-ctor':           [['classes'], 2, 'language/initializer_list'],
  'static-assert-constexpr-loop': [['constexpr'], 2, 'language/constexpr'],
  // ── C++14 ───────────────────────────────────────────────────────────────────
  'generic-lambda':            [['lambdas', 'templates'], 2, 'language/lambda'],
  'decltype-auto':             [['types'], 3, 'language/decltype'],
  'binary-literals':           [['types'], 1, 'language/integer_literal'],
  'exchange':                  [['move', 'stl'], 2, 'utility/exchange'],
  'init-capture':              [['lambdas'], 2, 'language/lambda'],
  'make-unique-parens':        [['lifetime', 'stl'], 2, 'memory/unique_ptr/make_unique'],
  'auto-return-compile':       [['types', 'templates'], [2, 3], 'language/auto'],
  'tuple-get-type':            [['stl', 'templates'], 2, 'utility/tuple/get'],
  // ── C++17 ───────────────────────────────────────────────────────────────────
  'structured-binding-map':    [['stl'], 2, 'language/structured_binding'],
  'structured-binding-copy':   [['types', 'stl'], 2, 'language/structured_binding'],
  'set-insert-init':           [['stl'], 2, 'language/if'],
  'fold-expression':           [['templates'], 3, 'language/fold'],
  'optional-basic':            [['stl'], 2, 'utility/optional'],
  'if-constexpr-kind':         [['templates', 'constexpr'], 3, 'language/if'],
  'variant-index':             [['stl'], 3, 'utility/variant'],
  'string-view':               [['stl'], 2, 'string/basic_string_view'],
  'gcd-clamp':                 [['stl'], 1, 'numeric/gcd'],
  'eval-order-17':             [['expressions'], 3, 'language/eval_order'],
  'cpp17-elision-ctad-compile': [['classes', 'templates'], 3, 'language/copy_elision'],
  'removed-in-17':             [['types'], 3, '17'],
  'feature-availability':      [['types'], 2, 'compiler_support'],
  // ── polymorphism & inheritance (tpoly.js) ───────────────────────────────────
  'slicing':                   [['classes'], 2, 'language/derived_class'],
  'virtual-dtor-chain':        [['classes', 'lifetime'], 2, 'language/destructor'],
  'virtual-in-ctor':           [['classes'], 3, 'language/virtual'],
  'default-arg-virtual':       [['classes'], 3, 'language/default_arguments'],
  'name-hiding':               [['classes'], 2, 'language/using_declaration'],
  'diamond-ctor-order':        [['classes'], 3, 'language/derived_class'],
  'dynamic-cast-typeid':       [['classes'], 2, 'language/dynamic_cast'],
  'abstract-class-compile':    [['classes'], 2, 'language/abstract_class'],
  'inheritance-access':        [['classes'], 2, 'language/access'],
  'final-compile':             [['classes'], 2, 'language/final'],
  'static-member-inheritance': [['classes'], 2, 'language/static'],
  // ── overloading & operators (toverload.js) ──────────────────────────────────
  'overload-resolution':       [['expressions'], [2, 3], 'language/overload_resolution'],
  'overload-compile':          [['expressions'], 2, 'language/overload_resolution'],
  'override-overload-mix':     [['classes', 'expressions'], 3, 'language/override'],
  'operator-incr-overload':    [['expressions', 'classes'], 2, 'language/operators'],
  'operator-overload-compile': [['expressions', 'classes'], 2, 'language/operators'],
  // ── strings (tstr.js) ───────────────────────────────────────────────────────
  'cstr-sizeof-strlen':        [['types', 'stl'], [1, 2], 'string/byte/strlen'],
  'cstr-functions':            [['stl'], 2, 'string/byte'],
  'char-expressions':          [['types'], 1, 'language/character_literal'],
  'string-ctors':              [['stl'], 1, 'string/basic_string/basic_string'],
  'string-find':               [['stl'], 1, 'string/basic_string/find'],
  'string-modify':             [['stl'], 1, 'string/basic_string'],
  'string-compare':            [['stl'], 1, 'string/basic_string/compare'],
  'string-equality-identity':  [['stl', 'types'], 2, 'string/basic_string/operator_cmp'],
  'string-concat-compile':     [['stl'], 1, 'string/basic_string'],
  'string-conversions':        [['stl'], 2, 'string/basic_string/stol'],
  // ── exceptions, conversions, linkage/ODR, template specialisation, temporaries ──
  'exception-unwind-order':    [['exceptions', 'lifetime'], 2, 'language/throw'],
  'exception-catch-matching':  [['exceptions'], 2, 'language/try_catch'],
  'exception-ctor-throw':      [['exceptions', 'classes', 'lifetime'], 3, 'language/try_catch'],
  'vector-erase-patterns':     [['stl'], 2, 'algorithm/remove'],
  'integer-conversion-traps':  [['types'], 2, 'language/implicit_conversion', {ub:true}],
  'short-circuit-eval':        [['expressions'], 1, 'language/operator_logical'],
  'linkage-odr-compile':       [['types'], 3, 'language/definition', {ub:true}],
  'specialization-vs-overload': [['templates'], 3, 'language/template_specialization'],
  'template-deduction-overloads': [['templates'], 3, 'language/function_template'],
  'temporary-lifetime':        [['lifetime'], 2, 'language/lifetime'],
  // ── time-machine (adapters/time-machine.js) ────────────────────────────────
  'tm-auto-storage-vs-deduction':  [['types'], 2, 'keyword/auto'],
  'tm-auto-int-storage-class':     [['types'], 2, 'keyword/auto'],
  'tm-closing-angle-brackets':     [['templates'], 1, 'language/template_argument_deduction'],
  'tm-constexpr-loop':             [['constexpr'], 2, 'language/constexpr'],
  'tm-guaranteed-copy-elision':    [['lifetime', 'classes'], 2, 'language/copy_elision'],
  'tm-static-assert-no-msg':       [['constexpr'], 1, 'language/static_assert'],
  'tm-removed-bool-increment':     [['types'], 1, 'language/operator_incdec'],
  'tm-dynamic-exception-spec':     [['exceptions'], 2, 'language/except_spec'],
};

const DOMAINS = ['lifetime', 'move', 'classes', 'templates', 'constexpr', 'types', 'expressions', 'stl', 'lambdas', 'exceptions'];

// Attach `domains`, `difficulty` ([lo,hi]) and `reference` to every template, validating as we go.
function apply(templates) {
  for (const t of templates) {
    const m = META[t.id];
    if (!m) throw new Error(`template "${t.id}" has no entry in lib/templates/meta.js`);
    const [domains, diff, ref, flags = {}] = m;
    if (!domains.length || domains.some((d) => !DOMAINS.includes(d))) throw new Error(`template "${t.id}": bad domains ${domains}`);
    const range = Array.isArray(diff) ? diff : [diff, diff];
    if (range.some((d) => ![1, 2, 3].includes(d)) || range[0] > range[1]) throw new Error(`template "${t.id}": bad difficulty ${diff}`);
    t.domains = domains;
    t.diffRange = range;
    t.difficulty = Math.round((range[0] + range[1]) / 2);
    t.reference = CPPREF + ref;
    t.ub = !!flags.ub;
  }
  for (const id of Object.keys(META)) if (!templates.some((t) => t.id === id)) throw new Error(`meta.js has an entry for unknown template "${id}"`);
  return templates;
}

module.exports = { META, DOMAINS, apply };
