---
publishedAt: 2026-10-28
topicId: isg
seriesLabel: FLOW · Part 3 | Post 3B of 6
excerpt: How to grow a directed CPU verification test into constrained-random traffic, shape instruction mixes, reuse scenes, and scale testing across reproducible seeds.
---
FLOW Language Series · Post 3B of 6

# From Directed to Constrained Random

CPU Verification · Constrained Random · ISG \~7 min read

A directed test pins the exact scenario you care about. Constrained random surrounds it with varied traffic, shapes it toward a stress point, and scales it across many seeds. This post walks the full arc — from a single pinned load to a soak run — using concept-level pseudo-code. Exact grammar comes in a later post in this series.

**Grammar not yet published.** All examples in this post are **illustrative pseudo-code** — they convey ideas, intent and structure in plain words and concept-level notation. They are not final FLOW syntax. The formal grammar, with exact keywords and rules, will be introduced in a dedicated post later in this series.

## The Arc: Five Steps

Every good test starts as a directed test and grows outward. The progression is the same regardless of which scenario you are testing:

1

#### Write the exact scenario

Pin down the instructions you care about. Add an assertion so FLOW verifies correctness, not just that the stream was generated.

2

#### Add constrained-random context

Surround the directed core with constrained-random draws from an instruction pool. Varied traffic before and after stresses the pipeline without changing the outcome you are asserting.

3

#### Shape the mix and narrow the draws

Declare a distribution target — for example, stores must be at least 25 % of all drawn instructions. Confine random address draws to a hot memory region to provoke conflicts and hazards.

4

#### Promote repeating patterns to scenes

As soon as you write the same block in two test files, extract it into a scene in *common.flow*. Test files then invoke the scene by name with arguments.

5

#### Soak it

Declare a repeat count on the test block. FLOW runs it many times, each with its own reproducible seed, keeping the directed core and assertions identical across all copies.

## The Arc in Pseudo-Code

The following sketches show the same test evolving through all five steps. File names and structure are real; everything inside the test blocks is concept-level notation.

test2.flow — Step 1: directed core only

