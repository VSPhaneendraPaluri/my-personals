import React from 'react';
import { Building2, ExternalLink } from 'lucide-react';
import { InstitutionHighlight, ThemeAccent } from '../types/portfolio';
import { getAccentValues } from './CursorSpotlight';

interface TriumphsSectionProps {
  institutions: InstitutionHighlight[];
  accent: ThemeAccent;
  embedded?: boolean;
}

export const TriumphsSection: React.FC<TriumphsSectionProps> = ({ institutions, accent, embedded = false }) => {
  const accentVals = getAccentValues(accent);

  return (
    <section id="triumphs" className={embedded ? 'relative' : 'relative border-t border-white/5 py-24'}>
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: accentVals.hex }}>
              Pivotal Milestones & Wins
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-display tracking-tight text-balance">
              Career &amp; Academic Milestones
            </h2>
            <p className="text-neutral-400 text-sm sm:text-base mt-2 max-w-2xl">
              A career-defining opportunity and an academic milestone.
            </p>
          </div>
        </div>

        <div className="mb-12">
          <div className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
            <Building2 className="h-4 w-4" style={{ color: accentVals.hex }} />
            ISRO &amp; IIT Roorkee
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {institutions.map((institution) => (
              <a
                key={institution.id}
                href={institution.link}
                data-card-theme="milestone"
                target="_blank"
                rel="noreferrer"
                className="spotlight-card group flex min-h-36 items-center gap-5 rounded-2xl p-5 transition-transform hover:-translate-y-0.5 sm:p-6"
              >
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white p-2">
                  <img
                    src={institution.logo}
                    alt={`${institution.name} logo`}
                    loading="lazy"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="font-display text-lg font-bold text-white transition-colors group-hover:text-cyan-200">
                    {institution.name}
                  </h3>
                  <p className="mt-1.5 text-sm leading-6 text-neutral-400">{institution.context}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold" style={{ color: accentVals.hex }}>
                    Visit website <ExternalLink className="h-3.5 w-3.5" />
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
