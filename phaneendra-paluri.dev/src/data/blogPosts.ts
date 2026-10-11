export const writingTopics = [
  {
    id: 'systems-architecture',
    title: 'Systems & Architecture',
    description: 'Notes on processor design, SoC architecture, and exploring complex systems.',
  },
  {
    id: 'modelling-verification',
    title: 'Modelling & Verification',
    description: 'Practical write-ups on SystemC, virtual prototyping, and verification workflows.',
  },
  {
    id: 'experiments-ideas',
    title: 'Experiments & Ideas',
    description: 'Lessons learned from projects, tools, and explorations in the lab.',
  },
] as const;

export const flowIntroductionPost = {
  slug: '/blogs/teaching-grammar-to-generate-instructions-introducing-flow',
  title: 'Teaching Grammar to Generate Instructions: Introducing FLOW',
  publishedAt: '2026-10-11',
  topicId: 'modelling-verification',
  seriesLabel: 'FLOW · Series 1',
  excerpt:
    'A hobby project on grammar-driven instruction stream generation for CPU verification, and an exploration of how test intent can live outside the generator.',
} as const;

export const blogPosts = [flowIntroductionPost];

export const formatPostDate = (publishedAt: string) =>
  new Intl.DateTimeFormat('en-US', {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${publishedAt}T00:00:00Z`));

export const formatArchiveDate = (yearMonth: string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${yearMonth}-01T00:00:00Z`));
