---
publishedAt: 2026-10-28
topicId: isg
seriesLabel: FLOW · Part 3 | Post 3A of N
excerpt: How FLOW separates the test architect's ownership of legal instruction streams from the test writer's intent, using rules, shared setup, and test files.
---
FLOW Language Series · Post 3A of N

# Roles, Responsibilities and the .flow File

CPU Verification·ISG·Test Architecture·\~6 min read

FLOW gives every person on a verification team a clearly bounded job. The architect owns what is legal; the test writer owns what to test. This post maps those roles to files — and shows how a shared *common.flow* keeps every test stream clean and non-repetitive.

![The architect owns legality in mycore.rules, the test writer owns intent in testN.flow, and common.flow sits between them as shared setup](/images/blogposts/flow-roles-three-layers.svg)

> **Note on grammar and syntax.** The FLOW grammar has not been formally published yet. All code-like examples in this post are **illustrative pseudo-code** — they express ideas and structure in words and concept-level notation, not final syntax. Exact keywords, operators and grammar rules will be covered in a dedicated post later in this series.

## Who Writes What

Three files carry the entire FLOW workflow. The split is deliberate: legality, shared setup, and test intent live in separate, independently maintainable layers — each owned by a specific role.

![Layer stack: test files import common.flow, which imports mycore.rules. FLOW reads each file once.](/images/blogposts/flow-file-stack.svg)

| Artefact | Owner | What it contains |
| --- | --- | --- |
| mycore.rules | Architect | Legal pools, address regions, reserved registers, alignment and locking rules |
| common.flow | Architect or Writer | Shared pools, default operand bindings, init state, before/after hooks, reusable scenes |
| test1.flow … testN.flow | Test Writer | One test case per file — directed instructions, constrained-random draws, mix targets, assertions |

### The Test Architect

The architect owns the *.rules* file. It encodes everything that must always be true regardless of which test runs: which registers are general-purpose, which address regions are writable, what alignment instructions require, and which combinations are architecturally forbidden. These rules are published once and enforced by FLOW at generation time — a directed instruction that breaks a rule is an error, not a silent redraw.

The architect may also seed *common.flow*, or at minimum review it. On small teams the test writer creates it themselves. Either way it is a shared project artefact, not owned by any single test.

### The Test Writer

The test writer starts from a test-case list. Each scenario on that list becomes its own *.flow* file. The job is: import *common.flow*, write the instructions and assertions for that scenario, and stop. No legality re-statement, no copying of init blocks already in *common.flow*.

### Relaxing and Overriding Architectural Rules

A test writer normally operates entirely inside the rules the architect has set. But some test cases exist precisely to probe *near*-the-boundary behaviour — a scenario that is mostly legal, just with one constraint deliberately loosened. FLOW gives test writers two scoped mechanisms for this: one to **relax** a named rule (widen it temporarily without removing it), and one to **override** a named rule with an alternative definition for that test's duration.

![Locked rules can never be changed. Relaxable rules can be loosened inside one test block, then revert when the block ends.](/images/blogposts/flow-rule-scope.svg)

Both mechanisms are **scope-local** — they evaporate at the end of the block or test where they are used. The *.rules* file is never touched.

The architect retains control over which rules can be weakened. Any rule marked as **locked** in the *.rules* file is immune — it cannot be relaxed or overridden by anyone. This keeps safety-critical constraints (reserved registers, ROM write-protection) permanently in force while giving test writers flexibility on structural constraints like alignment requirements or frequency limits.

> **Discipline required.** Every use of a relaxation or override must be documented in the test-case list and reviewed by the architect. These mechanisms are never used in *common.flow* — a constraint change that should apply to all tests belongs back in the *.rules* file, not silently embedded in a shared helper.

## What Goes in common.flow

A *.flow* file with no test blocks is perfectly valid — it is just a library of shared definitions. *common.flow* holds exactly the constructs every test needs but no single test should own:

![The five things common.flow holds: pools, default bindings, initial state, hooks, scenes](/images/blogposts/flow-common-flow-contents.svg)

- **Pools** — named, weighted sets of registers, address ranges, or instruction mixes that every test draws from.
- **Default operand bindings** — which pool fills each operand kind automatically, so test writers do not repeat it per test.
- **Initial memory and register state** — the known starting values all tests share. FLOW tracks this state internally to validate assertions later.
- **Universal prologue and epilogue hooks** — stack-pointer setup before every test, a halt instruction after every test.
- **Scenes** — reusable, parameterised stream fragments: a memory copy, a function-call scaffold, a store-buffer flush.

