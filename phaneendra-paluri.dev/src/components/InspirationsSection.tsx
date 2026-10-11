import React from 'react';
import { Activity, Bot, Cpu, Radio, Sparkles } from 'lucide-react';
import { ThemeAccent } from '../types/portfolio';
import { getAccentValues } from './CursorSpotlight';

interface InspirationsSectionProps {
  accent: ThemeAccent;
  embedded?: boolean;
}

const inspirationTopics = [
  {
    icon: Cpu,
    title: 'From Circuits to Silicon',
    text: 'My interest in electronics began during a visit to an Air Force Base Station, where I saw dots blinking on a compass. My father, a radar technician, explained that they were aeroplanes. That moment inspired me to study Electronics and Communications, and to appreciate how atomic physics enables semiconductor integrated circuits.',
  },
  {
    icon: Radio,
    title: 'The Language of Communication',
    text: 'Electronics is the foundation of modern communication. I have always been fascinated by signal encoding and decoding, and by the engineering behind encryption and decryption. Communication systems show how data can be sent reliably, securely, and efficiently across any distance.',
  },
  {
    icon: Bot,
    title: 'Where Hardware Meets Intelligence',
    text: 'Programming circuit boards led me to flashing bitstreams onto FPGAs and discovering simulation. My first role in robotics then opened my eyes to data handling and processing. Artificial intelligence and computer vision continue to bridge the gap between the human brain and a robot’s thinking power.',
  },
];

