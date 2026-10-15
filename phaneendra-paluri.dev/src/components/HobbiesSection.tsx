import React, { useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight, BookOpenText, Braces, Code2, Cpu, FlaskConical, GitBranch, Github, Hammer, Heart, Linkedin, MessageCircle, Package, Radio, Repeat2, Sparkles, Star, Terminal } from 'lucide-react';
import { PastimeItem, ThemeAccent } from '../types/portfolio';
import { getAccentValues } from './CursorSpotlight';
import { blogPosts, externalLinkedInContent, formatPostDate } from '../data/blogPosts';

type HobbiesTab = 'bare-metals' | 'labs' | 'blueprints';

const labProjects = [
  {
    name: 'cmakeforneophytes',
    description: 'Modern CMake templates and modules, including NuGet package integration.',
    focus: 'Build systems',
    icon: Hammer,
    iconLabel: 'CMake',
    githubUrl: 'https://github.com/VSPhaneendraPaluri/cmakeforneophytes',
    pagesUrl: 'https://vsphaneendrapaluri.github.io/cmakeforneophytes/'
  },
  {
    name: 'learn-cpp',
    description: 'Learn C++ through projects using CMake and Conan, with design patterns and benchmarks.',
    focus: 'C++ learning',
    icon: Code2,
    iconLabel: 'C++',
    githubUrl: 'https://github.com/VSPhaneendraPaluri/learn-cpp',
    pagesUrl: 'https://vsphaneendrapaluri.github.io/learn-cpp/'
  },
  {
    name: 'learn-py3',
    description: 'Python learning projects covering unittest, pytest, documentation testing, and mocks.',
    focus: 'Python testing',
    icon: Braces,
    iconLabel: 'Py3',
    githubUrl: 'https://github.com/VSPhaneendraPaluri/learn-py3',
    pagesUrl: 'https://vsphaneendrapaluri.github.io/learn-py3/'
  },
  {
    name: 'packmansys',
    description: 'An introduction to package-management tools and creating NuGet packages.',
    focus: 'Package management',
    icon: Package,
    githubUrl: 'https://github.com/VSPhaneendraPaluri/packmansys',
    pagesUrl: 'https://vsphaneendrapaluri.github.io/packmansys/'
  },
  {
    name: 'decoding-gxx',
    description: 'Notes and explorations about GCC/GXX and its plugins.',
    focus: 'GCC / compiler plugins',
    icon: Terminal,
    iconLabel: 'GCC',
    githubUrl: 'https://github.com/VSPhaneendraPaluri/decoding-gxx',
    pagesUrl: 'https://vsphaneendrapaluri.github.io/decoding-gxx/'
  }
];

const flowPosts = blogPosts.filter(({ seriesLabel }) => seriesLabel.startsWith('FLOW ·'));
const featuredFlowPosts = flowPosts.slice(0, 3);
const flowLinkedInTotals = {
  likes: flowPosts.reduce((total, post) => total + (post.linkedin?.likes ?? 0), 0),
  comments: flowPosts.reduce((total, post) => total + (post.linkedin?.comments ?? 0), 0),
  reposts: flowPosts.reduce((total, post) => total + (post.linkedin?.reposts ?? 0), 0),
  hasMetrics: flowPosts.some(
    ({ linkedin }) =>
      linkedin?.likes !== undefined || linkedin?.comments !== undefined || linkedin?.reposts !== undefined,
  ),
};

const tabs: { id: HobbiesTab; label: string }[] = [
  { id: 'bare-metals', label: 'My Bare-Metals' },
  { id: 'labs', label: 'My Labs' },
  { id: 'blueprints', label: 'My Blueprints' }
];

interface HobbiesSectionProps {
  pastimes: PastimeItem[];
  accent: ThemeAccent;
}

