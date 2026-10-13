---
publishedAt: 2026-10-11
topicId: isg
seriesLabel: FLOW · Part 1
excerpt: A hobby project on grammar-driven instruction stream generation for CPU verification, and an exploration of how test intent can live outside the generator.
---

# Teaching Grammar to Generate Instructions: Introducing FLOW

*A hobby project on grammar-driven instruction stream generation for CPU verification, and the first post in a series.*

---

Somewhere in a verification lab, a processor is running a program that no human ever wrote.

That is not a failure of process. It is the process. A CPU makes one promise, *run any legal program and produce exactly the architecturally correct result*, and no team can write enough programs to test it. So we build tools that write programs: **Instruction Stream Generators (ISGs)**. They produce long, legal, varied sequences of instructions, run them on the design and on a reference, and compare the results.

This post introduces **FLOW**, a hobby project to build a framework for those tools, driven by a grammar. It is the first in a series.

**FLOW** stands for **Framework for Instruction Orchestration & Workflows**.

## Where I am coming from

By profession, I am a virtual prototyping developer. For most of my career that has meant building SystemC/TLM2 models of processors and SoCs, so that software teams can start long before silicon exists. I have worked on processor models across several architectures, including ARMv8-M, RISC-V and Renesas RH850.

Early on, I also had a one-off stint on the verification side: I built an architecture-aware C++ generator, not just a random one, to exercise the ISA of a SPARCv8 core on RTL.

Between that stint and a career of building models that other people's test programs had to exercise, I kept running into one question on every architecture:

> *How do I tell a generator what to generate, without rewriting the generator?*

FLOW is my attempt to answer it properly, in the open.

## Why generate instruction streams at all?

- **The state space is enormous.** Registers, memory, flags, pipeline hazards, exceptions, privilege modes, interrupts. Bugs hide in the *combinations*.
- **Hand-written tests only cover what you thought of.** The bugs that escape are rarely the ones you imagined.
- **Pure random is wasteful.** A fully random stream mostly traps, jumps into the void, or touches memory that does not exist.

So a good generator lives in the middle: **constrained random**. Random enough to find the unexpected, constrained enough to stay legal and reach the scenarios you care about. It must also produce **directed** tests, where you want one precise sequence every time.

## The problem: intent buried in code

Generators tend to grow the same way:

1. Start with a clean tool for one ISA.
2. Add a knob, then another, then a config file with fifty options.
3. Add special cases in the C++ for just this one scenario.
4. Months later, a new test idea needs a code change, a rebuild and a prayer.

The root cause is that **test intent lives inside the generator**. The tool becomes a pile of scenarios instead of a way to describe them.

## The idea: give test writers a language

A test writer does not think in `if` statements and virtual functions. They think:

- "Set things up, do some random arithmetic, hammer one load/store pattern, then check."
- "Mostly ALU ops, a few branches, never touch this memory range."
- "Call a function with these arguments, in the middle of random traffic."

That is *structure*, and the classic way to describe structure is a **context-free grammar (CFG)**. A grammar gives us:

- **Composition:** big behaviours built from small named pieces.
- **Choice:** alternatives in a rule, which is exactly where randomness and weights belong.
- **Repetition and recursion:** loops, nested scenarios and call patterns come naturally.

Here is the intuition in toy form. The syntax is a draft and *will* change:

```
test      = intro  20 * step  outro
step      = alu_burst | mem_pattern | branchy
alu_burst = 4..12 * alu_op
alu_op    = add | sub | and | or | xor
```

A test is a setup, twenty steps and a teardown. Each step is one of three behaviours. An ALU burst is four to twelve ALU instructions. Nothing here knows about any particular ISA. The grammar describes *shape*; the ISA supplies the vocabulary.

## Two layers, one clean seam

The central design decision in FLOW is a hard split between two worlds.

**The ISA layer (C++).** Developers describe an architecture through hooks and callbacks: formats, fields, opcodes, encodings, legality rules, register files. Each architecture plugs in its own knowledge without touching the core.

**The test layer (the grammar).** Test writers describe *what to generate*, using the instructions and resources the ISA layer registered.