export const InspirationsSection: React.FC<InspirationsSectionProps> = ({ accent, embedded = false }) => {
  const accentVals = getAccentValues(accent);

  return (
    <section id="inspirations" className={`relative overflow-hidden ${embedded ? '' : 'border-t border-white/5 py-24 sm:py-28'}`}>
      <div
        aria-hidden="true"
        className="absolute -top-28 right-0 w-[32rem] h-[32rem] rounded-full blur-3xl pointer-events-none"
        style={{ background: `radial-gradient(circle, rgba(${accentVals.rgb}, 0.12), transparent 68%)` }}
      />
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        <div className="relative grid lg:grid-cols-[1fr_0.9fr] items-center gap-10 lg:gap-16 mb-20">
          <div>
            <div
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] mb-5"
              style={{ color: accentVals.hex }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              A lifelong curiosity
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white font-display tracking-tight text-balance leading-[1.08]">
              Inspired by the
              <span className="block" style={{ color: accentVals.hex }}>Signals All Around Us.</span>
            </h1>
            <p className="text-neutral-300 text-base sm:text-lg mt-6 leading-relaxed max-w-xl">
              I’m an avid follower of the latest electronics and communication developments happening in and around us.
              What began with blinking dots on a radar has grown into a fascination with the invisible systems that
              connect, compute, and bring machines to life.
            </p>
            <div className="mt-7 flex flex-wrap gap-2 text-xs font-medium text-neutral-300">
              {['Electronics', 'Communication', 'Embedded systems', 'Robotics'].map((topic) => (
                <span
                  key={topic}
                  className="rounded-full border px-3 py-1.5"
                  style={{
                    borderColor: `rgba(${accentVals.rgb}, 0.25)`,
                    backgroundColor: `rgba(${accentVals.rgb}, 0.07)`,
                  }}
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>

          <div
            className="spotlight-card relative rounded-[2rem] overflow-hidden p-5 sm:p-8 min-h-[320px] sm:min-h-[390px] flex items-center justify-center"
            style={{
              background: `radial-gradient(ellipse at 50% 45%, rgba(${accentVals.rgb}, 0.13), rgba(18, 18, 24, 0.88) 68%)`,
            }}
          >
            <div className="absolute top-5 left-5 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-neutral-500 font-mono">
              <Activity className="w-3.5 h-3.5" style={{ color: accentVals.hex }} />
              Curiosity in motion
            </div>
            <svg
              viewBox="0 0 520 360"
              role="img"
              aria-label="Illustration of a radar signal flowing through a microchip to an intelligent robot"
              className="w-full max-w-[510px] h-auto"
              fill="none"
            >
              <defs>
                <linearGradient id="inspiration-line" x1="54" y1="180" x2="466" y2="180" gradientUnits="userSpaceOnUse">
                  <stop stopColor={accentVals.hex} stopOpacity=".15" />
                  <stop offset=".5" stopColor={accentVals.hex} />
                  <stop offset="1" stopColor={accentVals.hex} stopOpacity=".18" />
                </linearGradient>
                <radialGradient id="inspiration-glow">
                  <stop stopColor={accentVals.hex} stopOpacity=".35" />
                  <stop offset="1" stopColor={accentVals.hex} stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle cx="260" cy="180" r="148" fill="url(#inspiration-glow)" />
              <circle cx="260" cy="180" r="132" stroke={accentVals.hex} strokeOpacity=".09" strokeDasharray="3 8" />
              <circle cx="260" cy="180" r="101" stroke={accentVals.hex} strokeOpacity=".13" />
              <path d="M69 180h89m204 0h89" stroke="url(#inspiration-line)" strokeWidth="2" />
              <path d="M85 180a42 42 0 0 1 42-42m-42 42a42 42 0 0 0 42 42m-26-42a26 26 0 0 1 26-26m-26 26a26 26 0 0 0 26 26" stroke={accentVals.hex} strokeOpacity=".6" strokeWidth="1.5" />
              <circle cx="128" cy="180" r="4" fill={accentVals.hex} />
              <rect x="202" y="122" width="116" height="116" rx="22" fill="#10151c" stroke={accentVals.hex} strokeOpacity=".55" />
              <rect x="216" y="136" width="88" height="88" rx="15" fill={accentVals.hex} fillOpacity=".08" stroke={accentVals.hex} strokeOpacity=".28" />
              <path d="M224 114v8m18-8v8m18-8v8m18-8v8m18-8v8m18-8v8M224 238v8m18-8v8m18-8v8m18-8v8m18-8v8m18-8v8M194 144h8m-8 18h8m-8 18h8m-8 18h8m-8 18h8m124-72h8m-8 18h8m-8 18h8m-8 18h8m-8 18h8" stroke={accentVals.hex} strokeOpacity=".7" strokeWidth="2" strokeLinecap="round" />
              <path d="M240 181h13l8-17 12 34 9-17h10" stroke={accentVals.hex} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="392" y="148" width="58" height="66" rx="18" fill="#10151c" stroke={accentVals.hex} strokeOpacity=".55" />
              <path d="M407 177h.5m27-.5h.5M410 193c5 6 17 6 22 0M421 148v-10m-9 76v8m24-8v8" stroke={accentVals.hex} strokeWidth="2" strokeLinecap="round" />
              <circle cx="421" cy="132" r="3" fill={accentVals.hex} />
              <circle cx="158" cy="180" r="4" fill={accentVals.hex}>
                <animate attributeName="opacity" values=".25;1;.25" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx="366" cy="180" r="4" fill={accentVals.hex}>
                <animate attributeName="opacity" values="1;.25;1" dur="2s" repeatCount="indefinite" />
              </circle>
              <text x="102" y="260" fill="#737b88" fontSize="10" fontFamily="monospace" letterSpacing="2">SIGNAL</text>
              <text x="227" y="275" fill="#737b88" fontSize="10" fontFamily="monospace" letterSpacing="2">PROCESS</text>
              <text x="392" y="242" fill="#737b88" fontSize="10" fontFamily="monospace" letterSpacing="2">INTELLIGENCE</text>
              <path d="M128 272h293" stroke={accentVals.hex} strokeOpacity=".22" strokeDasharray="2 6" />
            </svg>
            <div className="absolute bottom-5 right-5 text-[10px] font-mono tracking-widest text-neutral-600">01 / 03</div>
          </div>
        </div>

        <div className="mb-7 max-w-2xl">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] mb-2" style={{ color: accentVals.hex }}>
            The journey so far
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white font-display tracking-tight">
            From a Curious Question to a World of Possibility
          </h2>
        </div>

        <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div
            aria-hidden="true"
            className="hidden lg:block absolute top-8 left-[16.66%] right-[16.66%] border-t border-dashed"
            style={{ borderColor: `rgba(${accentVals.rgb}, 0.3)` }}
          />
          {inspirationTopics.map(({ icon: Icon, title, text }, index) => (
            <article key={title} className="spotlight-card relative rounded-3xl p-6 sm:p-8 pt-7">
              <div className="relative z-10 flex items-center gap-3 mb-6">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center border"
                  style={{
                    color: accentVals.hex,
                    backgroundColor: '#11151b',
                    borderColor: `rgba(${accentVals.rgb}, 0.4)`,
                    boxShadow: `0 0 24px rgba(${accentVals.rgb}, 0.12)`,
                  }}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="text-xs font-mono tracking-widest" style={{ color: accentVals.hex }}>
                  0{index + 1} <span className="text-neutral-600">/ 03</span>
                </div>
              </div>
              <h2 className="text-xl font-bold text-white font-display">{title}</h2>
              <p className="text-neutral-400 text-sm leading-relaxed mt-3">{text}</p>
            </article>
          ))}
        </div>

        <div
          className="mt-5 rounded-3xl border p-6 sm:p-9 relative overflow-hidden"
          style={{
            borderColor: `rgba(${accentVals.rgb}, 0.25)`,
            background: `linear-gradient(115deg, rgba(${accentVals.rgb}, 0.13), rgba(18, 18, 24, 0.94) 54%)`,
          }}
        >
          <div className="absolute -right-5 -bottom-14 opacity-[0.07]">
            <Cpu className="w-56 h-56" />
          </div>
          <div className="relative max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] mb-3" style={{ color: accentVals.hex }}>
              <span className="inline-flex items-center gap-2"><Sparkles className="w-3.5 h-3.5" />Always in progress</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white font-display">Still Learning. Still Exploring.</h2>
            <p className="text-neutral-300 text-sm sm:text-base leading-relaxed mt-3">
              I first gravitated toward embedded software, then fell for embedded hardware. I’m always excited to
              explore the inner workings of microcontrollers and processors, and to share what I learn along the way.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
