import { useState } from 'react';
import {
  initialProfile,
  experiences,
  educations,
  skillCategories,
  careerSummary,
  domainsOfInterest,
  conferenceParticipations,
  institutionHighlights,
  pastimes,
} from './data/portfolioData';
import { UserProfile, ThemeAccent } from './types/portfolio';
import { Navbar } from './components/Navbar';
import { AboutMeSection } from './components/AboutMeSection';
import { CVSection } from './components/CVSection';
import { HobbiesSection } from './components/HobbiesSection';
import { JourneySection } from './components/JourneySection';
import { ContactSection } from './components/ContactSection';
import { BlogsSection } from './components/BlogsSection';
import { FlowIntroductionPost } from './components/FlowIntroductionPost';
import { MarkdownBlogPost } from './components/MarkdownBlogPost';
import { blogPosts } from './data/blogPosts';
import { Footer } from './components/Footer';
import { ResumeModal } from './components/ResumeModal';
import { CursorSpotlight } from './components/CursorSpotlight';
import { PortfolioCustomizer } from './components/PortfolioCustomizer';

export default function App() {
  const currentPage = window.location.pathname.replace(/\/+$/, '') || '/';
  const currentBlogPost = blogPosts.find(({ slug }) => slug === currentPage);
  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('lumina_profile_v1');
      if (saved) {
        const savedProfile = JSON.parse(saved) as UserProfile;
        const updatedProfile = {
          ...savedProfile,
          ...(savedProfile.name === 'Julian Rivera' ? { name: initialProfile.name } : {}),
          expertiseHighlights: initialProfile.expertiseHighlights
        };
        localStorage.setItem('lumina_profile_v1', JSON.stringify(updatedProfile));
        return updatedProfile;
      }
    } catch (e) {
      // ignore
    }
    return initialProfile;
  });

  const [accent, setAccent] = useState<ThemeAccent>(() => {
    try {
      const saved = localStorage.getItem('lumina_accent_v1') as ThemeAccent;
      if (saved && ['cyan', 'violet', 'amber', 'emerald'].includes(saved)) return saved;
    } catch (e) {
      // ignore
    }
    return 'cyan';
  });

  const [cursorGlowEnabled, setCursorGlowEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('lumina_cursor_glow');
      if (saved !== null) return saved === 'true';
    } catch (e) {
      // ignore
    }
    return true;
  });

  const [resumeModalOpen, setResumeModalOpen] = useState(false);

  // Sync profile edits to localStorage
  const handleUpdateProfile = (updated: Partial<UserProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...updated };
      try {
        localStorage.setItem('lumina_profile_v1', JSON.stringify(next));
      } catch (e) {
        // ignore
      }
      return next;
    });
  };

  const handleChangeAccent = (newAccent: ThemeAccent) => {
    setAccent(newAccent);
    try {
      localStorage.setItem('lumina_accent_v1', newAccent);
    } catch (e) {
      // ignore
    }
  };

  const handleToggleCursorGlow = () => {
    setCursorGlowEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('lumina_cursor_glow', String(next));
      } catch (e) {
        // ignore
      }
      return next;
    });
  };

  const handleResetToDefaults = () => {
    setProfile(initialProfile);
    setAccent('cyan');
    try {
      localStorage.removeItem('lumina_profile_v1');
      localStorage.removeItem('lumina_accent_v1');
    } catch (e) {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 relative selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Dynamic Cursor Spotlight & Ambient Illumination */}
      <CursorSpotlight accent={accent} enabled={cursorGlowEnabled} />

      {/* Top Bar Navigation (Strict 3-zone contract) */}
      <Navbar
        name={profile.name}
        accent={accent}
        onOpenResumeModal={() => setResumeModalOpen(true)}
      />

      {/* Current Page */}
      <main className="relative z-10">
        {currentPage === '/experience' ? (
          <CVSection
            experiences={experiences}
            educations={educations}
            skillCategories={skillCategories}
            conferences={conferenceParticipations}
            careerSummary={careerSummary}
            domainsOfInterest={domainsOfInterest}
            accent={accent}
            onOpenResumeModal={() => setResumeModalOpen(true)}
          />
        ) : currentPage === '/journey' || currentPage === '/inspirations' || currentPage === '/triumphs' ? (
          <JourneySection
            institutions={institutionHighlights}
            accent={accent}
          />
        ) : currentPage === '/projects' ? (
          <HobbiesSection pastimes={pastimes} accent={accent} />
        ) : currentPage === '/contact' ? (
          <ContactSection profile={profile} accent={accent} />
        ) : currentPage === '/blogs' ? (
          <BlogsSection accent={accent} />
        ) : currentBlogPost ? (
          currentBlogPost.slug === '/blogs/teaching-grammar-to-generate-instructions-introducing-flow'
            ? <FlowIntroductionPost accent={accent} />
            : <MarkdownBlogPost post={currentBlogPost} accent={accent} />
        ) : (
          <AboutMeSection
            profile={profile}
            accent={accent}
          />
        )}
      </main>

      {/* Footer */}
      <Footer profile={profile} accent={accent} />

      {/* Full Curriculum Vitae Modal (ATS-compatible & Printable) */}
      <ResumeModal
        isOpen={resumeModalOpen}
        onClose={() => setResumeModalOpen(false)}
        profile={profile}
        experiences={experiences}
        educations={educations}
        skillCategories={skillCategories}
        careerSummary={careerSummary}
        domainsOfInterest={domainsOfInterest}
        conferences={conferenceParticipations}
        accent={accent}
      />

      {/* Customizer / Personalization Dock */}
      <PortfolioCustomizer
        profile={profile}
        onUpdateProfile={handleUpdateProfile}
        accent={accent}
        onChangeAccent={handleChangeAccent}
        cursorGlowEnabled={cursorGlowEnabled}
        onToggleCursorGlow={handleToggleCursorGlow}
        onResetToDefaults={handleResetToDefaults}
      />

    </div>
  );
}
