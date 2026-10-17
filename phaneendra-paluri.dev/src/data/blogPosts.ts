export const writingTopics = [
  {
    id: 'systems-architecture',
    title: 'Systems & Architecture',
    description: 'Notes on processor design, SoC architecture, and exploring complex systems.',
  },
  {
    id: 'virtual-prototyping',
    title: 'Virtual Prototyping',
    description: 'Practical write-ups on SystemC models, virtual platforms, and software development before silicon.',
  },
  {
    id: 'isg',
    title: 'ISG',
    description: 'Notes and articles about instruction-stream generation and FLOW.',
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
  linkedin?: {
    url: string;
    type: 'post' | 'article';
    likes?: number;
    comments?: number;
    reposts?: number;
  };
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

  const linkedinCountFields = ['linkedinLikes', 'linkedinComments', 'linkedinReposts'] as const;
  const hasLinkedInCounts = linkedinCountFields.some((field) => metadata[field] !== undefined && metadata[field] !== '');
  let linkedin: BlogPost['linkedin'];
  if (metadata.linkedinUrl) {
    let linkedinUrl: URL;
    try {
      linkedinUrl = new URL(metadata.linkedinUrl);
    } catch {
      throw new Error(`Blog post "${filePath}" has an invalid LinkedIn post URL.`);
    }
    if (
      linkedinUrl.protocol !== 'https:' ||
      (
        linkedinUrl.hostname !== 'linkedin.com' &&
        !linkedinUrl.hostname.endsWith('.linkedin.com') &&
        linkedinUrl.hostname !== 'lnkd.in'
      )
    ) {
      throw new Error(`Blog post "${filePath}" must use an HTTPS LinkedIn URL or lnkd.in short link.`);
    }

    const linkedinType = metadata.linkedinType;
    if (linkedinType !== undefined && linkedinType !== 'post' && linkedinType !== 'article') {
      throw new Error(`Blog post "${filePath}" has an invalid linkedinType.`);
    }
    linkedin = { url: linkedinUrl.toString(), type: linkedinType ?? 'post' };
    for (const [field, key] of [
      ['linkedinLikes', 'likes'],
      ['linkedinComments', 'comments'],
      ['linkedinReposts', 'reposts'],
    ] as const) {
      const value = metadata[field];
      if (value === undefined || value === '') continue;
      if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) {
        throw new Error(`Blog post "${filePath}" has an invalid ${field} count.`);
      }
      linkedin[key] = Number(value);
    }
  } else if (hasLinkedInCounts) {
    throw new Error(`Blog post "${filePath}" has LinkedIn counts but no linkedinUrl.`);
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
    ...(linkedin ? { linkedin } : {}),
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

export const getAdjacentFlowPosts = (post: BlogPost) => {
  const flowPosts = blogPosts
    .filter(({ seriesLabel }) => /^FLOW · Part \d+\b/.test(seriesLabel))
    .sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
  const currentIndex = flowPosts.findIndex(({ slug }) => slug === post.slug);

  if (currentIndex === -1) return {};

  return {
    previous: flowPosts[currentIndex - 1],
    next: flowPosts[currentIndex + 1],
  };
};

export interface ExternalLinkedInContent {
  title: string;
  description: string;
  type: 'post' | 'article';
  url: string;
  project?: string;
  likes?: number;
  comments?: number;
  reposts?: number;
}

export const externalLinkedInContent: ExternalLinkedInContent[] = [
  {
    title: 'The Competitive Edge Belongs to Developers Who Extract Maximum Intelligent Value from Every Token',
    description: 'A short reflection on getting more intelligent value from every token.',
    type: 'post',
    url: 'https://www.linkedin.com/posts/pvsphaneendra_the-competitive-edge-belongs-to-developers-ugcPost-7464016113404641280-z5-P/',
  },
  {
    title: 'Fun Learning MPU ISAs',
    description: 'A reflection on learning MPU instruction sets, including ARMv8-M and hardware support for atomic operations.',
    type: 'article',
    url: 'https://www.linkedin.com/pulse/fun-learning-mpu-isas-phaneendra-paluri-axpvc/',
    project: 'systems-architecture',
  },
  {
    title: 'A Few Very Useful Jekyll Commands',
    description: 'Handy Jekyll commands for installing packages, creating posts, and serving a site locally.',
    type: 'article',
    url: 'https://www.linkedin.com/pulse/few-very-useful-jekyll-commands-phaneendra-paluri/',
    project: 'cmakeforneophytes',
  },
  {
    title: 'Get Started Writing GXX Plugins',
    description: 'Getting started with writing GCC/G++ plugins.',
    type: 'article',
    url: 'https://www.linkedin.com/pulse/get-started-writing-gxx-plugings-phaneendra-paluri/',
    project: 'decoding-gxx',
  },
  {
    title: 'CMake for Neophytes',
    description: 'An introduction to CMake for C and C++ developers getting started with modern build systems.',
    type: 'article',
    url: 'https://www.linkedin.com/pulse/cmake-neophytes-phaneendra-paluri/',
    project: 'cmakeforneophytes',
  },
  {
    title: 'Create NuGet Packages Using Co-App Scripts',
    description: 'An introduction to creating NuGet packages with Co-App tools and .autopkg scripts.',
    type: 'article',
    url: 'https://www.linkedin.com/pulse/create-nuget-packages-using-co-app-scripts-phaneendra-paluri/',
    project: 'packmansys',
  },
];

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
