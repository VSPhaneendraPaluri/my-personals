---
publishedAt: 2026-10-17
topicId: isg
seriesLabel: FLOW · Part 3 | Language Guide 1 of N
excerpt: An introduction to FLOW's two small languages for separating architectural legality from test intent.
linkedinUrl: https://lnkd.in/gtgPMNgG
linkedinType: post
---

# Two Small Files, One Grammar: An Introduction to FLOW's Languages

FLOW series, Part 3; Language Guide, post 1 of N. FLOW is a constrained-random and directed instruction stream generator for CPU verification.

If you have ever written CPU tests, you know the tension. Somebody has to say what a *legal* program looks like: no stores to ROM, aligned accesses, no privileged instructions in user mode. Somebody else has to say what a *useful* program looks like: lots of stores, a few branches, a copy loop, a deliberately nasty corner. When both live in the same script, every test writer re-learns the architecture, and every architecture fix has to be chased through hundreds of tests.

FLOW answers this with two small, separate languages: **`.rules`** and **`.flow`**. This post introduces both, shows a complete working project, and explains the ideas that keep the languages simple. Future posts may explore parts of the languages in more depth as the guide develops.

**Who this is for.** Test architects who turn a specification into constraints, test writers who build test content, and anyone who reviews or maintains tests. You need no knowledge of grammars or of how FLOW works inside. If you can read a short script, you can read these files.

---

## Who Writes What

FLOW divides the work between three roles, each with its own place to write.

| Who | Decides | Writes |
| --- | --- | --- |
| ISA description | instruction syntax, encodings, operand kinds | the ISA description |
| Test architect | what is legal under the architecture | `*.rules` |
| Test writer | what a test should generate | `*.flow` |

A useful comparison is a building: the ISA description supplies the materials, the architect writes the building code, and the test writer draws the blueprint. The blueprint can be as adventurous as it likes, but it is checked against the code.

![The architect's .rules file defines legality, the test writer's .flow file describes intent, and FLOW combines both to produce a legal instruction stream.](/images/blogposts/flow-language-files.png)

The separation pays off in four ways:

1. **Ownership.** The architect owns legality; the test writer owns intent. Each can change a file without reading the other's.
2. **A single source of truth.** When the specification changes, one rule changes and every test that imports it follows.
3. **Honest exceptions.** A test that must break a rule says so by name, and the report records it. A rule the architect marks `lock` cannot be broken at all.
4. **Reuse.** Rules, pools and scenes sit in shared files that every test imports, so a new test is often ten lines.

## Directed and Constrained-Random Instructions

FLOW has two styles of writing a stream, and a good test usually mixes them.

- **Directed**: you write the exact instructions you want, such as `MOV r1, 0x1000`. What you write is what you get.
- **Constrained random**: you name a pool of instructions and a count, and FLOW draws from it at random, always within the limits set by pool weights, `mix` targets and the architect's rules. The statement for this is `crand` (constrained random).

Every random draw in FLOW is constrained, so there is no plain `random` statement. Directed code gives you precision, constrained random gives you coverage, and the two compose in the same test.

![Directed instructions specify exact operations, while constrained-random instructions draw from a pool; FLOW combines both styles in one test.](/images/blogposts/flow-directed-random.png)

## A Complete Starter Project

The smallest useful project has three files and a folder layout like this:

```
project/
├── rules/
│   └── mycore.rules      # the architect's file
├── common.flow           # shared pools, scenes and defaults
└── tests/
    └── smoke.flow        # one or more tests
```

### The Architect's File: `mycore.rules`

```
# rules/mycore.rules
isa mycore

pool gpr    : reg  { r1..r29 }
pool code   : addr { 0x0000..0x0FFF }
pool ram    : addr { 0x2000..0x7FFF }
pool rom    : addr { 0x8000..0x8FFF }
pool memops : instr { LD, ST }

reserve r30, r31                       # private to FLOW: check scratch, loop counters

forbid  LD r0, [r0]                    as no_r0_self_load
forbid  ST [<code>]                    as no_code_write    lock
forbid  ST [<rom>]                     as no_rom_write     lock
require aligned(4) for <memops>        as word_align
```

Read it top to bottom. The pools name the registers and address regions. `reserve` keeps two registers for FLOW's own use. The `forbid` and `require` lines are the legality rules; `as` names a rule so it can be reported or relaxed, and `lock` makes it unbreakable. The `code` pool is where generated instructions are placed, so one `forbid` stops random stores from overwriting the program.

