import React, { useState } from 'react';
import { Award, Sparkles } from 'lucide-react';
import { InstitutionHighlight, ThemeAccent } from '../types/portfolio';
import { getAccentValues } from './CursorSpotlight';
import { InspirationsSection } from './InspirationsSection';
import { TriumphsSection } from './TriumphsSection';

interface JourneySectionProps {
  institutions: InstitutionHighlight[];
  accent: ThemeAccent;
}

type JourneyTab = 'inspirations' | 'triumphs';

const tabs: { id: JourneyTab; label: string; icon: typeof Sparkles }[] = [
  { id: 'inspirations', label: 'Inspirations', icon: Sparkles },
  { id: 'triumphs', label: 'Triumphs', icon: Award },
];

export const JourneySection: React.FC<JourneySectionProps> = ({ institutions, accent }) => {
  const [activeTab, setActiveTab] = useState<JourneyTab>('inspirations');
  const accentVals = getAccentValues(accent);

  return (
    <section className="relative border-t border-white/5 py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <header className="mb-8">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: accentVals.hex }}>
            My Journey
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            The Ideas and Milestones that Shaped My Path
          </h1>
        </header>

        <div className="mb-8 flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-neutral-900/80 p-1.5 sm:inline-flex">
          {tabs.map(({ id, label, icon: Icon }) => {
            const selected = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                aria-pressed={selected}
                className={`flex min-h-11 min-w-fit items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all sm:text-sm ${
                  selected ? 'bg-neutral-800 text-white shadow-lg ring-1 ring-white/15' : 'text-neutral-400 hover:text-white'
                }`}
                style={selected ? { boxShadow: `inset 0 -2px 0 ${accentVals.hex}` } : undefined}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </button>
            );
          })}
        </div>

        {activeTab === 'inspirations' ? (
          <InspirationsSection accent={accent} embedded />
        ) : (
          <TriumphsSection institutions={institutions} accent={accent} embedded />
        )}
      </div>
    </section>
  );
};
