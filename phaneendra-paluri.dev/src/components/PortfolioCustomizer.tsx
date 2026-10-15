import React, { useState } from 'react';
import { Sliders, X, Sparkles, User, Palette, Check, RotateCcw } from 'lucide-react';
import { UserProfile, ThemeAccent } from '../types/portfolio';
import { getAccentValues } from './CursorSpotlight';

interface PortfolioCustomizerProps {
  profile: UserProfile;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  accent: ThemeAccent;
  onChangeAccent: (accent: ThemeAccent) => void;
  cursorGlowEnabled: boolean;
  onToggleCursorGlow: () => void;
  onResetToDefaults: () => void;
}

export const PortfolioCustomizer: React.FC<PortfolioCustomizerProps> = ({
  profile,
  onUpdateProfile,
  accent,
  onChangeAccent,
  cursorGlowEnabled,
  onToggleCursorGlow,
  onResetToDefaults,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'theme' | 'identity'>('theme');
  const accentVals = getAccentValues(accent);

  const accentsList: { id: ThemeAccent; name: string; color: string }[] = [
    { id: 'cyan', name: 'Hyperion Cyan', color: '#06b6d4' },
    { id: 'violet', name: 'Electric Violet', color: '#a855f7' },
    { id: 'emerald', name: 'Emerald Aurora', color: '#10b981' },
    { id: 'amber', name: 'Obsidian Amber', color: '#f59e0b' },
  ];

  return (
    <>
      {/* Floating Personalization Dock Trigger */}
      <div className="fixed bottom-5 right-5 z-40">
        <button
          onClick={() => setIsOpen(true)}
          className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-neutral-900/90 p-3 text-white shadow-2xl backdrop-blur-md transition-all hover:scale-105 hover:bg-neutral-800 active:scale-95 group sm:min-w-0"
          title="Customize Theme & Profile"
          aria-label="Customize Portfolio Theme and Profile"
        >
          <Sliders className="w-4 h-4 text-neutral-300 group-hover:text-white transition-colors" />
          <span className="hidden sm:inline text-xs font-semibold pr-1">Customize</span>
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: accentVals.hex }}
          />
        </button>
      </div>

      {/* Slide-out Customizer Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-neutral-900 border-l border-white/15 h-full flex flex-col shadow-2xl animate-slideLeft">
            
            {/* Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-neutral-950/80">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4" style={{ color: accentVals.hex }} />
                <h3 className="text-sm font-bold text-white font-display">
                  Portfolio Personalization
                </h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-neutral-400 hover:text-white bg-white/5 transition-colors"
                aria-label="Close customizer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sub-Tabs */}
            <div className="flex border-b border-white/10 p-2 gap-2 bg-neutral-950/40">
              <button
                onClick={() => setActiveTab('theme')}
                className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors ${
                  activeTab === 'theme'
                    ? 'bg-neutral-800 text-white border border-white/10'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Appearance & Lighting</span>
              </button>
              <button
                onClick={() => setActiveTab('identity')}
                className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors ${
                  activeTab === 'identity'
                    ? 'bg-neutral-800 text-white border border-white/10'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Your Information</span>
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              
              {activeTab === 'theme' ? (
                <>
                  {/* Accent Color Palette */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">
                      Dynamic Hover Accent
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {accentsList.map((item) => {
                        const isSelected = accent === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => onChangeAccent(item.id)}
                            className={`flex min-h-11 items-center justify-between rounded-xl border p-3 text-left transition-all ${
                              isSelected
                                ? 'bg-neutral-800 border-white/30 text-white shadow'
                                : 'bg-neutral-950/60 border-white/5 text-neutral-400 hover:border-white/15 hover:text-neutral-200'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span
                                className="w-3.5 h-3.5 rounded-full ring-2 ring-white/20"
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="text-xs font-medium">{item.name}</span>
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Cursor-Movement Card Highlighting Toggle */}
                  <div className="p-4 rounded-xl bg-neutral-950/70 border border-white/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" style={{ color: accentVals.hex }} />
                          <span>Cursor-Movement Card Highlighting</span>
                        </div>
                        <p className="text-[11px] text-neutral-400 mt-0.5 leading-snug">
                          Illuminates card borders and surfaces smoothly based on your cursor movement.
                        </p>
                      </div>

                      <button
                        onClick={onToggleCursorGlow}
                        className="ml-3 inline-flex h-11 w-11 shrink-0 items-center justify-center"
                        aria-label="Toggle card highlighting"
                      >
                        <span
                          className={`relative inline-flex h-6 w-11 items-center rounded-full p-0.5 transition-colors ${
                            cursorGlowEnabled ? 'bg-cyan-500' : 'bg-neutral-700'
                          }`}
                          style={{ backgroundColor: cursorGlowEnabled ? accentVals.hex : undefined }}
                        >
                          <span
                            aria-hidden="true"
                            className={`h-5 w-5 rounded-full bg-white transition-transform ${
                              cursorGlowEnabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Glassmorphism Specs Overview */}
                  <div className="p-4 rounded-xl bg-neutral-950/40 border border-white/5 space-y-2 text-xs">
                    <div className="text-neutral-400 font-medium">Active Optical Effects:</div>
                    <div className="flex justify-between text-neutral-300 font-mono text-[11px]">
                      <span>Surface Blur</span>
                      <span>20px Backing Filter</span>
                    </div>
                    <div className="flex justify-between text-neutral-300 font-mono text-[11px]">
                      <span>Card Refraction</span>
                      <span>Radial 450px Light Cone</span>
                    </div>
                    <div className="flex justify-between text-neutral-300 font-mono text-[11px]">
                      <span>Hero 3D Perspective</span>
                      <span>7° Dynamic Tilt</span>
                    </div>
                  </div>
                </>
              ) : (
                /* Identity Editor */
                <div className="space-y-4">
                  <div className="p-3 rounded-lg bg-neutral-950/70 border border-white/10 text-xs text-neutral-300">
                    Preview your own portfolio live by changing these fields. Changes apply immediately!
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                      Your Full Name
                    </label>
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => onUpdateProfile({ name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950/70 border border-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                      Professional Role / Headline
                    </label>
                    <input
                      type="text"
                      value={profile.role}
                      onChange={(e) => onUpdateProfile({ role: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950/70 border border-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                      Primary Location
                    </label>
                    <input
                      type="text"
                      value={profile.location}
                      onChange={(e) => onUpdateProfile({ location: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950/70 border border-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                      Availability Status
                    </label>
                    <input
                      type="text"
                      value={profile.availability}
                      onChange={(e) => onUpdateProfile({ availability: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950/70 border border-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => onUpdateProfile({ email: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950/70 border border-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                      Executive Bio
                    </label>
                    <textarea
                      rows={3}
                      value={profile.bio}
                      onChange={(e) => onUpdateProfile({ bio: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950/70 border border-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 resize-none"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={onResetToDefaults}
                      className="w-full min-h-11 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-medium text-neutral-300 transition-colors hover:bg-white/10 hover:text-white flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Profile to Initial Showcase</span>
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 bg-neutral-950/80 flex justify-between items-center text-xs text-neutral-400">
              <span>Lumina Studio</span>
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-950"
                style={{ backgroundColor: accentVals.hex }}
              >
                Apply & Close
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
