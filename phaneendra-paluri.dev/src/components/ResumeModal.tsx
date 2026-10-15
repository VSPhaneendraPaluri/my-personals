import React, { useState } from 'react';
import { X, Printer, Copy, Check } from 'lucide-react';
import { UserProfile, ExperienceItem, EducationItem, SkillCategory, ConferenceItem, ThemeAccent } from '../types/portfolio';
import { getAccentValues } from './CursorSpotlight';

interface ResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  experiences: ExperienceItem[];
  educations: EducationItem[];
  skillCategories: SkillCategory[];
  careerSummary: string[];
  domainsOfInterest: string[];
  conferences: ConferenceItem[];
  accent: ThemeAccent;
}

export const ResumeModal: React.FC<ResumeModalProps> = ({
  isOpen,
  onClose,
  profile,
  experiences,
  educations,
  skillCategories,
  careerSummary,
  domainsOfInterest,
  conferences,
  accent,
}) => {
  const [copied, setCopied] = useState(false);
  const accentVals = getAccentValues(accent);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyMarkdown = () => {
    let md = `# ${profile.name}\n`;
    md += `${experiences[0].roles[0].title}\n\n`;
    if (profile.phone) md += `${profile.phone}\n`;
    md += `${profile.email}\n${profile.linkedin}\n${profile.location}\n\n`;
    md += `## Summary\n${careerSummary.join('\n\n')}\n\n`;
    md += `Domains of interest: ${domainsOfInterest.join(', ')}\n\n`;
    md += `## Experience\n`;
    experiences.forEach((exp) => {
      md += `### ${exp.company}\n${exp.location}\n`;
      exp.roles.forEach((role) => {
        md += `**${role.title}** (${role.period})\n`;
      });
      exp.categories.forEach((category) => {
        md += `\n#### ${category.title}\n`;
        category.details.forEach((detail) => {
          md += `- ${detail}\n`;
        });
      });
      md += `\n`;
    });
    md += `## Education\n`;
    educations.forEach((edu) => {
      md += `### ${edu.degree} — ${edu.institution} (${edu.period})\n`;
      edu.details.forEach((d) => (md += `- ${d}\n`));
      md += `\n`;
    });
    md += `## Conference Participations\n`;
    conferences.forEach((conference) => {
      md += `### ${conference.event} (${conference.year})\n${conference.contribution}\n`;
      if (conference.session) md += `${conference.session}\n`;
      if (conference.link) md += `${conference.link}\n`;
      md += '\n';
    });

    void navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-neutral-900 border border-white/15 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Top Action Bar */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex flex-col gap-3 bg-neutral-950/80 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Curriculum Vitae Preview
            </span>
            <span className="hidden sm:inline-block text-xs font-mono text-neutral-500">
              ATS-Standard Format
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMarkdown}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-medium text-neutral-300 transition-colors hover:bg-white/10 hover:text-white"
              title="Copy as Markdown"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy MD'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold text-neutral-950 transition-colors shadow"
              style={{ backgroundColor: accentVals.hex }}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="ml-1 inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
              aria-label="Close CV modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Canvas */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-12 text-neutral-100 bg-neutral-950/60 print:bg-white print:text-neutral-900 print:p-0">
          <div className="max-w-3xl mx-auto space-y-8">
            
            {/* Header Lockup */}
            <div className="border-b border-white/15 pb-6">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white font-display tracking-tight">
                {profile.name}
              </h1>
              <div className="text-base sm:text-lg font-medium text-neutral-300 mt-1" style={{ color: accentVals.hex }}>
                {experiences[0].roles[0].title}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-400 font-mono">
                {profile.phone && <span>{profile.phone}</span>}
                <a href={`mailto:${profile.email}`} className="hover:text-white">{profile.email}</a>
                <a href={profile.linkedin} target="_blank" rel="noreferrer" className="hover:text-white">LinkedIn</a>
                <span>{profile.location}</span>
              </div>
              {careerSummary.map((paragraph) => (
                <p key={paragraph} className="mt-3 text-xs leading-relaxed text-neutral-300 sm:text-sm">{paragraph}</p>
              ))}
              <div className="mt-3 text-xs text-neutral-400">
                <span className="font-semibold text-neutral-300">Domains:</span> {domainsOfInterest.join(' · ')}
              </div>
            </div>

            {/* Experience Section */}
            <div>
              <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-4 border-b border-white/10 pb-1">
                Professional Experience
              </h2>
              <div className="space-y-6">
                {experiences.map((exp) => (
                  <div key={exp.id} className="space-y-1.5">
                    <div className="border-l-2 pl-3" style={{ borderColor: accentVals.hex }}>
                      <div className="text-base font-bold text-white">{exp.company}</div>
                      <div className="mt-1 text-xs font-mono text-neutral-400">{exp.location}</div>
                      <div className="mt-2 space-y-1">
                        {exp.roles.map((role) => (
                          <div key={`${role.title}-${role.period}`} className="flex flex-col justify-between gap-1 sm:flex-row sm:items-baseline">
                            <div className="text-sm font-semibold text-neutral-200">{role.title}</div>
                            <div className="text-xs font-mono text-neutral-400 tabular-nums">{role.period}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3 pl-3 pt-2">
                      {exp.categories.map((category) => (
                        <div key={category.title}>
                          <h3 className="text-xs font-semibold text-neutral-200">{category.title}</h3>
                          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs leading-relaxed text-neutral-300">
                            {category.details.map((detail) => <li key={detail}>{detail}</li>)}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Education Section */}
            <div>
              <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-4 border-b border-white/10 pb-1">
                Education & Credentials
              </h2>
              <div className="space-y-4">
                {educations.map((edu) => (
                  <div key={edu.id} className="space-y-1">
                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between">
                      <div className="text-sm sm:text-base font-bold text-white">
                        {edu.degree} · <span className="text-neutral-300 font-normal">{edu.institution}</span>
                      </div>
                      <div className="text-xs font-mono text-neutral-400 tabular-nums">
                        {edu.period}
                      </div>
                    </div>
                    {edu.honors && <div className="text-xs font-medium text-cyan-300">{edu.honors}</div>}
                    <ul className="list-disc list-inside space-y-0.5 text-xs text-neutral-300 pl-1">
                      {edu.details.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Conference Participations */}
            <div>
              <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-4 border-b border-white/10 pb-1">
                Conference Participations
              </h2>
              <div className="space-y-4">
                {conferences.map((conference) => (
                  <div key={conference.id} className="space-y-1">
                    <div className="text-sm font-bold text-white">{conference.event} · <span className="font-mono font-normal text-neutral-400">{conference.year}</span></div>
                    <p className="text-xs leading-relaxed text-neutral-300">{conference.contribution}</p>
                    {conference.session && <p className="text-xs text-neutral-400">{conference.session}</p>}
                    {conference.link && <a href={conference.link} className="block min-h-11 break-all py-2 text-xs text-cyan-300 underline">{conference.link}</a>}
                  </div>
                ))}
              </div>
            </div>

            {/* Skills & Competencies */}
            <div>
              <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-4 border-b border-white/10 pb-1">
                Technical Competencies
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {skillCategories.map((cat) => (
                  <div key={cat.id} className="p-3.5 rounded-xl bg-neutral-900/80 border border-white/5">
                    <div className="font-semibold text-white mb-2">{cat.title}</div>
                    <div className="space-y-1 text-neutral-300">
                      {cat.skills.map((s) => (
                        <div key={s.name} className="text-[11px]">
                          <span>{s.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
