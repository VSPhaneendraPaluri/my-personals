import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpenText,
  Heart,
  Linkedin,
  ListFilter,
  MessageCircle,
  Newspaper,
  Repeat2,
  Search,
} from 'lucide-react';
import { ThemeAccent } from '../types/portfolio';
import {
  blogPosts,
  externalLinkedInContent,
  formatArchiveDate,
  formatPostDate,
  writingTopics,
} from '../data/blogPosts';
import { getAccentValues } from './CursorSpotlight';

interface BlogsSectionProps {
  accent: ThemeAccent;
}

interface WritingItem {
  id: string;
  title: string;
  description: string;
  type: 'blog' | 'post' | 'article';
  topicId?: string;
  topicLabel?: string;
  seriesLabel?: string;
  project?: string;
  publishedAt?: string;
  url: string;
  linkedinUrl?: string;
  likes?: number;
  comments?: number;
  reposts?: number;
}

const pageSize = 10;

export const BlogsSection: React.FC<BlogsSectionProps> = ({ accent }) => {
  const accentVals = getAccentValues(accent);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArchive, setSelectedArchive] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSeries, setSelectedSeries] = useState<string | null>(() =>
    new URLSearchParams(window.location.search).get('series') === 'FLOW' ? 'FLOW' : null,
  );

  const items = useMemo<WritingItem[]>(() => {
    const sitePosts: WritingItem[] = blogPosts.map((post) => ({
      id: post.slug,
      title: post.title,
      description: post.excerpt,
      type: 'blog',
      topicId: post.topicId,
      topicLabel: writingTopics.find(({ id }) => id === post.topicId)?.title,
      seriesLabel: post.seriesLabel,
      publishedAt: post.publishedAt,
      url: post.slug,
      linkedinUrl: post.linkedin?.url,
      likes: post.linkedin?.likes,
      comments: post.linkedin?.comments,
      reposts: post.linkedin?.reposts,
    }));
    const linkedInUrls = new Set(sitePosts.map(({ linkedinUrl }) => linkedinUrl).filter(Boolean));
    const linkedInItems: WritingItem[] = externalLinkedInContent
      .filter(({ url }) => !linkedInUrls.has(url))
      .map((item) => ({
        id: item.url,
        title: item.title,
        description: item.description,
        type: item.type,
        project: item.project,
        url: item.url,
        likes: item.likes,
        comments: item.comments,
        reposts: item.reposts,
      }));

    return [...sitePosts, ...linkedInItems];
  }, []);

  const archives = useMemo(
    () => [...new Set(items.flatMap(({ publishedAt }) => publishedAt ? [publishedAt.slice(0, 7)] : []))].sort().reverse(),
    [items],
  );

  const filterOptions = useMemo(() => [
    { id: 'all', label: 'All writing', count: items.length },
    ...writingTopics.map(({ id, title }) => ({
      id: `topic:${id}`,
      label: title,
      count: items.filter((item) => item.topicId === id).length,
    })),
    { id: 'type:blog', label: 'Website blogs', count: items.filter(({ type }) => type === 'blog').length },
    { id: 'type:post', label: 'LinkedIn posts', count: items.filter(({ type }) => type === 'post').length },
    { id: 'type:article', label: 'LinkedIn articles', count: items.filter(({ type }) => type === 'article').length },
  ], [items]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return items
      .filter((item) => {
        if (selectedSeries && item.type === 'blog' && !item.seriesLabel?.startsWith(`${selectedSeries} ·`)) return false;
        if (selectedSeries && item.type !== 'blog') return false;
        if (activeFilter.startsWith('topic:') && item.topicId !== activeFilter.slice('topic:'.length)) return false;
        if (activeFilter.startsWith('type:') && item.type !== activeFilter.slice('type:'.length)) return false;
        if (selectedArchive && !item.publishedAt?.startsWith(selectedArchive)) return false;
        if (
          normalizedQuery &&
          !`${item.title} ${item.description} ${item.topicLabel ?? ''} ${item.seriesLabel ?? ''} ${item.project ?? ''}`
            .toLowerCase()
            .includes(normalizedQuery)
        ) return false;
        return true;
      })
      .sort((a, b) => {
        if (!a.publishedAt || !b.publishedAt) {
          if (!a.publishedAt && !b.publishedAt) return a.title.localeCompare(b.title);
          return a.publishedAt ? -1 : 1;
        }
        return sortOrder === 'newest'
          ? b.publishedAt.localeCompare(a.publishedAt)
          : a.publishedAt.localeCompare(b.publishedAt);
      });
  }, [activeFilter, items, searchQuery, selectedArchive, selectedSeries, sortOrder]);

  const pageCount = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const visiblePage = Math.min(currentPage, pageCount);
  const visibleItems = filteredItems.slice((visiblePage - 1) * pageSize, visiblePage * pageSize);
  const resetPage = () => setCurrentPage(1);

  return (
    <section className="relative border-t border-white/5 py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <header className="max-w-3xl">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: accentVals.hex }}>
            Blogs &amp; Posts
          </div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Ideas, Notes &amp; Write-Ups
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-neutral-400">
            Browse writing from the site and LinkedIn in one searchable, filterable list.
          </p>
        </header>

        <div className="mt-9">
          {selectedSeries && (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <p className="text-sm text-neutral-300">
                Showing posts in the <span className="font-semibold text-white">{selectedSeries}</span> series
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedSeries(null);
                  resetPage();
                }}
                className="text-sm font-semibold transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                style={{ color: accentVals.hex }}
              >
                Show all writing
              </button>
            </div>
          )}

          <section className="mb-5" aria-labelledby="writing-filters-heading">
            <div className="mb-3 flex items-center gap-2">
              <ListFilter className="h-4 w-4" style={{ color: accentVals.hex }} aria-hidden="true" />
              <h2 id="writing-filters-heading" className="font-display text-sm font-bold text-white">
                Browse by topic or source
              </h2>
            </div>
            <nav aria-label="Filter writing" className="flex flex-wrap gap-2">
              {filterOptions.map(({ id, label, count }) => {
                const selected = activeFilter === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setActiveFilter(id);
                      resetPage();
                    }}
                    aria-pressed={selected}
                    className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-colors sm:text-sm ${
                      selected
                        ? 'border-white/20 bg-white/10 text-white'
                        : 'border-white/10 bg-neutral-900/60 text-neutral-400 hover:border-white/20 hover:text-white'
                    }`}
                    style={selected ? { boxShadow: `inset 0 -2px 0 ${accentVals.hex}` } : undefined}
                  >
                    {label}
                    <span className="text-[11px] text-neutral-500">{count}</span>
                  </button>
                );
              })}
            </nav>
          </section>

          <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-white/10 bg-neutral-900/55 p-3 sm:flex-row sm:items-center">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Search posts and articles</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  resetPage();
                }}
                placeholder="Search titles, topics, projects..."
                className="min-h-11 w-full rounded-xl border border-white/10 bg-black/20 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                style={{ paddingLeft: '2.5rem' }}
              />
            </label>
            <label className="sr-only" htmlFor="writing-archive">Filter by month</label>
            <select
              id="writing-archive"
              value={selectedArchive}
              onChange={(event) => {
                setSelectedArchive(event.target.value);
                resetPage();
              }}
              className="min-h-11 rounded-xl border border-white/10 bg-neutral-950 px-3 py-2.5 text-sm text-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <option value="">Any date</option>
              {archives.map((archive) => (
                <option key={archive} value={archive}>{formatArchiveDate(archive)}</option>
              ))}
            </select>
            <label className="sr-only" htmlFor="writing-sort">Sort writing</label>
            <select
              id="writing-sort"
              value={sortOrder}
              onChange={(event) => {
                setSortOrder(event.target.value as 'newest' | 'oldest');
                resetPage();
              }}
              className="min-h-11 rounded-xl border border-white/10 bg-neutral-950 px-3 py-2.5 text-sm text-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>

          <div className="mb-2 flex items-center justify-between gap-3 text-sm text-neutral-500">
            <h2 className="font-semibold text-neutral-300">Writing</h2>
            <span aria-live="polite">{filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}</span>
          </div>

          <div className="space-y-3" aria-label="Writing results">
            {visibleItems.map((item) => {
              const itemTypeLabel = item.type === 'blog' ? 'Website blog' : `LinkedIn ${item.type}`;
              const contextLabel = item.seriesLabel ?? item.topicLabel ?? item.project;
              const primaryUrl = item.type === 'blog' ? item.url : item.url;
              const primaryLabel = item.type === 'blog' ? 'Read blog' : 'Read on LinkedIn';
              return (
                <article
                  key={item.id}
                  data-card-theme="writing"
                  className="spotlight-card rounded-2xl p-5 sm:p-6"
                >
                  <div className="relative z-10 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold uppercase tracking-wider">
                        <span className="inline-flex items-center gap-1.5" style={{ color: accentVals.hex }}>
                          {item.type === 'article' ? <Newspaper className="h-3.5 w-3.5" aria-hidden="true" /> : item.type === 'post' ? <Linkedin className="h-3.5 w-3.5" aria-hidden="true" /> : <BookOpenText className="h-3.5 w-3.5" aria-hidden="true" />}
                          {itemTypeLabel}
                        </span>
                        {contextLabel && (
                          <>
                            <span className="text-neutral-700" aria-hidden="true">·</span>
                            <span className="text-neutral-500">{contextLabel}</span>
                          </>
                        )}
                        {item.publishedAt && (
                          <>
                            <span className="text-neutral-700" aria-hidden="true">·</span>
                            <time dateTime={item.publishedAt} className="font-normal normal-case tracking-normal text-neutral-500">
                              {formatPostDate(item.publishedAt)}
                            </time>
                          </>
                        )}
                      </div>
                      <h3 className="font-display text-base font-bold leading-snug text-white sm:text-lg">
                        {item.title}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-neutral-400 sm:line-clamp-1 sm:text-sm">
                        {item.description}
                      </p>
                      {(item.likes !== undefined || item.comments !== undefined || item.reposts !== undefined) && (
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-400">
                          {item.likes !== undefined && <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3 text-rose-300" aria-hidden="true" />{item.likes}</span>}
                          {item.comments !== undefined && <span className="inline-flex items-center gap-1"><MessageCircle className="h-3 w-3 text-sky-300" aria-hidden="true" />{item.comments}</span>}
                          {item.reposts !== undefined && <span className="inline-flex items-center gap-1"><Repeat2 className="h-3 w-3 text-emerald-300" aria-hidden="true" />{item.reposts}</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto sm:justify-end">
                      <a
                        href={primaryUrl}
                        target={item.type === 'blog' ? undefined : '_blank'}
                        rel={item.type === 'blog' ? undefined : 'noreferrer'}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-neutral-200 transition-colors hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                      >
                        {primaryLabel}<ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                      {item.linkedinUrl && (
                        <a
                          href={item.linkedinUrl}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Open LinkedIn post for ${item.title}`}
                          title="Open LinkedIn post"
                          className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-sky-300 transition-colors hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                        >
                          <Linkedin className="h-4 w-4" aria-hidden="true" />
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
            {visibleItems.length === 0 && (
              <div className="px-6 py-12 text-center">
                <p className="font-semibold text-white">No writing matches these filters</p>
                <p className="mt-2 text-sm text-neutral-500">Try another topic or search term.</p>
              </div>
            )}
          </div>

          {pageCount > 1 && (
            <nav className="mt-5 flex items-center justify-between gap-4" aria-label="Writing pages">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={visiblePage === 1}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3.5 py-2 text-sm font-medium text-neutral-300 transition-colors hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />Previous
              </button>
              <span className="text-sm text-neutral-500" aria-live="polite">
                Page {visiblePage} of {pageCount}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
                disabled={visiblePage === pageCount}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3.5 py-2 text-sm font-medium text-neutral-300 transition-colors hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next<ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </nav>
          )}
        </div>
      </div>
    </section>
  );
};
