export interface ExpertiseHighlight {
  label: string;
  value: string;
  context: string;
}

export interface UserProfile {
  name: string;
  pronouns?: string;
  role: string;
  location: string;
  localTimezone: string;
  availability: string;
  bio: string;
  phone?: string;
  email: string;
  github: string;
  linkedin: string;
  twitter: string;
  expertiseHighlights: ExpertiseHighlight[];
}

export interface ExperienceItem {
  id: string;
  company: string;
  location: string;
  roles: {
    title: string;
    period: string;
  }[];
  categories: {
    title: string;
    details: string[];
  }[];
}

export interface EducationItem {
  id: string;
  degree: string;
  institution: string;
  period: string;
  location: string;
  honors?: string;
  details: string[];
}

export interface SkillCategory {
  id: string;
  title: string;
  skills: {
    name: string;
    description: string;
  }[];
}

export interface ConferenceItem {
  id: string;
  event: string;
  year: string;
  contribution: string;
  session?: string;
  link?: string;
}

export interface InstitutionHighlight {
  id: string;
  name: string;
  context: string;
  link: string;
  logo: string;
}

export interface PastimeItem {
  id: string;
  name: string;
  image: string;
  imageAlt: string;
}

export type ThemeAccent = 'cyan' | 'violet' | 'amber' | 'emerald';
