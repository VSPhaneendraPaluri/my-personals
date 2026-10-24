# C++ Quiz — verified on Compiler Explorer

Endless C++ questions covering **C++98/03 through C++17**. Every question is compiled and
run on [Compiler Explorer](https://godbolt.org) before you see it.

---

## Goals (four modes)

| Goal | Who it's for | Behaviour |
|---|---|---|
| **Learn** | Beginners to intermediate | Easy-to-hard ramp, full explanation after every answer |
| **Interview Prep** | Job candidates | Interview-weighted topics (difficulty 2–3 weighted up) |
| **Language Lawyer** | Enthusiasts / experts | Compile-kind questions weighted up, `-pedantic-errors` framing |
| **UB Hunter** | Everyone | Only questions whose topic or explanation mentions UB / unspecified |

Hard rule from the design doc: **Learn** and **Interview** questions must produce the same
answer on GCC, Clang and MSVC with default flags. Anything that depends on `-pedantic-errors`
is weighted into **Language Lawyer** mode only.

---

## Standards (scope: C++98/03 → C++17)

C++98 and C++03 are one bucket (`-std=c++98`; C++03 was a bug-fix release).
C++20 and newer are **out of scope** — their question templates live in
`lib/templates/archive/` and are not loaded.

---

## Domain taxonomy (10 tags)

Used in the filter bar. Each question is tagged to one or more:

1. Lifetime, ownership and memory (RAII, smart pointers)
2. Value categories and move semantics (C++11+)
3. Classes and OOP (rule of 0/3/5, virtual, slicing)
4. Templates and generics (deduction, SFINAE, variadics)
5. Compile-time programming (`constexpr` evolution, `static_assert`)
6. Type system and conversions (`auto`, `decltype`, casts)
7. Expressions and name lookup (evaluation order, overload resolution, ADL)
8. STL containers, iterators and algorithms
9. Lambdas and callables (`std::function`, captures)
10. Concurrency and exceptions (`noexcept`, unwinding)

---

## Question formats

- **predict_output** — "What is the output of this program?" (the interview staple)
- **compiles** — "Does this compile?" (kept, mostly Language Lawyer)
- **find_bug** — pick the faulty line
- **ub_classify** — Defined / Unspecified / UB?
- **which_better** — e.g. `emplace_back` vs `push_back`
- **conceptual** — no code, e.g. "what does `virtual` change about destruction?"

---

## Time Machine questions (`lib/time-machine.js`)

Questions whose answer changes across standards teach language evolution far better
than flag trivia. See `lib/time-machine.js` for the full list with
`answers_by_standard`. Current entries:

- `auto` storage-class vs type-deduction
- `>>` closing angle brackets
- `constexpr` loop support (C++14 relaxed rules)
- Guaranteed copy elision (C++17)
- `static_assert` optional message (C++17)
- `bool` increment removal (C++17)
- Dynamic exception specs removal (C++17)

---

## Question schema (`lib/question-schema.js`)

New fields defined in the design doc; used for the static question bank and any
future `questions.json`. Validator exported from `lib/question-schema.js`.

| Field | Purpose |
|---|---|
| `id` | Stable unique ID |
| `modes` | `learn`, `interview`, `language_lawyer`, `ub_hunter`, `time_machine` |
| `format` | See formats above |
| `domains` | One or more domain tags (first is primary) |
| `feature` | Short chip label on the card |
| `difficulty` | 1–3 |
| `code` | Code snippet |
| `options` | Answer choices |
| `answers_by_standard` | Per-standard expected result |
| `explanation` | Why right; why alternatives are wrong |
| `reference` | cppreference link or ISO section |
| `flags_independent` | `true` if same answer without `-pedantic-errors` |
| `verified` | Compiler versions tested |

---

## Running locally

```
node server.js          # uses godbolt.org
VERIFY_BACKEND=local node server.js   # uses local g++
```

No npm dependencies. Requires internet for the default backend.

## Question templates

Every template in `lib/templates/` is a parametric generator (`build(R, S, ctx)`) whose
concrete question is compiled and run before it is served. 75 templates in total:

| File | Focus |
|---|---|
| `t98.js`, `t11.js`, `t14.js`, `t17.js`, `tcompile.js` | Core language by standard (arithmetic, lambdas, smart pointers, constexpr, ...) |
| `tpoly.js` | Polymorphism & inheritance: slicing, virtual destructors, virtual calls in constructors, default arguments, name hiding, diamond / virtual inheritance, `dynamic_cast` / `typeid`, abstract classes, access control, `final`, static members |
| `toverload.js` | Overload resolution ranking, ambiguity & illegal overloads, overriding vs overloading vs hiding, `operator++` prefix/postfix, operator overloading rules |
| `tstr.js` | C strings (`sizeof` vs `strlen`, `<cstring>`), char arithmetic, `std::string` constructors / find / modify / compare / conversions, `operator+` and `char*` conversion errors |

Low-variety templates (`shared-ptr-count`, `copy-vs-move`, `override-compile`,
`auto-return-compile`) were expanded with extra parametric cases (aliasing constructor,
copy/move/reset sequences, `weak_ptr::lock`, assignment vs construction, NRVO / `return
std::move`, a dozen `override` mismatches, many deduction conflicts).

## Test templates offline

```
VERIFY_BACKEND=local node test/validate-templates.js [iterations] [templateIdFilter]
```

## Deploy on Render

Push to GitHub → Render → New Blueprint (reads `render.yaml`), or New Web Service with
Build Command `echo ok`, Start Command `node server.js`.

Optional env vars: `COMPILER_ID`, `POOL_TARGET`, `GODBOLT_CONCURRENCY`.