### Shared Definitions: `common.flow`

```
# common.flow
const base = 0x2000

pool consts   : imm   { 0 @1;  -1 @1;  any @8 }
pool ops      : instr { LD @4;  ST @3;  ADD @3;  MOV @3 }
pool branches : instr { BEQ, BNE }
pool mixed    : instr { ops @8;  branches @2 }
pool hot_ram  : addr  { 0x2000..0x20FF }
pool gpr_low  : reg   { r1..r3 }

defaults {                             # which pool fills which operand kind
  reg    = gpr
  addr   = ram
  imm    = consts
  LD.dst = gpr_low
}

init memory { 0x2000..0x20FF = counting(4) }    # known data to load from

before each test { MOV sp, 0x7FF0 }
after  each test { HALT }

scene flush { NOP; NOP; NOP }

scene memcopy(words: int, src: addr, dst: addr) {
  before { MOV r1, src;  MOV r3, dst }
  loop words {
    LD  r2, [r1]
    ST  r2, [r3]
    ADD r1, r1, 4
    ADD r3, r3, 4
  }
  check [dst]:words*4 == [src]:words*4          # compare words * 4 bytes
}

scene stress_stores {
  mix { ST >= 70% }
  with addr = hot_ram {
    crand 200 ops
  }
}
```

This file is the test writer's toolbox: weighted pools, defaults for operands, starting memory, hooks that wrap every test, and reusable scenes.

### A First Test: `smoke.flow`

```
# tests/smoke.flow
use "rules/mycore.rules"
use "common.flow"
isa mycore
seed 7

mix { ST >= 20% }                      # a target for the instruction mix

test smoke {
  MOV r1, base                         # directed: exactly this instruction
  check r1 == base                     # expected value computed for you
  crand 200 ops                        # 200 weighted constrained-random instructions
}
```

The first two lines of the body are directed. The last line is constrained random: 200 instructions drawn from `ops`, with `LD` favoured over `ST` and `ADD`, steered toward the 20 percent store target, and kept inside the architect's rules.

### Running the Tool

```
flow run tests/smoke.flow                          # every test in the file
flow run tests/smoke.flow --test smoke --seed 42   # one test, another seed
flow check tests/                                  # parse and check only
```

The commands above are the intended shape of the tool. A run produces a stream, with each instruction tagged with the test, scene and line that produced it, and a report. Post 5 covers both.

## Design Choices That Keep the Languages Simple

A few decisions keep both languages easy to read and write. They come up in every file.

| Choice | Why |
| --- | --- |
| `crand` instead of a plain `random` | every draw is constrained, and the name says so (in SystemVerilog `randc` means cyclic; here `crand` means constrained random) |
| Weights are always trailing and relative: `item @3` | one way to weight, never confused with the percentages used only in `mix`; `@` cannot clash with register names such as `x1` |
| `kind = pool` is the only binding form: `with addr = hot_ram` | the same rule in `defaults`, `with` and `init` |
| A set is a pool, and a mnemonic is a pool of one | no separate concept of an instruction class |
| `repeat` makes independent copies, `loop` is a real loop | no surprise about whether draws repeat |
| Plain verbs: `crand`, `choose`, `interleave`, `check` | the keyword says what it does |
| Visible placeholders: `<reg>`, `<any>` | easy to see what FLOW will fill |
| One shape per family: `verb subject [when condition] [as name] [lock]` | once you have written one rule you can write the next |

Both files also share the same lexical rules, expressions, pools and weights, so an architect and a test writer read each other's files without learning anything new.

## What May Come Next

This is the first post in an evolving language guide. Future posts may take a closer look at FLOW's ideas and features, but their topics and sequence are still open. Each post will stand on its own.

| Post | Read it if you... |
| --- | --- |
| 2. Writing the Rulebook: The `.rules` File | are a test architect |
| 3. Writing Tests: The `.flow` File, From Directed to Random | write tests |
| 4. Composing Scenarios: Loops, Choices, Interleaving and Branches | need structure and stress in your tests |
| 5. What FLOW Promises, and What It Tells You | want to trust and debug a run |
| 6. The Grammar Behind FLOW | build tools, or are curious why the languages look this way |
| Cheat sheet | want everything on one page |

Suggested paths: architects read 1, 2, 5. Test writers read 1, 3, 4, 5. ISA and tool developers read 1, 6 and the Part 3 reference.
