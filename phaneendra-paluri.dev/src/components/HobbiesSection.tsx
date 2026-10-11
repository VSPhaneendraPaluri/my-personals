import React from 'react';
import { Cpu, Radio, Sparkles } from 'lucide-react';
import { PastimeItem, ThemeAccent } from '../types/portfolio';
import { getAccentValues } from './CursorSpotlight';

interface HobbiesSectionProps {
  pastimes: PastimeItem[];
  accent: ThemeAccent;
}

export const HobbiesSection: React.FC<HobbiesSectionProps> = ({ pastimes, accent }) => {
  const accentVals = getAccentValues(accent);

  return (
    <section id="projects" className="relative overflow-hidden border-t border-white/5 py-24 sm:py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full blur-3xl opacity-[0.08]"
        style={{ backgroundColor: accentVals.hex }}
      />
      <div className="relative mx-auto max-w-7xl px-6 sm:px-8">
        <div className="mb-12 max-w-3xl">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: accentVals.hex }}>
            <Sparkles className="h-4 w-4" />
            Hobbies &amp; Labs
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white font-display sm:text-5xl">
            Hands-On with Electronics.
          </h1>
          <p className="mt-4 text-sm leading-7 text-neutral-400 sm:text-base">
            A collection of development boards and modules from embedded-electronics explorations—small tools for making ideas tangible.
          </p>
        </div>

        <div className="mb-6 flex items-center gap-3 border-b border-white/10 pb-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]" style={{ color: accentVals.hex }}>
            <Cpu className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-white font-display">My pastimes</h2>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-neutral-500">
              <Radio className="h-3 w-3" />
              Boards, sensors &amp; embedded hardware
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {pastimes.map((pastime, index) => (
            <article
              key={pastime.id}
              className="spotlight-card group overflow-hidden rounded-2xl transition-transform duration-300 hover:-translate-y-1"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-neutral-900">
                <img
                  src={pastime.image}
                  alt={pastime.imageAlt}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span className="absolute left-3 top-3 rounded-md border border-white/15 bg-neutral-950/75 px-2 py-1 font-mono text-[10px] text-neutral-400 backdrop-blur">
                  0{index + 1} / 0{pastimes.length}
                </span>
              </div>
              <div className="p-4">
                <h3 className="text-sm font-semibold text-neutral-100">{pastime.name}</h3>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
