import React from 'react';
import { ArrowUp, Github, Linkedin, Mail } from 'lucide-react';
import { UserProfile, ThemeAccent } from '../types/portfolio';
import { getAccentValues } from './CursorSpotlight';

interface FooterProps {
  profile: UserProfile;
  accent: ThemeAccent;
}

export const Footer: React.FC<FooterProps> = ({ profile, accent }) => {
  const accentVals = getAccentValues(accent);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="border-t border-white/10 bg-neutral-950 py-12 relative z-10">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        
        {/* Brand & Rights */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-center sm:text-left">
          <span className="text-base font-bold text-white font-display tracking-tight">
            {profile.name}
          </span>
          <span className="text-xs text-neutral-400">
            © {new Date().getFullYear()} All rights reserved. Crafted with dynamic hover spotlights.
          </span>
        </div>

        {/* Links & Scroll to top */}
        <div className="flex items-center gap-4">
          <a
            href={profile.github}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 text-neutral-400 hover:text-white transition-colors"
            aria-label="GitHub"
          >
            <Github className="w-4 h-4" />
          </a>
          <a
            href={profile.linkedin}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 text-neutral-400 hover:text-white transition-colors"
            aria-label="LinkedIn"
          >
            <Linkedin className="w-4 h-4" />
          </a>
          <a
            href={`mailto:${profile.email}`}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 text-neutral-400 hover:text-white transition-colors"
            aria-label="Email"
          >
            <Mail className="w-4 h-4" />
          </a>

          <button
            onClick={scrollToTop}
            className="ml-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
            title="Scroll to top"
            aria-label="Back to top"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>

      </div>
    </footer>
  );
};
