import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { ThemeAccent } from '../types/portfolio';
import { flowIntroductionPost, formatPostDate } from '../data/blogPosts';
import { getAccentValues } from './CursorSpotlight';
import { BlogPostNavigation } from './MarkdownBlogPost';

interface FlowIntroductionPostProps {
  accent: ThemeAccent;
}

export const FlowIntroductionPost: React.FC<FlowIntroductionPostProps> = ({ accent }) => {
  const accentVals = getAccentValues(accent);

  return (
    <article className="relative border-t border-white/5 py-24">
      <div className="mx-auto max-w-4xl px-6 sm:px-8">
        <a
          href="/blogs"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-neutral-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All posts
        </a>

        <header className="mt-10 border-b border-white/10 pb-10">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold uppercase tracking-[0.18em]">
            <span style={{ color: accentVals.hex }}>FLOW · Part 1</span>
            <span className="text-neutral-600" aria-hidden="true">·</span>
            <time dateTime={flowIntroductionPost.publishedAt} className="text-neutral-500">
              {formatPostDate(flowIntroductionPost.publishedAt)}
            </time>
          </div>
          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
            {flowIntroductionPost.title}
          </h1>
          <p className="mt-5 text-lg leading-8 text-neutral-400">
            A hobby project on grammar-driven instruction stream generation for CPU verification, and the first post in a series.
          </p>
        </header>

        <div className="space-y-5 pt-8 text-base leading-8 text-neutral-300">
          <p>
            Somewhere in a verification lab, a processor is running a program that no human ever wrote.
          </p>
          <p>
            That is not a failure of process. It is the process. A CPU makes one promise, <em>run any legal program and produce exactly the architecturally correct result</em>, and no team can write enough programs to test it. So we build tools that write programs: <strong className="text-white">Instruction Stream Generators (ISGs)</strong>. They produce long, legal, varied sequences of instructions, run them on the design and on a reference, and compare the results.
          </p>
          <p>
            This post introduces <strong className="text-white">FLOW</strong>, a hobby project to build a framework for those tools, driven by a grammar. It is the first in a series.
          </p>
          <p>
            <strong className="text-white">FLOW</strong> stands for <strong className="text-white">Framework for Instruction Orchestration &amp; Workflows</strong>.
          </p>
        </div>

        <figure className="relative mt-8 overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(ellipse_at_75%_10%,rgba(34,211,238,0.15),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.045),rgba(255,255,255,0.01))] p-5 sm:p-9">
          <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
          <svg
            viewBox="0 0 760 300"
            role="img"
            aria-labelledby="flow-hero-title flow-hero-description"
            className="relative mx-auto w-full max-w-3xl"
          >
            <title id="flow-hero-title">How FLOW turns test intent into verified instruction streams</title>
            <desc id="flow-hero-description">
              A grammar feeds the FLOW generator, which produces an instruction stream checked against a processor model.
            </desc>
            <defs>
              <linearGradient id="flow-line" x1="0" x2="1">
                <stop offset="0" stopColor={accentVals.hex} stopOpacity=".3" />
                <stop offset=".5" stopColor={accentVals.hex} />
                <stop offset="1" stopColor="#a78bfa" />
              </linearGradient>
              <radialGradient id="flow-glow">
                <stop stopColor={accentVals.hex} stopOpacity=".26" />
                <stop offset="1" stopColor={accentVals.hex} stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="388" cy="145" r="130" fill="url(#flow-glow)" />
            <path d="M190 149h90m120 0h95m105 0h52" fill="none" stroke="url(#flow-line)" strokeWidth="2" strokeDasharray="5 7" />
            {[266, 388, 500, 566].map((cx) => (
              <circle key={cx} cx={cx} cy="149" r="3" fill={accentVals.hex} />
            ))}

            <g transform="translate(30 75)">
              <rect width="158" height="148" rx="18" fill="#10151d" stroke="white" strokeOpacity=".13" />
              <rect x="17" y="17" width="36" height="25" rx="7" fill={accentVals.hex} fillOpacity=".16" />
              <path d="M27 29h16M35 23v12" stroke={accentVals.hex} strokeWidth="2" strokeLinecap="round" />
              <text x="64" y="34" fill="#d4d4d8" fontSize="12" fontWeight="600">TEST INTENT</text>
              <rect x="17" y="57" width="123" height="28" rx="7" fill="#ffffff" fillOpacity=".045" />
              <text x="28" y="75" fill="#a1a1aa" fontSize="10" fontFamily="monospace">setup → random → check</text>
              <rect x="17" y="95" width="91" height="8" rx="4" fill={accentVals.hex} fillOpacity=".65" />
              <rect x="17" y="113" width="113" height="6" rx="3" fill="white" fillOpacity=".12" />
              <text x="17" y="139" fill="#71717a" fontSize="10">Grammar describes the shape</text>
            </g>

            <g transform="translate(287 81)">
              <rect width="129" height="136" rx="24" fill="#111722" stroke={accentVals.hex} strokeOpacity=".65" />
              <rect x="8" y="8" width="113" height="120" rx="18" fill="none" stroke={accentVals.hex} strokeOpacity=".12" />
              <path d="M-7 28h15M-7 51h15M-7 74h15M-7 97h15M121 28h15M121 51h15M121 74h15M121 97h15" stroke={accentVals.hex} strokeOpacity=".65" strokeWidth="2" strokeLinecap="round" />
              <circle cx="65" cy="43" r="18" fill={accentVals.hex} fillOpacity=".16" />
              <path d="M57 43h16M65 35v16" stroke={accentVals.hex} strokeWidth="2" strokeLinecap="round" />
              <text x="65" y="82" textAnchor="middle" fill="white" fontSize="15" fontWeight="700" letterSpacing="2">FLOW</text>
              <text x="65" y="103" textAnchor="middle" fill="#a1a1aa" fontSize="9">CORE GENERATOR</text>
              <text x="65" y="118" textAnchor="middle" fill="#71717a" fontSize="9">legal · varied · repeatable</text>
            </g>

            <g transform="translate(468 75)">
              <rect width="127" height="148" rx="18" fill="#10151d" stroke="white" strokeOpacity=".13" />
              <text x="16" y="29" fill="#d4d4d8" fontSize="11" fontWeight="600">INSTRUCTION STREAM</text>
              {['addi r1, r0, 4', 'xor  r3, r1, r2', 'sw   r3, 0(r4)', 'beq  r1, r2, +8'].map((line, index) => (
                <g key={line}>
                  <rect x="14" y={43 + index * 22} width="99" height="17" rx="4" fill={index === 1 ? accentVals.hex : 'white'} fillOpacity={index === 1 ? '.15' : '.045'} />
                  <text x="20" y={55 + index * 22} fill={index === 1 ? accentVals.hex : '#a1a1aa'} fontSize="8" fontFamily="monospace">{line}</text>
                </g>
              ))}
              <text x="16" y="140" fill="#71717a" fontSize="9">Ready to simulate</text>
            </g>

            <g transform="translate(627 102)">
              <rect width="102" height="95" rx="16" fill="#10151d" stroke="white" strokeOpacity=".13" />
              <path d="M32 35l10 10 21-23" fill="none" stroke="#34d399" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              <text x="51" y="68" textAnchor="middle" fill="#e4e4e7" fontSize="10" fontWeight="600">COMPARE</text>
              <text x="51" y="83" textAnchor="middle" fill="#71717a" fontSize="9">design ↔ reference</text>
            </g>
          </svg>
          <figcaption className="relative mt-3 text-center text-xs leading-5 text-neutral-500 sm:text-sm">
            FLOW turns a description of test intent into varied instruction streams, ready to run and compare.
          </figcaption>
        </figure>

        <div className="space-y-8 py-10 text-base leading-8 text-neutral-300">
          <section className="space-y-5 pt-4">
            <h2 className="font-display text-2xl font-bold text-white">Where I am coming from</h2>
            <p>
              By profession, I am a virtual prototyping developer. For most of my career that has meant building SystemC/TLM2 models of processors and SoCs, so that software teams can start long before silicon exists. I have worked on processor models across several architectures, including ARMv8-M, RISC-V and Renesas RH850.
            </p>
            <p>
              Early on, I also had a one-off stint on the verification side: I built an architecture-aware C++ generator, not just a random one, to exercise the ISA of a SPARCv8 core on RTL.
            </p>
            <p>
              Between that stint and a career of building models that other people&apos;s test programs had to exercise, I kept running into one question on every architecture:
            </p>
            <blockquote className="border-l-2 pl-5 italic text-neutral-200" style={{ borderColor: accentVals.hex }}>
              How do I tell a generator what to generate, without rewriting the generator?
            </blockquote>
            <p>FLOW is my attempt to answer it properly, in the open.</p>
          </section>

          <section className="space-y-5 pt-4">
            <h2 className="font-display text-2xl font-bold text-white">Why generate instruction streams at all?</h2>
            <figure className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-7">
              <div className="mb-5 flex items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500 sm:text-xs">
                <span>Fully directed</span>
                <span>Constrained random</span>
                <span>Unrestricted random</span>
              </div>
              <div className="relative h-3 overflow-hidden rounded-full bg-gradient-to-r from-violet-500/70 via-cyan-400/80 to-rose-500/60">
                <div className="absolute left-[52%] top-1/2 h-7 w-7 -translate-y-1/2 rounded-full border-2 border-white bg-neutral-950 shadow-[0_0_24px_rgba(34,211,238,0.65)]" />
              </div>
              <div className="mt-5 grid gap-3 text-xs leading-5 text-neutral-400 sm:grid-cols-3 sm:text-sm">
                <p>Precise and repeatable, but limited to scenarios you already imagined.</p>
                <p className="text-neutral-200">A useful balance: explore many legal cases while steering toward meaningful behavior.</p>
                <p>Broad exploration, but much of the output may be illegal or uninteresting.</p>
              </div>
              <figcaption className="sr-only">Constrained random sits between repeatable directed tests and unrestricted random generation.</figcaption>
            </figure>
            <ul className="list-disc space-y-3 pl-6 marker:text-neutral-500">
              <li><strong className="text-white">The state space is enormous.</strong> Registers, memory, flags, pipeline hazards, exceptions, privilege modes, interrupts. Bugs hide in the <em>combinations</em>.</li>
              <li><strong className="text-white">Hand-written tests only cover what you thought of.</strong> The bugs that escape are rarely the ones you imagined.</li>
              <li><strong className="text-white">Pure random is wasteful.</strong> A fully random stream mostly traps, jumps into the void, or touches memory that does not exist.</li>
            </ul>
            <p>
              So a good generator lives in the middle: <strong className="text-white">constrained random</strong>. Random enough to find the unexpected, constrained enough to stay legal and reach the scenarios you care about. It must also produce <strong className="text-white">directed</strong> tests, where you want one precise sequence every time.
            </p>
          </section>

          <section className="space-y-5 pt-4">
            <h2 className="font-display text-2xl font-bold text-white">The problem: intent buried in code</h2>
            <ol className="list-decimal space-y-2 pl-6 marker:text-neutral-500">
              <li>Start with a clean tool for one ISA.</li>
              <li>Add a knob, then another, then a config file with fifty options.</li>
              <li>Add special cases in the C++ for just this one scenario.</li>
              <li>Months later, a new test idea needs a code change, a rebuild and a prayer.</li>
            </ol>
            <p>
              The root cause is that <strong className="text-white">test intent lives inside the generator</strong>. The tool becomes a pile of scenarios instead of a way to describe them.
            </p>
          </section>

          <section className="space-y-5 pt-4">
            <h2 className="font-display text-2xl font-bold text-white">The idea: give test writers a language</h2>
            <p>A test writer does not think in <code className="rounded bg-white/5 px-1.5 py-0.5 text-sm text-neutral-200">if</code> statements and virtual functions. They think:</p>
            <ul className="list-disc space-y-2 pl-6 marker:text-neutral-500">
              <li>&quot;Set things up, do some random arithmetic, hammer one load/store pattern, then check.&quot;</li>
              <li>&quot;Mostly ALU ops, a few branches, never touch this memory range.&quot;</li>
              <li>&quot;Call a function with these arguments, in the middle of random traffic.&quot;</li>
            </ul>
            <p>
              That is <em>structure</em>, and the classic way to describe structure is a <strong className="text-white">context-free grammar (CFG)</strong>. A grammar gives us:
            </p>
            <ul className="list-disc space-y-2 pl-6 marker:text-neutral-500">
              <li><strong className="text-white">Composition:</strong> big behaviours built from small named pieces.</li>
              <li><strong className="text-white">Choice:</strong> alternatives in a rule, which is exactly where randomness and weights belong.</li>
              <li><strong className="text-white">Repetition and recursion:</strong> loops, nested scenarios and call patterns come naturally.</li>
            </ul>
            <p>Here is the intuition in toy form. The syntax is a draft and <em>will</em> change:</p>
            <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-5 font-mono text-sm leading-6 text-neutral-200"><code>{`test      = intro  20 * step  outro
step      = alu_burst | mem_pattern | branchy
alu_burst = 4..12 * alu_op
alu_op    = add | sub | and | or | xor`}</code></pre>
            <p>
              A test is a setup, twenty steps and a teardown. Each step is one of three behaviours. An ALU burst is four to twelve ALU instructions. Nothing here knows about any particular ISA. The grammar describes <em>shape</em>; the ISA supplies the vocabulary.
            </p>
          </section>

          <section className="space-y-5 pt-4">
            <h2 className="font-display text-2xl font-bold text-white">Two layers, one clean seam</h2>
            <p>The central design decision in FLOW is a hard split between two worlds.</p>
            <p><strong className="text-white">The ISA layer (C++).</strong> Developers describe an architecture through hooks and callbacks: formats, fields, opcodes, encodings, legality rules, register files. Each architecture plugs in its own knowledge without touching the core.</p>
            <p><strong className="text-white">The test layer (the grammar).</strong> Test writers describe <em>what to generate</em>, using the instructions and resources the ISA layer registered.</p>
            <p>The core engine sits in between. It expands the grammar, makes the random choices, tracks resource state and hands finished instructions to an emitter.</p>
            <figure className="rounded-2xl border border-white/10 bg-[radial-gradient(ellipse_at_50%_100%,rgba(34,211,238,0.08),transparent_60%),rgba(0,0,0,0.2)] p-5 sm:p-8">
              <div className="grid items-center gap-3 text-center sm:grid-cols-[1fr_auto_1.15fr_auto_1fr] sm:gap-4">
                <div className="rounded-xl border border-violet-300/20 bg-violet-300/[0.06] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-200">Test writer</p>
                  <p className="mt-2 font-display text-base font-bold text-white">Grammar</p>
                  <p className="mt-1 text-xs leading-5 text-neutral-400">Describes what to generate</p>
                </div>
                <span className="hidden text-xl text-neutral-600 sm:block" aria-hidden="true">→</span>
                <span className="text-xl text-neutral-600 sm:hidden" aria-hidden="true">↓</span>
                <div className="rounded-xl border p-4" style={{ borderColor: `rgba(${accentVals.rgb}, 0.35)`, backgroundColor: `rgba(${accentVals.rgb}, 0.07)` }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: accentVals.hex }}>The engine</p>
                  <p className="mt-2 font-display text-base font-bold text-white">FLOW core</p>
                  <p className="mt-1 text-xs leading-5 text-neutral-400">Expands rules, chooses, tracks state</p>
                </div>
                <span className="hidden text-xl text-neutral-600 sm:block" aria-hidden="true">→</span>
                <span className="text-xl text-neutral-600 sm:hidden" aria-hidden="true">↓</span>
                <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/[0.06] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-200">Architecture developer</p>
                  <p className="mt-2 font-display text-base font-bold text-white">ISA hooks · C++</p>
                  <p className="mt-1 text-xs leading-5 text-neutral-400">Supplies instructions and legality</p>
                </div>
              </div>
              <div className="mx-auto mt-4 max-w-xs border-t border-dashed border-white/15 pt-4 text-center">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-neutral-300">
                  <span style={{ color: accentVals.hex }} aria-hidden="true">↓</span>
                  Emitters · assembly · binary
                </span>
              </div>
              <figcaption className="mt-4 text-center text-xs text-neutral-500">
                Test intent and architecture knowledge meet at the reusable generator core.
              </figcaption>
            </figure>
            <p>The payoff: a new ISA does not need a new generator, and a new scenario does not need a rebuild.</p>
          </section>

          <section className="space-y-5 pt-4">
            <h2 className="font-display text-2xl font-bold text-white">Design principles</h2>
            <ul className="list-disc space-y-3 pl-6 marker:text-neutral-500">
              <li><strong className="text-white">Pure C++.</strong> One language for the framework, the ISA plugins and the hooks. No C/C++ mix, no glue scripts holding the core together.</li>
              <li><strong className="text-white">A simple test language comes first.</strong> If writing a test is harder than writing assembly, nobody will use it. Keywords must be memorable, and the common case should be a one-liner.</li>
              <li><strong className="text-white">Architecture-aware, not just ISA-aware.</strong> Knowing encodings is not enough. A useful generator understands registers, memory regions and other resources, so it avoids illegal or pointless streams by construction.</li>
              <li><strong className="text-white">Constrained random and directed, in one language.</strong> A pure sequence grammar suits directed tests but falls short for use-case-driven random ones. FLOW needs both, in one tool.</li>
              <li><strong className="text-white">Reproducible.</strong> The same seed and script must produce the same stream. A failure you cannot regenerate is a rumour, not a bug report.</li>
            </ul>
          </section>

          <section className="space-y-5 pt-4">
            <h2 className="font-display text-2xl font-bold text-white">Concepts you will meet in this series</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { name: 'Pools', detail: 'Pick from named sets of registers, memory, or instructions.', mark: '01', tint: 'text-cyan-200 border-cyan-300/20 bg-cyan-300/[0.05]' },
                { name: 'Scenes', detail: 'Compose reusable, parameterised pieces of test intent.', mark: '02', tint: 'text-violet-200 border-violet-300/20 bg-violet-300/[0.05]' },
                { name: 'Rules', detail: 'State what must always, never, or sometimes be true.', mark: '03', tint: 'text-emerald-200 border-emerald-300/20 bg-emerald-300/[0.05]' },
                { name: 'Weights', detail: 'Bias choices without hard-coding a fixed sequence.', mark: '04', tint: 'text-amber-200 border-amber-300/20 bg-amber-300/[0.05]' },
              ].map(({ name, detail, mark, tint }) => (
                <div key={name} className={`rounded-xl border p-4 ${tint}`}>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs opacity-70">{mark}</span>
                    <h3 className="font-display text-base font-bold">{name}</h3>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-neutral-400">{detail}</p>
                </div>
              ))}
            </div>
            <ul className="list-disc space-y-3 pl-6 marker:text-neutral-500">
              <li><strong className="text-white">Pools:</strong> named collections of resources such as registers, memory ranges and groups of instructions. A constraint becomes &quot;draw from this pool&quot;.</li>
              <li><strong className="text-white">Scenes:</strong> reusable, parameterised pieces of intent, like &quot;call a function&quot; or &quot;copy a block&quot;, holding directed instructions, random draws, or both.</li>
              <li><strong className="text-white">Rules:</strong> things that must always, never or at least sometimes hold across a stream.</li>
              <li><strong className="text-white">Weights:</strong> relative likelihoods that bias random choices without writing code.</li>
            </ul>
            <p>Each gets its own post.</p>
          </section>

          <section className="space-y-5 pt-4">
            <h2 className="font-display text-2xl font-bold text-white">Why I think I can take this on</h2>
            <p>A fair question: why should a virtual prototyping developer build a generator framework?</p>
            <p>
              Because the ground has shifted. Deep knowledge of one area used to stop at its edge, and crossing into a neighbouring one, with its own specs, tools and vocabulary, cost months. My earlier generator took about seven to eight person-months, including supporting the CPU verification team. AI coding assistants change that arithmetic. They help me read unfamiliar material, scaffold parsers and boilerplate, and try design alternatives quickly, so my time goes into the decisions that matter.
            </p>
            <p>
              That does not mean handing over the thinking. In verification, &quot;looks plausible&quot; is not good enough, so every piece of generated code must be understood, tested and, where needed, thrown away. The design judgement stays with me.
            </p>
            <p>So FLOW is also an experiment: how far can domain knowledge from the modeling side, plus AI as a sparring partner, take one person into a complex area?</p>
          </section>

          <section className="space-y-5 pt-4">
            <h2 className="font-display text-2xl font-bold text-white">What I have not explored yet</h2>
            <p>
              I will be upfront about the gaps. I come to this from the modeling side, not as a full-time verification engineer. Coverage closure, reference model integration, formal methods, exception and interrupt verification and memory-model testing are areas where I have touched parts, not the whole.
            </p>
            <p>The biggest open item is validating generated streams against proper RTL. AI shortens the build effort, but it does not shortcut that step, and I have yet to explore it for FLOW.</p>
            <p>
              The first target for generated streams will be a simulator, since that is the easiest place to start. I plan to build one for a custom ISA alongside the generator, and write it up in this series.
            </p>
            <p>If you work on the verification side, I would like to hear where a tool like this would help, and where it would fall short.</p>
          </section>

          <section className="space-y-5 pt-4">
            <h2 className="font-display text-2xl font-bold text-white">The series</h2>
            <ol className="list-decimal space-y-2 pl-6 marker:text-neutral-500">
              <li><strong className="text-white">This post:</strong> motivation and the big picture.</li>
              <li><strong className="text-white">The ISA layer:</strong> describing architectures in C++ through hooks.</li>
              <li><strong className="text-white">The grammar:</strong> keywords, structure and a formal definition.</li>
              <li><strong className="text-white">Randomness done right:</strong> weights, constraints and reproducible seeds.</li>
              <li><strong className="text-white">Resources and state:</strong> pools, registers and memory.</li>
              <li><strong className="text-white">Scenes:</strong> use-case-driven tests.</li>
              <li><strong className="text-white">A simulator for a custom ISA:</strong> getting streams out and running them.</li>
            </ol>
          </section>

          <section className="space-y-5 pt-4">
            <h2 className="font-display text-2xl font-bold text-white">Wrapping up</h2>
            <p>
              The goal of FLOW is simple to state: <strong className="text-white">make describing a test as easy as describing it out loud, and make adding an architecture a matter of plugging in C++ hooks.</strong>
            </p>
            <p>If that sounds useful, or like a terrible idea, follow along and tell me which. Next up: how do you describe an architecture to a generator that does not know any?</p>
            <p className="italic text-neutral-400">
              If you work with ISGs, RISC-V verification or virtual platforms, I would love to hear how you handle test intent in your own setup.
            </p>
          </section>
        </div>

        <footer className="border-t border-white/10 pt-6 text-sm leading-6 text-neutral-500">
          About the author: Phaneendra Paluri is an R&amp;D Principal Engineer in virtual prototyping at Synopsys, working on processor and SoC models in C++, SystemC and TLM2. Earlier roles include Infineon and CircuitSutra, where he also contributed to the Accellera CCI working group. FLOW is a personal hobby project, and the views here are his own.
        </footer>
        <BlogPostNavigation post={flowIntroductionPost} />
      </div>
    </article>
  );
};