The core engine sits in between. It expands the grammar, makes the random choices, tracks resource state and hands finished instructions to an emitter.

```
  test script (grammar)  ──►  FLOW core  ◄──  ISA plugin (C++ hooks)
                                 │
                                 ▼
                      emitters (asm, binary, ...)
```

The payoff: a new ISA does not need a new generator, and a new scenario does not need a rebuild.

## Design principles

- **Pure C++.** One language for the framework, the ISA plugins and the hooks. No C/C++ mix, no glue scripts holding the core together.
- **A simple test language comes first.** If writing a test is harder than writing assembly, nobody will use it. Keywords must be memorable, and the common case should be a one-liner.
- **Architecture-aware, not just ISA-aware.** Knowing encodings is not enough. A useful generator understands registers, memory regions and other resources, so it avoids illegal or pointless streams by construction.
- **Constrained random and directed, in one language.** A pure sequence grammar suits directed tests but falls short for use-case-driven random ones. FLOW needs both, in one tool.
- **Reproducible.** The same seed and script must produce the same stream. A failure you cannot regenerate is a rumour, not a bug report.

## Concepts you will meet in this series

- **Pools:** named collections of resources such as registers, memory ranges and groups of instructions. A constraint becomes "draw from this pool".
- **Scenes:** reusable, parameterised pieces of intent, like "call a function" or "copy a block", holding directed instructions, random draws, or both.
- **Rules:** things that must always, never or at least sometimes hold across a stream.
- **Weights:** relative likelihoods that bias random choices without writing code.

Each gets its own post.

## Why I think I can take this on

A fair question: why should a virtual prototyping developer build a generator framework?

Because the ground has shifted. Deep knowledge of one area used to stop at its edge, and crossing into a neighbouring one, with its own specs, tools and vocabulary, cost months. My earlier generator took about seven to eight person-months, including supporting the CPU verification team. AI coding assistants change that arithmetic. They help me read unfamiliar material, scaffold parsers and boilerplate, and try design alternatives quickly, so my time goes into the decisions that matter.

That does not mean handing over the thinking. In verification, "looks plausible" is not good enough, so every piece of generated code must be understood, tested and, where needed, thrown away. The design judgement stays with me.

So FLOW is also an experiment: how far can domain knowledge from the modeling side, plus AI as a sparring partner, take one person into a complex area?

## What I have not explored yet

I will be upfront about the gaps. I come to this from the modeling side, not as a full-time verification engineer. Coverage closure, reference model integration, formal methods, exception and interrupt verification and memory-model testing are areas where I have touched parts, not the whole.

The biggest open item is validating generated streams against proper RTL. AI shortens the build effort, but it does not shortcut that step, and I have yet to explore it for FLOW.

The first target for generated streams will be a simulator, since that is the easiest place to start. I plan to build one for a custom ISA alongside the generator, and write it up in this series.

If you work on the verification side, I would like to hear where a tool like this would help, and where it would fall short.

## The series

1. **This post:** motivation and the big picture.
2. **The ISA layer:** describing architectures in C++ through hooks.
3. **The grammar:** keywords, structure and a formal definition.
4. **Randomness done right:** weights, constraints and reproducible seeds.
5. **Resources and state:** pools, registers and memory.
6. **Scenes:** use-case-driven tests.
7. **A simulator for a custom ISA:** getting streams out and running them.

## Wrapping up

The goal of FLOW is simple to state: **make describing a test as easy as describing it out loud, and make adding an architecture a matter of plugging in C++ hooks.**

If that sounds useful, or like a terrible idea, follow along and tell me which. Next up: how do you describe an architecture to a generator that does not know any?

*If you work with ISGs, RISC-V verification or virtual platforms, I would love to hear how you handle test intent in your own setup.*

---

*About the author: Phaneendra Paluri is an R&D Principal Engineer in virtual prototyping at Synopsys, working on processor and SoC models in C++, SystemC and TLM2. Earlier roles include Infineon and CircuitSutra, where he also contributed to the Accellera CCI working group. FLOW is a personal hobby project, and the views here are his own.*
