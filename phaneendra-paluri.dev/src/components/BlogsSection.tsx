import React from 'react';
import { ArrowRight, BookOpenText, Cpu, FlaskConical, Layers3 } from 'lucide-react';
import { ThemeAccent } from '../types/portfolio';
import { getAccentValues } from './CursorSpotlight';

interface BlogsSectionProps {
  accent: ThemeAccent;
}

const writingTopics = [
  {
    title: 'Systems & Architecture',
    description: 'Notes on processor design, SoC architecture, and exploring complex systems.',
    icon: Cpu,
  },
  {
    title: 'Modelling & Verification',
    description: 'Practical write-ups on SystemC, virtual prototyping, and verification workflows.',
    icon: Layers3,
  },
  {
    title: 'Experiments & Ideas',
    description: 'Lessons learned from projects, tools, and explorations in the lab.',
    icon: FlaskConical,
  },
];

export const BlogsSection: React.FC<BlogsSectionProps> = ({ accent }) => {
  const accentVals = getAccentValues(accent);

  return (
    <section className="relative border-t border-white/5 py-24">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <header className="max-w-3xl">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: accentVals.hex }}>
            Blogs &amp; Posts
          </div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Ideas, Notes &amp; Write-Ups
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-neutral-400 sm:text-lg">
            A home for things I learn and build — from system-level modelling and processor
            architecture to experiments that spark a new idea.
          </p>
        </header>

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {writingTopics.map(({ title, description, icon: Icon }) => (
            <article key={title} className="spotlight-card rounded-2xl p-6 sm:p-7">
              <Icon className="h-5 w-5" style={{ color: accentVals.hex }} aria-hidden="true" />
              <h2 className="mt-5 font-display text-lg font-bold text-white">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-400">{description}</p>
            </article>
          ))}
        </div>

        <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.025] p-7 sm:p-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5">
              <BookOpenText className="h-5 w-5" style={{ color: accentVals.hex }} aria-hidden="true" />
            </div>
            <div className="flex-1">
              <h2 className="font-display text-xl font-bold text-white">The First Post Is on Its Way</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-400">
                This is where new articles and short notes will appear. In the meantime, explore
                my experience or get in touch to talk about a topic.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href="/experience"
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-sm font-semibold text-neutral-200 transition-colors hover:border-white/20 hover:text-white"
              >
                Explore experience <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href="/contact"
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-neutral-950 transition-opacity hover:opacity-90"
                style={{ backgroundColor: accentVals.hex }}
              >
                Get in touch <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