import rules "rules/mycore.rules" import shared "common.flow" target isa mycore test step1 { move r1 ← 0x2000 load r2 ← memory\[0x2000\] assert r2 == 0 # counting pattern in common.flow puts 0 at 0x2000 }

test2.flow — Step 2: add constrained-random context

test step2 { draw 50 instructions from instruction_mix pool # random traffic before move r1 ← 0x2000 load r2 ← memory\[0x2000\] assert r2 == 0 draw 100 instructions from instruction_mix pool # random traffic after }

test2.flow — Step 3: shape mix, narrow address draws

test step3 { target mix { stores >= 25%; branches \<= 5% } move r1 ← 0x2000 load r2 ← memory\[0x2000\] assert r2 == 0 draw 200 instructions from instruction_mix pool, address operands confined to hot_memory pool report mix # print achieved distribution }

test2.flow — Step 4: invoke a shared scene

test step4 { run scene memory_copy( 8 words, from 0x2000, to 0x2100 ) # defined in common.flow target mix { stores >= 20% } draw 150 instructions from instruction_mix pool, address operands confined to hot_memory pool report mix }

test2.flow — Step 5: soak run with 20 seeds

test soak ( starting seed = 100, repeat 20 times ) { run scene memory_copy( 8 words, from 0x2000, to 0x2100 ) target mix { stores >= 20% } draw 500 instructions from instruction_mix pool, address operands confined to hot_memory pool report mix } # FLOW generates: soak_copy_0 … soak_copy_19, each with its own reproducible seed

## The Key Concepts

### Constrained-Random Draws

A draw picks one instruction from a pool, one at a time, in proportion to each item's weight. An instruction is eligible for a draw only if two conditions both hold: any guard on that item is currently satisfied, *and* using it would not break any active architectural rule. Rules always win — if nothing in the pool is eligible, the draw is skipped and FLOW warns. If a draw is retried many times without finding a legal instruction, FLOW drops it and warns again. The test writer sees both in the run log.

The draw count can be fixed, a range, or expressed as "keep drawing until some condition holds, up to a maximum." A draw can also target a single instruction type rather than a pool, which is useful for forcing a specific instruction into a random stream at a chosen point.

**Rule relaxations affect eligibility.** What counts as "legal" for a draw is the full set of active rules at that point in the stream. A test writer can narrow or widen that set for a specific test by relaxing or overriding a named architectural rule — for example, temporarily permitting unaligned accesses, or widening a branch frequency limit. These adjustments are scope-local and do not affect any other test. Rules the architect has marked as locked are immune and cannot be changed by a test file under any circumstance.

### Mix Targets

A mix target states the distribution you want across the drawn instructions in a test or a narrowed block. It is a *target*, not a hard constraint — FLOW steers toward it by dynamically adjusting the effective weights of eligible items. If the target cannot be met (because rules forbid the instruction, or two targets conflict), FLOW warns and a report statement prints the achieved figure alongside the target.

Targets can be expressed as a percentage share of all drawn instructions, or as an absolute count. Both lower-bounds and upper-bounds are supported.

### Narrowing Draws to a Region

By default, random address operands are drawn from the pool named in the file's default bindings. For a specific block, the test writer can confine those draws to a tighter pool — for example, a hot 256-byte region — to provoke cache-line conflicts, store-buffer pressure, or alignment edge cases. The narrowing applies only to that block and reverts automatically when the block ends. Multiple operand kinds can be narrowed in the same block.

### Scenes — Reuse Without Copy-Paste

A scene is a named, parameterised stream fragment defined in *common.flow*. Parameters can be integers, addresses, registers or immediates. A test file invokes the scene by name, passing arguments. The scene's labels are local to each invocation — two tests can both run the same scene without label conflicts. Scenes cannot call themselves recursively.

**When to extract a scene:** as soon as you write the same instruction block in two different test files, it belongs in *common.flow* as a scene. Tests invoke it with arguments; the scene body is never duplicated.

### Hooks — Wrapping Every Test

Hooks defined in *common.flow* wrap every test in every file that imports it. The shared prologue runs first, then any test-local setup, then the test body, then test-local teardown, then the shared epilogue — in that fixed order. A test can define its own local prologue and epilogue without touching the shared ones.

### Soak Runs

A soak declaration on a test block tells FLOW to run it a given number of times, each with its own derived seed, naming the copies sequentially. The directed instructions and assertions are identical across all copies; only the constrained-random draws vary. This is the fastest path from a passing directed test to broad random coverage with a single-line change.

## Diagnostics

FLOW emits structured messages when generation encounters a problem. The table below lists the codes a test writer meets most often.

| Code | Meaning and what to do |
| --- | --- |
| E-NAME | Unknown or duplicate name — a pool or scene was referenced but never declared. Check import statements. |
| E-KIND | Pool of the wrong kind — a register pool used where an address pool is expected, for example. |
| E-RULE | A directed instruction breaks an active architectural rule, or names a reserved register. FLOW never silently adjusts directed instructions. |
| E-STATE | An assertion needs a value FLOW does not know — the register or memory location was not initialised. Add it to the init block, or move the assertion earlier. |
| W-EMPTY | A draw had nothing eligible in the pool and was skipped. Loosen a guard condition or widen the pool. |
| W-RETRY | A draw was dropped after many failed attempts to find a legal instruction. Usually an over-constrained pool or a rule that forbids most of it. |
| W-TARGET | A mix target was not met. Use the report statement to see the achieved figure; relax the target or the conflicting rule. |

**Strict mode** promotes all warnings to hard errors. Enable it in every production test file so generation failures do not pass quietly in CI. A run with warnings on a relaxed file is useful during exploration; warnings in a committed test file are not.

## What's Next

Post 4 adds structure to test bodies: ways to repeat a block a given number of times, to choose non-deterministically between alternatives, to interleave two streams, and to take data-dependent branches. These constructs let a single test file cover timing sequences, data-dependent paths, and multi-source interleavings — the scenarios that truly stress a CPU pipeline. As with this post, the grammar details will come when the formal specification is ready.

← Previous [Post 3A: Roles, Responsibilities and the .flow File](#)

Next → [Post 4: Structure — Loops, Choices and Branches](#)