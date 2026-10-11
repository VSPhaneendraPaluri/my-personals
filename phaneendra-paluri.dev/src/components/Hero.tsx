import React, { useRef, useState } from 'react';
import { ArrowDown, Mail, Sparkles, FileText, ExternalLink, MapPin, Cpu } from 'lucide-react';
import { UserProfile, ThemeAccent } from '../types/portfolio';
import { getAccentValues } from './CursorSpotlight';

interface HeroProps {
  profile: UserProfile;
  accent: ThemeAccent;
  onOpenResumeModal: () => void;
}

export const Hero: React.FC<HeroProps> = ({ profile, accent, onOpenResumeModal }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });
  const accentVals = getAccentValues(accent);

  // 3D perspective hover effect on the hero visual
  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Update local card spotlight css vars
    cardRef.current.style.setProperty('--mouse-x', `${x}px`);
    cardRef.current.style.setProperty('--mouse-y', `${y}px`);

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -7;
    const rotateY = ((x - centerX) / centerX) * 7;
    setTilt({ rotateX, rotateY });
  };

  const handleCardMouseLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0 });
  };

  return (
    <section id="overview" className="relative pt-32 pb-20 sm:pt-36 sm:pb-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 relative z-10">
        {/* Split Screen 2-Column Hero */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Typographic Hierarchy */}
          <div className="lg:col-span-7 flex flex-col items-start space-y-6">
            
            {/* Kicker & Location (Zero-pill clean typography) */}
            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-neutral-400 font-medium">
              <span className="text-white font-semibold tracking-wide uppercase text-xs" style={{ color: accentVals.hex }}>
                {profile.role}
              </span>
              <span aria-hidden="true" className="opacity-40">·</span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 opacity-60" />
                {profile.location}
              </span>
              <span aria-hidden="true" className="opacity-40">·</span>
              <span></span>
            </div>

            {/* Display Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.08] font-display text-balance">
              Modelling Complex Systems, from{' '}
              <span
                className="bg-clip-text text-transparent bg-gradient-to-r"
                style={{
                  backgroundImage: `linear-gradient(to right, #ffffff, ${accentVals.hex}, #ffffff)`
                }}
              >
                Architecture to Implementation
              </span>{' '}
            </h1>

            {/* Lead Prose */}
            <p className="text-base sm:text-lg text-neutral-300 leading-relaxed max-w-2xl font-normal">
              {profile.bio}
            </p>

            {/* Availability status line (anti-slop: clean text, no blinking dots) */}
            <div className="text-xs sm:text-sm text-neutral-400 border-l border-white/15 pl-3 py-1">
              <span className="text-neutral-200 font-medium">Current Status:</span> {profile.availability}
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-4 w-full sm:w-auto">
              <button
                onClick={onOpenResumeModal}
                className="px-5 py-3 rounded-xl text-sm font-medium text-white bg-white/5 hover:bg-white/10 border border-white/15 transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <FileText className="w-4 h-4 text-neutral-400" />
                <span>Interactive CV</span>
              </button>

              <a
                href="/contact"
                className="px-5 py-3 rounded-xl text-sm font-medium text-neutral-300 hover:text-white transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Mail className="w-4 h-4 text-neutral-400" />
                <span>Contact</span>
              </a>
            </div>

          </div>

          {/* Right Column: Interactive 3D Spotlight Glass Card */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div
              ref={cardRef}
              onMouseMove={handleCardMouseMove}
              onMouseLeave={handleCardMouseLeave}
              className="spotlight-card rounded-3xl p-3.5 sm:p-4 w-full max-w-md shadow-2xl transition-transform duration-200 ease-out will-change-transform group cursor-pointer"
              style={{
                transform: `perspective(1000px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`,
              }}
            >
              {/* Abstract systems visual */}
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-neutral-900 border border-white/10">
                <div
                  aria-hidden="true"
                  className="hero-system-visual absolute inset-0 overflow-hidden"
                  style={{ '--hero-accent': accentVals.hex, '--hero-accent-rgb': accentVals.rgb } as React.CSSProperties}
                >
                  <div className="hero-system-grid absolute inset-0 opacity-35" />
                  <div className="hero-system-glow absolute inset-0" />
                  <div className="hero-orbit hero-orbit-outer absolute left-1/2 top-[43%] aspect-square w-[76%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
                  <div className="hero-orbit hero-orbit-inner absolute left-1/2 top-[43%] aspect-square w-[55%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/15" />
                  <span className="hero-orbit-node absolute left-[17%] top-[29%] h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accentVals.hex, boxShadow: `0 0 24px rgba(${accentVals.rgb}, 0.75)` }} />
                  <span className="hero-orbit-node hero-orbit-node-delayed absolute right-[20%] top-[55%] h-2 w-2 rounded-full bg-white/80" style={{ boxShadow: `0 0 20px rgba(${accentVals.rgb}, 0.75)` }} />
                  <span className="hero-orbit-node hero-orbit-node-slow absolute bottom-[32%] left-[29%] h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accentVals.hex, boxShadow: `0 0 18px rgba(${accentVals.rgb}, 0.8)` }} />
                  <div className="absolute left-1/2 top-[43%] flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[2rem] border border-white/15 bg-neutral-950/70 shadow-[0_0_70px_rgba(var(--hero-accent-rgb),0.22)] backdrop-blur-xl sm:h-28 sm:w-28">
                    <Cpu className="h-12 w-12 sm:h-14 sm:w-14" strokeWidth={1.2} style={{ color: accentVals.hex }} />
                  </div>
                  <div className="absolute inset-x-0 top-[72%] flex justify-center">
                    <div className="rounded-full border border-white/10 bg-neutral-950/55 px-3 py-1.5 font-mono text-[10px] tracking-[0.28em] text-neutral-400 backdrop-blur-md">
                      C++ <span className="mx-1 text-neutral-600">/</span> SYSTEMC <span className="mx-1 text-neutral-600">/</span> SoC
                    </div>
                  </div>
                </div>

                {/* Subtle scrim overlay at bottom */}
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/85 via-neutral-950/20 to-transparent pointer-events-none" />

                {/* Bottom glass badge inside visual frame */}
                <div className="absolute bottom-4 left-4 right-4 p-3 rounded-xl bg-neutral-900/80 backdrop-blur-md border border-white/15 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="text-white font-semibold font-display text-sm">{profile.name}</div>
                    <div className="text-neutral-400 text-xs">Virtual Prototyping · SoC Systems</div>
                  </div>
                  <div
                    className="px-2.5 py-1 rounded-md text-[11px] font-mono border"
                    style={{
                      borderColor: `rgba(${accentVals.rgb}, 0.4)`,
                      color: accentVals.hex,
                      backgroundColor: 'rgba(0,0,0,0.5)'
                    }}
                  >
                    Engineering
                  </div>
                </div>
              </div>

              {/* Interactive Hover prompt */}
              <div className="pt-3 px-1 flex items-center justify-between text-xs text-neutral-400">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" style={{ color: accentVals.hex }} />
                  Cursor movement highlights card
                </span>
                <span className="font-mono text-[11px] text-neutral-400">3D Tilt & Specular</span>
              </div>
            </div>
          </div>

        </div>

        {/* Expertise highlights grounded in the professional experience */}
        <div className="mt-16 pt-8 border-t border-white/10">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: accentVals.hex }}>
                CV &amp; Experience
              </div>
              <h2 className="mt-2 text-2xl font-bold text-white font-display sm:text-3xl">
                Core Expertise
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-neutral-400">
              Fifteen years of modelling, architecture and verification across processor and system-level design.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {profile.expertiseHighlights.map((highlight) => (
              <div
                key={highlight.label}
                className="spotlight-card flex min-h-48 flex-col rounded-2xl p-5 transition-transform hover:-translate-y-1"
              >
                <div className="flex min-h-10 items-start text-sm font-semibold text-neutral-200">
                  {highlight.label}
                </div>
                <div
                  className="mt-2 flex min-h-12 items-center text-xl font-extrabold text-white font-display tracking-tight sm:text-2xl"
                >
                  {highlight.value}
                </div>
                <div className="mt-auto line-clamp-2 min-h-9 pt-2 text-xs leading-snug text-neutral-400">
                  {highlight.context}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};
