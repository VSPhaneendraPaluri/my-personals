import React, { useEffect } from 'react';
import { ThemeAccent } from '../types/portfolio';

interface CursorSpotlightProps {
  accent: ThemeAccent;
  enabled: boolean;
}

export const getAccentValues = (accent: ThemeAccent) => {
  switch (accent) {
    case 'violet':
      return {
        hex: '#a855f7',
        rgb: '168, 85, 247',
        name: 'Electric Violet',
        spotlight: 'rgba(168, 85, 247, 0.45)',
        glow: 'rgba(168, 85, 247, 0.12)',
        bgGlow: 'rgba(147, 51, 234, 0.08)',
        border: 'border-purple-500/30',
        text: 'text-purple-400',
        badge: 'bg-purple-950/60 text-purple-300 border-purple-800/40'
      };
    case 'emerald':
      return {
        hex: '#10b981',
        rgb: '16, 185, 129',
        name: 'Emerald Aurora',
        spotlight: 'rgba(16, 185, 129, 0.45)',
        glow: 'rgba(16, 185, 129, 0.12)',
        bgGlow: 'rgba(5, 150, 105, 0.08)',
        border: 'border-emerald-500/30',
        text: 'text-emerald-400',
        badge: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/40'
      };
    case 'amber':
      return {
        hex: '#f59e0b',
        rgb: '245, 158, 11',
        name: 'Obsidian Amber',
        spotlight: 'rgba(245, 158, 11, 0.45)',
        glow: 'rgba(245, 158, 11, 0.12)',
        bgGlow: 'rgba(217, 119, 6, 0.08)',
        border: 'border-amber-500/30',
        text: 'text-amber-400',
        badge: 'bg-amber-950/60 text-amber-300 border-amber-800/40'
      };
    case 'cyan':
    default:
      return {
        hex: '#06b6d4',
        rgb: '6, 182, 212',
        name: 'Hyperion Cyan',
        spotlight: 'rgba(6, 182, 212, 0.45)',
        glow: 'rgba(6, 182, 212, 0.12)',
        bgGlow: 'rgba(14, 165, 233, 0.08)',
        border: 'border-cyan-500/30',
        text: 'text-cyan-400',
        badge: 'bg-cyan-950/60 text-cyan-300 border-cyan-800/40'
      };
  }
};

export const CursorSpotlight: React.FC<CursorSpotlightProps> = ({ accent, enabled }) => {
  const accentVals = getAccentValues(accent);

  // Set CSS variables for cards and interactive highlights
  useEffect(() => {
    document.documentElement.style.setProperty('--spotlight-color', accentVals.spotlight);
    document.documentElement.style.setProperty('--spotlight-glow', accentVals.glow);
  }, [accent, accentVals]);

  // Track cursor movement on cards and highlight targets
  useEffect(() => {
    if (!enabled) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Find any cards or highlight targets under the cursor or within proximity
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const card = target.closest('.spotlight-card, .spotlight-interactive') as HTMLElement | null;
      if (card) {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [enabled]);

  return null;
};