The pseudo-code below shows the shape of a *common.flow* file. It is not final syntax — exact grammar comes in a later post.

**common.flow — concept sketch**

```text
# Pull in the architect's rules and name the target ISA
import rules "rules/mycore.rules"
target isa mycore

# ── Register and address pools ──────────────────────────────────
pool general_registers : registers { r1..r10 high-weight, r11..r20 lower-weight }
pool low_registers     : registers { r1..r5 }
pool hot_memory        : addresses { 0x2000..0x20FF high-weight, 0x2100..0x21FF lower }
pool instruction_mix   : instructions {
    LOAD weight-4   STORE weight-3   MOVE weight-4   ADD weight-3   BRANCH weight-1
}

# ── Default operand bindings ─────────────────────────────────────
defaults {
    register-operand → general_registers
    address-operand  → hot_memory
}

# ── Shared starting state ────────────────────────────────────────
initialise memory {
    0x2000..0x20FF = counting pattern, 4-byte words
    0x2100..0x21FF = fill 0xA5
    0x3000..0x30FF = undefined      # reading this region is an error
}
initialise registers {
    r1 = 0x2000
    r2..r5 = constrained-random from general_registers
}

# ── Universal prologue / epilogue ─────────────────────────────────
before every test { set stack pointer to 0x7FF0 }
after every test  { emit HALT }

# ── Shared reusable scene ─────────────────────────────────────────
scene memory_copy( word_count: integer, source: address, destination: address ) {
    setup { point r1 at source; point r3 at destination }
    repeat word_count times {
        load word from [r1] into r2
        store r2 into [r3]
        advance r1 by 4; advance r3 by 4
    }
    assert destination region equals source region
}
```

> **One import line.** A test file brings all of the above in with a single *import shared "common.flow"* statement. FLOW reads each file exactly once, regardless of how many test files list it.

## The Test-Stream File Structure

Each *testN.flow* is compact by design. It declares what it imports, names the target ISA, and contains one or more test blocks — each targeting one item on the test-case list.

**test1.flow — concept sketch (directed load with assertion)**

```text
import rules  "rules/mycore.rules"
import shared "common.flow"
target isa mycore
seed 7
strict mode                         # turn all warnings into errors

constant base_address = 0x2000

test load_word {
    move r1 ← base_address
    load r2 ← memory[base_address]
    assert r2 == 0                  # counting pattern in common.flow puts 0 at base+0
}
```

> **Assertions are computed, not written by hand.** The expected value comes from FLOW's internal model of register and memory state. If a register has no known value at that point, FLOW reports a state error rather than silently skipping the assertion.

## Project File Layout

The three-file split maps cleanly to a directory layout. Adding a new test case means one new *.flow* file — nothing else changes.

```text
project/
├── rules/
│   └── mycore.rules        # architect → legal pools, arch rules
│
├── flow/
│   ├── common.flow         # architect or writer → shared setup
│   │
│   ├── test1.flow          # writer → directed load/store scenario
│   ├── test2.flow          # writer → branch prediction stress
│   ├── test3.flow          # writer → store-buffer pressure
│   └── testN.flow          # writer → one file per test case
│
└── build-script            # invokes FLOW compiler on all test files
```

## Rules of Thumb

![Five rules of thumb for organising FLOW files](/images/blogposts/flow-rules-of-thumb.svg)

1. **One test case, one file.** Each *testN.flow* maps to one item on the test-case list. Keep files short and focused — a file that covers three unrelated scenarios is harder to debug and harder to name.
2. **Put shared things in common.flow.** Pools, default bindings, init state, hooks, and scenes. If two test files would repeat something, it belongs there. If three test files need it, it definitely belongs there.
3. **Do not repeat legality.** If two tests need the same restriction, ask the architect to add a rule to the *.rules* file — do not re-implement it inside *common.flow*.
4. **Use strict mode in every production test file.** Turns warnings into hard errors. Nothing slips through quietly in CI.
5. **Use rule relaxations and overrides sparingly.** They exist for boundary tests, not everyday use. Document every instance in the test-case list and get architect sign-off. Never put them in *common.flow*.

## What's Next

Post 3B picks up from here and walks through the full directed-to-constrained-random arc: how to surround a directed scenario with constrained-random traffic, how to shape the instruction mix toward a stress point, how to confine random draws to a hot memory region, and how to run the same test many times across different seeds. It also covers the diagnostic codes FLOW emits when generation hits a problem.

← Previous [Post 2: The Test Architect and the Rules File](#)

Next → [Post 3B: From Directed to Constrained Random](#)
