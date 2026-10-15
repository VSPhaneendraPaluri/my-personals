import React, { useState, useEffect } from 'react';
import { Mail, Send, Check, Copy, Clock, Globe, ArrowUpRight, Github, Linkedin, MessageSquare, Sparkles } from 'lucide-react';
import { UserProfile, ThemeAccent } from '../types/portfolio';
import { getAccentValues } from './CursorSpotlight';

interface ContactSectionProps {
  profile: UserProfile;
  accent: ThemeAccent;
}

export const ContactSection: React.FC<ContactSectionProps> = ({ profile, accent }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'Virtual Prototyping Consultancy',
    message: ''
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [copied, setCopied] = useState(false);
  const [localTime, setLocalTime] = useState('');
  const accentVals = getAccentValues(accent);

  // Live time ticker for profile timezone
  useEffect(() => {
    const updateTime = () => {
      try {
        const now = new Date();
        const timeString = new Intl.DateTimeFormat('en-US', {
          timeZone: profile.localTimezone || 'America/Los_Angeles',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        }).format(now);
        setLocalTime(timeString);
      } catch (e) {
        setLocalTime(new Date().toLocaleTimeString());
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [profile.localTimezone]);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(profile.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;

    setStatus('sending');
    // Simulate realistic async delivery
    setTimeout(() => {
      setStatus('sent');
      setFormData({ name: '', email: '', subject: 'Virtual Prototyping Consultancy', message: '' });
      setTimeout(() => setStatus('idle'), 6000);
    }, 1200);
  };

  return (
    <section id="contact" className="py-24 relative border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: accentVals.hex }}>
            Direct Contact &amp; Inquiries
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white font-display tracking-tight text-balance">
            Let's Engineer Something Extraordinary Together.
          </h2>
          <p className="text-neutral-400 text-sm sm:text-base mt-3 leading-relaxed">
            Whether inquiring about Staff/Principal technical leadership, architectural advisory, or creative technology installations.
          </p>
        </div>

        {/* 2-Column Glassmorphism Hub */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Left Column: Glassmorphism Meta & Direct Actions */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
            
            {/* Glass Info Card with spotlight hover */}
            <div data-card-theme="contact" className="spotlight-card rounded-3xl p-6 sm:p-8 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between pb-6 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: accentVals.hex }} />
                    <span className="text-xs font-mono font-medium text-neutral-300">
                      {profile.availability}
                    </span>
                  </div>
                  <Sparkles className="w-4 h-4 opacity-70" style={{ color: accentVals.hex }} />
                </div>

                {/* Direct Email with 1-click Copy */}
                <div className="mt-6">
                  <div className="text-xs font-medium text-neutral-400 mb-1">Direct Email Address</div>
                  <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-neutral-900/90 border border-white/10 group">
                    <span className="text-sm sm:text-base font-mono text-white truncate">
                      {profile.email}
                    </span>
                    <button
                      onClick={handleCopyEmail}
                      className="p-2 rounded-xl text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors shrink-0"
                      title="Copy to clipboard"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {copied && (
                    <div className="text-xs text-emerald-400 mt-1.5 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Email copied to clipboard
                    </div>
                  )}
                </div>

                {/* Live Local Time & Location */}
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/5">
                    <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Local Time</span>
                    </div>
                    <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-white">
                      {localTime || 'Loading...'}
                    </div>
                    <div className="text-[11px] text-neutral-500 font-mono mt-0.5">PT / West Coast</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/5">
                    <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-1">
                      <Globe className="w-3.5 h-3.5" />
                      <span>Location</span>
                    </div>
                    <div className="text-sm sm:text-base font-semibold text-white truncate">
                      {profile.location.split('&')[0]}
                    </div>
                    <div className="text-[11px] text-neutral-500 font-mono mt-0.5">Global Remote</div>
                  </div>
                </div>
              </div>

              {/* Social Profiles Grid */}
              <div className="mt-8 pt-6 border-t border-white/10">
                <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">
                  Verified Networks
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <a
                    href={profile.github}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-white/5 hover:bg-white/10 text-neutral-200 hover:text-white border border-white/10 transition-colors"
                  >
                    <Github className="w-4 h-4" />
                    <span>GitHub</span>
                    <ArrowUpRight className="w-3 h-3 opacity-60" />
                  </a>

                  <a
                    href={profile.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-white/5 hover:bg-white/10 text-neutral-200 hover:text-white border border-white/10 transition-colors"
                  >
                    <Linkedin className="w-4 h-4" />
                    <span>LinkedIn</span>
                    <ArrowUpRight className="w-3 h-3 opacity-60" />
                  </a>

                  <a
                    href={profile.twitter}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-white/5 hover:bg-white/10 text-neutral-200 hover:text-white border border-white/10 transition-colors"
                  >
                    <span className="font-bold text-xs">𝕏</span>
                    <span>Twitter / X</span>
                    <ArrowUpRight className="w-3 h-3 opacity-60" />
                  </a>
                </div>
              </div>

            </div>

          </div>

          {/* Right Column: Interactive Glassmorphism Message Form */}
          <div className="lg:col-span-7">
            <div data-card-theme="contact" className="spotlight-card rounded-3xl p-6 sm:p-10 border border-white/10 shadow-2xl relative">
              <h3 className="text-xl sm:text-2xl font-bold text-white font-display">
                Dispatch an Encrypted Message
              </h3>
              <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                Typical response time within 24 business hours.
              </p>

              {status === 'sent' ? (
                <div className="my-10 p-8 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-center animate-fadeIn">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                    <Check className="w-6 h-6" />
                  </div>
                  <h4 className="text-lg font-bold text-white">Message Dispatched Successfully</h4>
                  <p className="text-sm text-neutral-300 mt-1 max-w-md mx-auto">
                    Thank you for reaching out. Julian will review your message and reply promptly.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                        Your Name
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Elena Vance"
                        className="w-full px-4 py-3 rounded-xl bg-neutral-950/70 border border-white/10 text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition-all text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                        Work Email
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="elena@company.com"
                        className="w-full px-4 py-3 rounded-xl bg-neutral-950/70 border border-white/10 text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition-all text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                      Inquiry Category
                    </label>
                    <select
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-neutral-950/70 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-cyan-400 transition-all text-sm cursor-pointer"
                    >
                      <option value="Virtual Prototyping Consultancy">Virtual Prototyping Consultancy</option>
                      <option value="Academic Interaction">Academic Interaction</option>
                      <option value="Miscellaneous/Others">Miscellaneous/Others</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                      Message
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Write your message here..."
                      className="w-full px-4 py-3 rounded-xl bg-neutral-950/70 border border-white/10 text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition-all text-sm resize-y"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-xs text-neutral-500 font-mono">
                      Encrypted End-to-End
                    </span>

                    <button
                      type="submit"
                      disabled={status === 'sending'}
                      className="px-6 py-3 rounded-xl text-xs sm:text-sm font-semibold text-neutral-950 transition-all duration-200 active:scale-95 flex items-center gap-2 shadow-lg disabled:opacity-50"
                      style={{ backgroundColor: accentVals.hex }}
                    >
                      {status === 'sending' ? (
                        <>
                          <div className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                          <span>Dispatching...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Transmit Message</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
