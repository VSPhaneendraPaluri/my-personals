import React, { useState } from 'react';
import {
  ArrowUpRight,
  ChevronDown,
  BookOpen,
  Briefcase,
  Calendar,
  Code2,
  Cpu,
  Download,
  GraduationCap,
  Layers,
  MapPin,
  Presentation,
  Sparkles
} from 'lucide-react';
import { ExperienceItem, EducationItem, SkillCategory, ConferenceItem, ThemeAccent } from '../types/portfolio';
import { getAccentValues } from './CursorSpotlight';

interface CVSectionProps {
  experiences: ExperienceItem[];
  educations: EducationItem[];
  skillCategories: SkillCategory[];
  conferences: ConferenceItem[];
  careerSummary: string[];
  domainsOfInterest: string[];
  accent: ThemeAccent;
  onOpenResumeModal: () => void;
}

type CVTab = 'experience' | 'expertise' | 'education' | 'conferences';

const tabs: { id: CVTab; label: string; icon: typeof Briefcase }[] = [
  { id: 'experience', label: 'Experience', icon: Briefcase },
  { id: 'expertise', label: 'Expertise', icon: Code2 },
  { id: 'education', label: 'Education', icon: GraduationCap },
  { id: 'conferences', label: 'Conferences', icon: Presentation }
];

