import React, { useState, useEffect } from 'react';
import { Menu, X, ArrowUpRight } from 'lucide-react';
import { ThemeAccent } from '../types/portfolio';
import { getAccentValues } from './CursorSpotlight';

interface NavbarProps {
  name: string;
  accent: ThemeAccent;
  onOpenResumeModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ name, accent, onOpenResumeModal }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const accentVals = getAccentValues(accent);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'About Me', href: '/' },
    { label: 'My Journey', href: '/journey' },
    { label: 'Hobbies & Labs', href: '/projects' },
    { label: 'CV & Experience', href: '/experience' },
    { label: 'Blogs / Posts', href: '/blogs' },
    { label: 'Contact', href: '/contact' },
  ];

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          scrolled
            ? 'bg-neutral-950/80 backdrop-blur-md border-b border-white/8 py-3.5 shadow-2xl shadow-black/50'
            : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-8 flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <span className="text-lg sm:text-xl font-bold tracking-tight text-white whitespace-nowrap shrink-0 font-display">
            {name}
          </span>

          {/* Zone 2: 4–5 concise single-line text navigation links */}
          <nav className="hidden xl:flex items-center gap-6 text-sm font-medium text-neutral-300">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="hover:text-white transition-colors relative py-1 whitespace-nowrap shrink-0 group"
              >
                {link.label}
                <span
                  className="absolute bottom-0 left-0 w-0 h-0.5 transition-all duration-200 group-hover:w-full"
                  style={{ backgroundColor: accentVals.hex }}
                />
              </a>
            ))}
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onOpenResumeModal}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg text-white transition-all duration-200 whitespace-nowrap shrink-0 shadow-lg hover:shadow-cyan-500/20 active:scale-95"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: `1px solid rgba(${accentVals.rgb}, 0.35)`,
              }}
            >
              <span>View Full CV</span>
              <ArrowUpRight className="w-3.5 h-3.5 opacity-70" />
            </button>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 text-neutral-300 hover:text-white bg-white/5 border border-white/10"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-30 xl:hidden bg-neutral-950/95 backdrop-blur-xl pt-24 px-6 flex flex-col gap-6 animate-fadeIn">
          <nav className="flex flex-col gap-4 text-base font-medium">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 px-3 rounded-lg text-neutral-200 hover:text-white hover:bg-white/5 transition-colors border-b border-white/5"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="pt-4 flex flex-col gap-3">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenResumeModal();
              }}
              className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white text-center bg-white/10 border border-white/15"
              style={{ borderColor: `rgba(${accentVals.rgb}, 0.4)` }}
            >
              View Full CV & Resume
            </button>
            <a
              href="/contact"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-center text-neutral-950 font-medium"
              style={{ backgroundColor: accentVals.hex }}
            >
              Get in Touch
            </a>
          </div>
        </div>
      )}
    </>
  );
};
