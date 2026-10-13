---
publishedAt: 2026-10-13
topicId: isg
seriesLabel: FLOW · Part 2
excerpt: Who should own architectural legality in an instruction-stream flow? A practical separation of architecture knowledge, test intent and test construction, with an independent simulator as a cross-check.
---

# Who Owns “Legal”? Separating Architecture Knowledge from Test Intent

In [Part 1](/blogs/teaching-grammar-to-generate-instructions-introducing-flow), I introduced FLOW and the problem it explores.

Here, I focus on one design question: who should own the knowledge that makes a generated test legal?

Consider a typical instruction-generator failure. A test encodes an assumption about an instruction or register, and that assumption is copied into several tests. The RTL behaves differently. The first failing comparison looks like a design bug, so the team starts tracing the pipeline, checking waveforms and comparing reference results. Debug can stretch over days before someone notices the assumption was wrong: the test, not the RTL, violated the architecture.

This is a generic example, not a report of a specific incident. The important point is that legality knowledge has leaked into the place where test intent is expressed. Once it is duplicated there, an outdated assumption can produce convincing false failures.

## One small rule, three responsibilities

Take a familiar architectural property: **the zero register must never be written**. The details vary by architecture, but the example makes the ownership question easy to see.

There are three distinct responsibilities in a test-generation flow:

1. **The ISA developer describes architectural facts.** They define what the architecture permits, including the fact that writes to the zero register are not legal.
2. **The test architect describes verification intent.** They decide what kinds of tests are useful: which instruction families, situations, resources and scenarios should be exercised.
3. **The test writer assembles tests from that intent.** They choose and compose behaviors to target a verification goal without needing to restate every architectural constraint.

The distinction is not about job titles or organizational boundaries. One person may fill all three roles. The point is to keep the responsibilities separate in the design, so the source of each decision stays clear.

![Three responsibilities in an instruction-generation flow: architectural legality surrounds test intent, while an independent simulator cross-checks it.](/images/blogposts/flow-ownership-boundaries.svg)

The tests sit inside the architecture boundary: test intent selects what to explore, but it does not get to redefine what is legal. The simulator is shown separately because it should not simply inherit the generator's view of legality.

## What happens to the zero-register example?

In an ordinary test, the ISA developer states the zero-register behavior once in the architecture model. The test writer chooses operations and scenarios to exercise; they do not have to remember to add a special “avoid writing zero” instruction to each test. The generation flow applies the architectural knowledge while constructing the stream.

That gives the test writer a useful kind of freedom. They can focus on a question such as “What sequence stresses this interaction?” rather than reimplementing the answer to “Which destinations are legal?” in every scenario. It also gives a single owner for updates: if the architecture model changes, tests that depend on it can use the updated knowledge without a hunt through copied assumptions.

Negative testing needs a deliberate exception to that ordinary path. A test may specifically want to attempt a write to the zero register to check how the implementation handles the violation. In that case, the test intent should say that the architectural constraint is being challenged, and declare the expected outcome. The result can then be reported as an intentional negative test—not confused with an accidental illegal instruction or a normal architectural failure.

![Comparison of normal architecture-aware generation with an explicitly declared negative test.](/images/blogposts/flow-positive-and-negative-tests.svg)

The important difference is intent. A negative test is not a hole in the legality model; it is a clearly declared test of behavior outside the ordinary legal space.

## A simulator should be a cross-check, not an echo

The generator must avoid accidental violations; the simulator must decide whether an executed instruction is architecturally valid and what it does. Keeping their models distinct gives the flow a chance to catch disagreement.

But “independent” needs qualification. Two separate codebases do not guarantee two independent checks. If one person reads the specification once, misunderstands a sentence, and implements that same misunderstanding in both places, the models can agree and still be wrong.

The stronger approach is **two separate readings of the specification**, followed by separate implementations and an explicit comparison of the results. Independence comes from process as well as code. The simulator's own rules are useful as a cross-check only to the extent that their interpretation was reached independently.

![Two separate readings of the specification inform independent generator and simulator models, whose outcomes are compared.](/images/blogposts/flow-independent-cross-check.svg)

This supplements, rather than replaces, architectural review and conformance testing.

## Is the separation itself unique?

No—and it would be a mistake to claim otherwise. Model-based instruction generators and other verification flows have long separated an architectural model from the scenarios or templates that use it. Genesys-Pro is one example often cited in this area; its history and exact capabilities are worth checking against the original publications before making more detailed claims. Constrained-random generators, portable-stimulus approaches and executable architecture models also place boundaries between architectural knowledge and test intent, though they do so in different ways and at different levels.

The division of responsibility is a design choice, not a new invention. FLOW explores a particular combination: readable test intent, architecture integration through plain C++ rather than a separate description language, and a separate simulator model for cross-checking. C++ hooks fit a familiar toolchain and avoid another language, while declarative descriptions can be easier to analyse and reuse across tools.

The names and boundaries are also choices. An architecture team may prefer an architecture-model-plus-templates structure; another flow may put more responsibility in the generator. What matters is being deliberate about who owns each fact, and being able to tell whether a failure came from the design, the test intent or the architecture model.

## The design question

FLOW is a hobby project, and this is a design direction to explore—not a prescription for every team. The practical test is whether it makes tests easier to write, accidental illegality less likely, and intentional violations easier to diagnose.

In Part 3, I’ll look at how architecture knowledge can connect to test intent without making the test writer become an ISA expert.

In your flow, who owns legality: the test writer or the architect?
