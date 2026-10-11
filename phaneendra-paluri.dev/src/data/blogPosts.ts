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

export interface BlogPost {
  slug: string;
  title: string;
  publishedAt: string;
  topicId: string;
  seriesLabel: string;
  excerpt: string;
  body: string;
}

const parsePostFile = (filePath: string, content: string): BlogPost => {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    throw new Error(`Blog post "${filePath}" is missing its front matter.`);
  }

  const [, frontMatter, body] = match;
  const metadata = Object.fromEntries(
    frontMatter.split(/\r?\n/).map((line) => {
      const separator = line.indexOf(':');
      if (separator < 1) {
        throw new Error(`Invalid front matter line in blog post "${filePath}": ${line}`);
      }
      return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
    }),
  );
  const requiredFields = ['publishedAt', 'topicId', 'seriesLabel', 'excerpt'] as const;
  for (const field of requiredFields) {
    if (!metadata[field]) {
      throw new Error(`Blog post "${filePath}" is missing required front matter field "${field}".`);
    }
  }

  const title = body.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (!title) {
    throw new Error(`Blog post "${filePath}" must start with a level-one Markdown heading.`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(metadata.publishedAt) || Number.isNaN(Date.parse(`${metadata.publishedAt}T00:00:00Z`))) {
    throw new Error(`Blog post "${filePath}" has an invalid publishedAt date.`);
  }
  if (!writingTopics.some(({ id }) => id === metadata.topicId)) {
    throw new Error(`Blog post "${filePath}" has an unknown topicId "${metadata.topicId}".`);
  }

  const fileName = filePath.split('/').pop()?.replace(/\.md$/, '') ?? '';
  const slugPart = fileName.replace(/^\d{8}_?/, '').replace(/_/g, '-').toLowerCase();
  if (!slugPart) {
    throw new Error(`Blog post "${filePath}" must have a descriptive filename.`);
  }

  return {
    slug: `/blogs/${slugPart}`,
    title,
    publishedAt: metadata.publishedAt,
    topicId: metadata.topicId,
    seriesLabel: metadata.seriesLabel,
    excerpt: metadata.excerpt,
    body: body.trim(),
  };
};

const postFiles = import.meta.glob<string>('../../../blogposts/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

export const blogPosts = Object.entries(postFiles)
  .map(([filePath, content]) => parsePostFile(filePath, content))
  .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

const getFlowIntroductionPost = (): BlogPost => {
  const post = blogPosts.find(
    ({ slug }) => slug === '/blogs/teaching-grammar-to-generate-instructions-introducing-flow',
  );
  if (!post) {
    throw new Error('The FLOW introduction post is missing from the blogposts directory.');
  }
  return post;
};

export const flowIntroductionPost = getFlowIntroductionPost();

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