export const CVSection: React.FC<CVSectionProps> = ({
  experiences,
  educations,
  skillCategories,
  conferences,
  careerSummary,
  domainsOfInterest,
  accent,
  onOpenResumeModal
}) => {
  const [activeTab, setActiveTab] = useState<CVTab>('experience');
  const [expandedExperienceId, setExpandedExperienceId] = useState<string | null>(null);
  const accentVals = getAccentValues(accent);

  return (
    <section id="experience" className="relative overflow-hidden border-t border-white/5 py-24 sm:py-28">
      <div
        className="pointer-events-none absolute -top-36 right-[-10%] h-[28rem] w-[28rem] rounded-full blur-3xl opacity-[0.08]"
        style={{ backgroundColor: accentVals.hex }}
      />
      <div className="relative mx-auto max-w-7xl px-6 sm:px-8">
        <div className="mb-10 flex flex-col justify-between gap-6 md:mb-14 md:flex-row md:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: accentVals.hex }}>
              <span className="h-px w-8" style={{ backgroundColor: accentVals.hex }} />
              Curriculum Vitae
            </div>
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-white font-display sm:text-5xl">
              Building Systems, from Silicon to Simulation.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-neutral-400 sm:text-base">
              A career across semiconductor engineering, virtual prototyping and robotics — grounded in modelling, architecture and verification.
            </p>
          </div>

          <button
            onClick={onOpenResumeModal}
            className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/10 active:scale-[0.98] md:self-auto"
          >
            <Download className="h-4 w-4" style={{ color: accentVals.hex }} />
            <span>Full CV &amp; Print</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-neutral-500" />
          </button>
        </div>

        <div className="relative mb-10 overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/65 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-9">
          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-1"
            style={{ background: `linear-gradient(to bottom, ${accentVals.hex}, transparent)` }}
          />
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(16rem,0.8fr)] lg:gap-12">
            <div>
              <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                <BookOpen className="h-4 w-4" style={{ color: accentVals.hex }} />
                Career Summary
              </div>
              {careerSummary.map((paragraph) => (
                <p key={paragraph} className="mb-3 max-w-3xl text-sm leading-7 text-neutral-300 last:mb-0 sm:text-base">
                  {paragraph}
                </p>
              ))}
            </div>
            <div className="lg:border-l lg:border-white/10 lg:pl-8">
              <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                <Sparkles className="h-4 w-4" style={{ color: accentVals.hex }} />
                Domains of Interest
              </div>
              <div className="flex flex-wrap gap-2">
                {domainsOfInterest.map((domain) => (
                  <span
                    key={domain}
                    className="rounded-full border px-3 py-2 text-xs font-medium text-neutral-200 sm:text-sm"
                    style={{
                      borderColor: `rgba(${accentVals.rgb}, 0.25)`,
                      backgroundColor: `rgba(${accentVals.rgb}, 0.07)`
                    }}
                  >
                    {domain}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8 flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-neutral-900/80 p-1.5 sm:inline-flex">
          {tabs.map(({ id, label, icon: Icon }) => {
            const selected = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                aria-pressed={selected}
                className={`flex min-w-fit items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all sm:text-sm ${
                  selected ? 'bg-neutral-800 text-white shadow-lg ring-1 ring-white/15' : 'text-neutral-400 hover:text-white'
                }`}
                style={selected ? { boxShadow: `inset 0 -2px 0 ${accentVals.hex}` } : undefined}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </div>

        {activeTab === 'experience' && (
          <div>
            <div className="relative space-y-4">
              <div className="absolute bottom-8 left-[1.15rem] top-8 hidden w-px sm:block" style={{ background: `linear-gradient(${accentVals.hex}70, rgba(255,255,255,0.06))` }} />
              {experiences.map((experience, index) => {
                const isExpanded = expandedExperienceId === experience.id;
                const detailsId = `experience-details-${experience.id}`;
                return (
                  <article key={experience.id} data-expanded={isExpanded} className="spotlight-card experience-card relative rounded-2xl p-5 sm:ml-10 sm:p-7">
                    <span
                      className="experience-marker absolute -left-[2.78rem] top-8 hidden h-4 w-4 rounded-full border-[3px] border-neutral-950 sm:block"
                      style={{ backgroundColor: accentVals.hex, boxShadow: `0 0 20px rgba(${accentVals.rgb}, 0.45)` }}
                    />
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: accentVals.hex }}>
                          <span>{index === 0 ? 'Current role' : 'Experience'}</span>
                          <span className="text-neutral-700">/</span>
                          <span className="text-neutral-500">{String(index + 1).padStart(2, '0')} · {String(experiences.length).padStart(2, '0')}</span>
                        </div>
                        <h2 className="text-xl font-bold text-white font-display sm:text-2xl">{experience.company}</h2>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {experience.roles.map((role) => (
                            <span key={`${role.title}-${role.period}`} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-xs text-neutral-200">
                              <Briefcase className="h-3.5 w-3.5 shrink-0" style={{ color: accentVals.hex }} />
                              <span className="font-semibold">{role.title}</span>
                              <span className="text-neutral-500">{role.period}</span>
                            </span>
                          ))}
                        </div>
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-neutral-500 sm:text-sm">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          {experience.location}
                        </div>
                      </div>
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        aria-controls={detailsId}
                        aria-label={`${isExpanded ? 'Hide' : 'Show'} work categories for ${experience.company}`}
                        onClick={() => setExpandedExperienceId(isExpanded ? null : experience.id)}
                        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs font-semibold text-neutral-300 transition hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 sm:self-auto"
                      >
                        {isExpanded ? 'Close details' : 'Explore work'}
                        <ChevronDown className="experience-chevron h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div id={detailsId} role="region" aria-label={`${experience.company} work highlights`} className="experience-details">
                      <div className="mt-5 grid gap-3 border-t border-white/[0.07] pt-5 md:grid-cols-2">
                        {experience.categories.map((category) => (
                          <section key={category.title} className="rounded-xl border border-white/[0.07] bg-black/15 p-4 transition-colors hover:border-white/15">
                            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-neutral-200">
                              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accentVals.hex }} />
                              {category.title}
                            </h3>
                            <ul className="space-y-2.5">
                              {category.details.map((detail) => (
                                <li key={detail} className="flex gap-2.5 text-xs leading-6 text-neutral-400 sm:text-sm">
                                  <span className="mt-[0.65rem] h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: `rgba(${accentVals.rgb}, 0.75)` }} />
                                  {detail}
                                </li>
                              ))}
                            </ul>
                          </section>
                        ))}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'expertise' && (
          <div className="grid gap-4 lg:grid-cols-3">
            {skillCategories.map((category, index) => {
              const Icon = [Cpu, Layers, Code2][index % 3];
              return (
                <article key={category.id} className="spotlight-card rounded-2xl p-6 sm:p-7">
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]" style={{ color: accentVals.hex }}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <h2 className="text-lg font-bold text-white font-display">{category.title}</h2>
                    </div>
                    <span className="font-mono text-xs text-neutral-600">0{index + 1}</span>
                  </div>
                  <ul className="space-y-4">
                    {category.skills.map((skill) => (
                      <li key={skill.name} className="border-t border-white/[0.07] pt-3">
                        <div className="text-sm font-semibold text-neutral-200">{skill.name}</div>
                        <p className="mt-1 text-xs leading-6 text-neutral-400">{skill.description}</p>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        )}

        {activeTab === 'education' && (
          <div className="grid gap-4 md:grid-cols-2">
            {educations.map((education, index) => (
              <article key={education.id} className="spotlight-card rounded-2xl p-6 sm:p-8">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]" style={{ color: accentVals.hex }}>
                    <GraduationCap className="h-5 w-5" />
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-neutral-400">
                    <Calendar className="h-3.5 w-3.5" />
                    {education.period}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white font-display">{education.degree}</h2>
                <p className="mt-2 text-sm font-medium text-neutral-300">{education.institution}</p>
                <p className="mt-1 text-xs text-neutral-500">{education.location}</p>
                {education.honors && <p className="mt-4 text-sm font-medium" style={{ color: accentVals.hex }}>{education.honors}</p>}
                {education.details.length > 0 && (
                  <ul className="mt-4 space-y-2 border-t border-white/[0.07] pt-4">
                    {education.details.map((detail) => (
                      <li key={detail} className="flex gap-2 text-sm leading-6 text-neutral-400">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: accentVals.hex }} />
                        {detail}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        )}

        {activeTab === 'conferences' && (
          <div className="grid gap-4 lg:grid-cols-3">
            {conferences.map((conference) => (
              <article key={conference.id} className="spotlight-card flex flex-col rounded-2xl p-6">
                <div className="mb-5 flex items-center justify-between">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]" style={{ color: accentVals.hex }}>
                    <Presentation className="h-5 w-5" />
                  </span>
                  <span className="font-mono text-xs text-neutral-500">{conference.year}</span>
                </div>
                <h2 className="text-lg font-bold text-white font-display">{conference.event}</h2>
                <p className="mt-3 flex-1 text-sm leading-6 text-neutral-300">{conference.contribution}</p>
                {conference.session && (
                  <p className="mt-3 border-l border-white/15 pl-3 text-xs leading-5 text-neutral-400">{conference.session}</p>
                )}
                {conference.link && (
                  <a
                    href={conference.link}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold transition hover:text-white"
                    style={{ color: accentVals.hex }}
                  >
                    View conference details <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