export const HobbiesSection: React.FC<HobbiesSectionProps> = ({ pastimes, accent }) => {
  const [activeTab, setActiveTab] = useState<HobbiesTab>('bare-metals');
  const [githubStars, setGithubStars] = useState<Record<string, number | null>>({});
  const accentVals = getAccentValues(accent);

  useEffect(() => {
    let isMounted = true;

    const loadStarCounts = async () => {
      const entries = await Promise.all(
        labProjects.map(async (project): Promise<[string, number | null]> => {
          try {
            const response = await fetch(`https://api.github.com/repos/VSPhaneendraPaluri/${project.name}`);
            if (!response.ok) {
              return [project.name, null];
            }

            const repository: { stargazers_count?: unknown } = await response.json();
            return [
              project.name,
              typeof repository.stargazers_count === 'number' ? repository.stargazers_count : null
            ];
          } catch {
            return [project.name, null];
          }
        })
      );

      if (isMounted) {
        setGithubStars(Object.fromEntries(entries));
      }
    };

    void loadStarCounts();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, tabId: HobbiesTab) => {
    const currentIndex = tabs.findIndex(({ id }) => id === tabId);
    let nextIndex = currentIndex;

    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = tabs.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const nextTab = tabs[nextIndex];
    setActiveTab(nextTab.id);
    document.getElementById(`hobbies-tab-${nextTab.id}`)?.focus();
  };

  return (
    <section id="projects" className="relative overflow-hidden border-t border-white/5 py-24 sm:py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full blur-3xl opacity-[0.08]"
        style={{ backgroundColor: accentVals.hex }}
      />
      <div className="relative mx-auto max-w-7xl px-6 sm:px-8">
        <div className="mb-12 max-w-3xl">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: accentVals.hex }}>
            <Sparkles className="h-4 w-4" />
            Personal Projects
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white font-display sm:text-5xl">
            Hands-On with Electronics &amp; Code
          </h1>
          <p className="mt-4 text-sm leading-7 text-neutral-400 sm:text-base">
            A collection of development boards and modules from embedded-electronics explorations—small tools for making ideas tangible.
          </p>
        </div>

        <div className="mb-8 flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-neutral-900/80 p-1.5 sm:inline-flex" role="tablist" aria-label="Hobbies and labs">
          {tabs.map(({ id, label }) => {
            const selected = activeTab === id;
            return (
              <button
                key={id}
                id={`hobbies-tab-${id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                aria-controls={`hobbies-panel-${id}`}
                onClick={() => setActiveTab(id)}
                onKeyDown={(event) => handleTabKeyDown(event, id)}
                className={`flex min-h-11 min-w-fit items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all sm:text-sm ${
                  selected ? 'bg-neutral-800 text-white shadow-lg ring-1 ring-white/15' : 'text-neutral-400 hover:text-white'
                }`}
                style={selected ? { boxShadow: `inset 0 -2px 0 ${accentVals.hex}` } : undefined}
              >
                {label}
              </button>
            );
          })}
        </div>

        {tabs.map(({ id }) => (
          <div
            key={id}
            id={`hobbies-panel-${id}`}
            role="tabpanel"
            aria-labelledby={`hobbies-tab-${id}`}
            hidden={activeTab !== id}
          >
            {id === 'bare-metals' ? (
              <>
                <div className="mb-6 flex items-center gap-3 border-b border-white/10 pb-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]" style={{ color: accentVals.hex }}>
                    <Cpu className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-lg font-bold text-white font-display">My Bare-Metals</h2>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-neutral-500">
                      <Radio className="h-3 w-3" />
                      Boards, sensors &amp; embedded hardware
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {pastimes.map((pastime, index) => (
                    <article
                      key={pastime.id}
                      data-card-theme="hardware"
                      className="spotlight-card group overflow-hidden rounded-2xl transition-transform duration-300 hover:-translate-y-1"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden bg-neutral-900">
                        <img
                          src={pastime.image}
                          alt={pastime.imageAlt}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <span className="absolute left-3 top-3 rounded-md border border-white/15 bg-neutral-950/75 px-2 py-1 font-mono text-[10px] text-neutral-400 backdrop-blur">
                          0{index + 1} / 0{pastimes.length}
                        </span>
                      </div>
                      <div className="p-4">
                        <h3 className="text-sm font-semibold text-neutral-100">{pastime.name}</h3>
                        <p className="mt-1 text-xs font-medium text-neutral-500">{pastime.focus}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            ) : id === 'labs' ? (
              <>
                <div className="mb-6 flex items-center gap-3 border-b border-white/10 pb-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]" style={{ color: accentVals.hex }}>
                    <FlaskConical className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-lg font-bold text-white font-display">My Labs</h2>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      Open-source projects and technical explorations
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {labProjects.map((project) => {
                    const ProjectIcon = project.icon;
                    return <article
                      key={project.name}
                      data-card-theme="code"
                      className="spotlight-card group flex min-h-48 flex-col rounded-2xl p-5 transition-transform hover:-translate-y-1"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span
                          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]"
                          style={{ color: accentVals.hex }}
                          aria-hidden="true"
                        >
                          {project.iconLabel ? (
                            <span className="font-mono text-xs font-bold tracking-tight">{project.iconLabel}</span>
                          ) : (
                            <ProjectIcon className="h-5 w-5" />
                          )}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-neutral-400">
                          {project.focus}
                        </span>
                      </div>
                      <h3 className="mt-5 font-display text-base font-bold text-white">
                        {project.name}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-neutral-400">{project.description}</p>
                      <div className="mt-4 flex items-center gap-1.5 text-xs text-neutral-400" aria-live="polite">
                        <Star className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
                        {githubStars[project.name] === undefined
                          ? 'Loading stars…'
                          : githubStars[project.name] === null
                            ? 'Stars unavailable'
                            : `${githubStars[project.name]} ${githubStars[project.name] === 1 ? 'star' : 'stars'}`}
                      </div>
                      {(() => {
                        const projectContent = externalLinkedInContent.filter(({ project: relatedProject }) => relatedProject === project.name);
                        const hasEngagement = projectContent.some(
                          ({ likes, comments, reposts }) =>
                            likes !== undefined || comments !== undefined || reposts !== undefined,
                        );
                        if (!hasEngagement) return null;

                        const totals = projectContent.reduce(
                          (sum, item) => ({
                            likes: sum.likes + (item.likes ?? 0),
                            comments: sum.comments + (item.comments ?? 0),
                            reposts: sum.reposts + (item.reposts ?? 0),
                          }),
                          { likes: 0, comments: 0, reposts: 0 },
                        );

                        return (
                          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-400">
                            <span className="font-medium text-neutral-300">LinkedIn total:</span>
                            <span>{totals.likes} likes</span>
                            <span>{totals.comments} comments</span>
                            <span>{totals.reposts} reposts</span>
                          </div>
                        );
                      })()}
                      <div className="mt-auto flex flex-wrap gap-2 pt-5">
                        <a
                          href={project.pagesUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-neutral-200 transition-colors hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                        >
                          Live page <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </a>
                        <a
                          href={project.githubUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-neutral-200 transition-colors hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                        >
                          GitHub <Github className="h-3.5 w-3.5" aria-hidden="true" />
                        </a>
                      </div>
                    </article>;
                  })}
                </div>
              </>
            ) : id === 'blueprints' ? (
              <>
                <div className="mb-6 flex items-center gap-3 border-b border-white/10 pb-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]" style={{ color: accentVals.hex }}>
                    <BookOpenText className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-lg font-bold text-white font-display">My Blueprints</h2>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      Projects and the ideas, decisions, and write-ups behind them
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  <article data-card-theme="blueprint" className="spotlight-card flex flex-col rounded-2xl p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]"
                        style={{ color: accentVals.hex }}
                        aria-hidden="true"
                      >
                        <GitBranch className="h-5 w-5" />
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-neutral-400">
                        Grammar-driven test generation
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-neutral-400">
                        {flowPosts.length} related {flowPosts.length === 1 ? 'post' : 'posts'}
                      </span>
                    </div>
                    <h3 className="mt-5 font-display text-xl font-bold text-white">FLOW</h3>
                    <p className="mt-2 text-sm leading-6 text-neutral-400">
                      Framework for Instruction Orchestration &amp; Workflows — a grammar-driven approach to describing test intent and generating instruction streams for CPU verification.
                    </p>

                    {flowLinkedInTotals.hasMetrics && (
                      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/10 pt-4 text-xs text-neutral-300">
                        <span className="text-neutral-500">LinkedIn engagement</span>
                        <span className="inline-flex items-center gap-1.5">
                          <Heart className="h-3.5 w-3.5 text-rose-300" aria-hidden="true" />
                          {flowLinkedInTotals.likes} likes
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <MessageCircle className="h-3.5 w-3.5 text-sky-300" aria-hidden="true" />
                          {flowLinkedInTotals.comments} comments
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Repeat2 className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" />
                          {flowLinkedInTotals.reposts} reposts
                        </span>
                        <Linkedin className="h-3.5 w-3.5 text-sky-300" aria-label="LinkedIn" />
                      </div>
                    )}

                    <div className="mt-5 border-t border-white/10 pt-4">
                      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                        From the project
                      </h4>
                      <ul className="space-y-2.5">
                        {featuredFlowPosts.map((post) => (
                          <li key={post.slug}>
                            <a
                              href={post.slug}
                              className="group/link flex items-start justify-between gap-3 rounded-lg text-sm text-neutral-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                            >
                              <span>
                                <span className="block leading-5">{post.title}</span>
                                <time dateTime={post.publishedAt} className="mt-1 block text-xs text-neutral-500">
                                  {formatPostDate(post.publishedAt)}
                                </time>
                              </span>
                              <ArrowRight
                                className="mt-0.5 h-4 w-4 shrink-0 transition-transform group-hover/link:translate-x-1"
                                style={{ color: accentVals.hex }}
                                aria-hidden="true"
                              />
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {flowPosts.length > 0 && (
                      <a
                        href="/blogs?series=FLOW"
                        className="mt-4 inline-flex min-h-11 items-center gap-2 self-start text-sm font-semibold transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                        style={{ color: accentVals.hex }}
                      >
                        View all {flowPosts.length} FLOW posts
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </a>
                    )}
                  </article>
                </div>
              </>
            ) : (
              <p className="rounded-2xl border border-white/10 bg-neutral-900/50 px-5 py-8 text-center text-sm text-neutral-400">
                Content coming soon.
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};
