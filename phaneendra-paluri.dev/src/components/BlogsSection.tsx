import React, { useMemo, useState } from 'react';
import { ArrowRight, BookOpenText, CalendarDays, Clock3, ListFilter } from 'lucide-react';
import { ThemeAccent } from '../types/portfolio';
import { blogPosts, formatArchiveDate, formatPostDate, writingTopics } from '../data/blogPosts';
import { getAccentValues } from './CursorSpotlight';

interface BlogsSectionProps {
  accent: ThemeAccent;
}

export const BlogsSection: React.FC<BlogsSectionProps> = ({ accent }) => {
  const accentVals = getAccentValues(accent);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedArchive, setSelectedArchive] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const archives = useMemo(
    () => [...new Set(blogPosts.map(({ publishedAt }) => publishedAt.slice(0, 7)))].sort().reverse(),
    [],
  );
  const filteredPosts = useMemo(
    () =>
      blogPosts
        .filter((post) => !selectedTopic || post.topicId === selectedTopic)
        .filter((post) => !selectedArchive || post.publishedAt.startsWith(selectedArchive))
        .sort((a, b) =>
          sortOrder === 'newest'
            ? b.publishedAt.localeCompare(a.publishedAt)
            : a.publishedAt.localeCompare(b.publishedAt),
        ),
    [selectedArchive, selectedTopic, sortOrder],
  );

  return (
    <section className="relative border-t border-white/5 py-24">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <header className="max-w-3xl">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: accentVals.hex }}>
            Blogs &amp; Posts
          </div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Ideas, Notes &amp; Write-Ups
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-neutral-400 sm:text-lg">
            A home for things I learn and build — from system-level modelling and processor
            architecture to experiments that spark a new idea.
          </p>
        </header>

        <div className="mt-14 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-2xl font-bold text-white">Posts</h2>
              <span className="text-sm text-neutral-500" aria-live="polite">
                {filteredPosts.length} {filteredPosts.length === 1 ? 'post' : 'posts'}
              </span>
            </div>

            <div className="space-y-4">
              {filteredPosts.map((post) => {
                const topic = writingTopics.find(({ id }) => id === post.topicId);
                return (
                  <a
                    key={post.slug}
                    href={post.slug}
                    className="spotlight-card group block rounded-3xl p-7 transition-transform hover:-translate-y-1 sm:p-9"
                  >
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                        <BookOpenText className="h-5 w-5" style={{ color: accentVals.hex }} aria-hidden="true" />
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold uppercase tracking-[0.16em]">
                          <span style={{ color: accentVals.hex }}>{post.seriesLabel}</span>
                          <span className="text-neutral-600" aria-hidden="true">·</span>
                          <time dateTime={post.publishedAt} className="text-neutral-500">
                            {formatPostDate(post.publishedAt)}
                          </time>
                        </div>
                        <h3 className="mt-2 font-display text-xl font-bold text-white sm:text-2xl">
                          {post.title}
                        </h3>
                        <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-400 sm:text-base">
                          {post.excerpt}
                        </p>
                        {topic && (
                          <span className="mt-4 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-neutral-300">
                            {topic.title}
                          </span>
                        )}
                        <span className="mt-5 flex items-center gap-2 text-sm font-semibold text-white">
                          Read the post
                          <ArrowRight
                            className="h-4 w-4 transition-transform group-hover:translate-x-1"
                            style={{ color: accentVals.hex }}
                            aria-hidden="true"
                          />
                        </span>
                      </div>
                    </div>
                  </a>
                );
              })}
              {filteredPosts.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center">
                  <p className="font-semibold text-white">No posts match these filters</p>
                  <p className="mt-2 text-sm text-neutral-500">Try another topic or date range.</p>
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-4" aria-label="Filter posts">
            <section className="spotlight-card rounded-2xl p-5 sm:p-6" aria-labelledby="topics-heading">
              <div className="mb-4 flex items-center gap-2">
                <ListFilter className="h-4 w-4" style={{ color: accentVals.hex }} aria-hidden="true" />
                <h2 id="topics-heading" className="font-display text-lg font-bold text-white">Topics</h2>
              </div>
              <nav aria-label="Filter by topic" className="space-y-1">
                <button
                  type="button"
                  onClick={() => setSelectedTopic(null)}
                  aria-pressed={selectedTopic === null}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    selectedTopic === null ? 'bg-white/10 text-white' : 'text-neutral-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span>All topics</span>
                  <span className="text-xs text-neutral-500">{blogPosts.length}</span>
                </button>
                {writingTopics.map(({ id, title }) => {
                  const count = blogPosts.filter(({ topicId }) => topicId === id).length;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSelectedTopic(id)}
                      aria-pressed={selectedTopic === id}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        selectedTopic === id ? 'bg-white/10 text-white' : 'text-neutral-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span>{title}</span>
                      <span className="text-xs text-neutral-500">{count}</span>
                    </button>
                  );
                })}
              </nav>
            </section>

            <section className="spotlight-card rounded-2xl p-5 sm:p-6" aria-labelledby="date-heading">
              <div className="mb-4 flex items-center gap-2">
                <CalendarDays className="h-4 w-4" style={{ color: accentVals.hex }} aria-hidden="true" />
                <h2 id="date-heading" className="font-display text-lg font-bold text-white">By date</h2>
              </div>
              <div className="mb-4 flex rounded-lg border border-white/10 bg-black/20 p-1" role="group" aria-label="Sort posts by date">
                <button
                  type="button"
                  onClick={() => setSortOrder('newest')}
                  aria-pressed={sortOrder === 'newest'}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition-colors ${
                    sortOrder === 'newest' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                  style={sortOrder === 'newest' ? { backgroundColor: `rgba(${accentVals.rgb}, 0.16)` } : undefined}
                >
                  <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                  Newest
                </button>
                <button
                  type="button"
                  onClick={() => setSortOrder('oldest')}
                  aria-pressed={sortOrder === 'oldest'}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition-colors ${
                    sortOrder === 'oldest' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                  style={sortOrder === 'oldest' ? { backgroundColor: `rgba(${accentVals.rgb}, 0.16)` } : undefined}
                >
                  <Clock3 className="h-3.5 w-3.5 rotate-180" aria-hidden="true" />
                  Oldest
                </button>
              </div>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setSelectedArchive(null)}
                  aria-pressed={selectedArchive === null}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    selectedArchive === null ? 'bg-white/10 text-white' : 'text-neutral-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  All dates
                </button>
                {archives.map((archive) => (
                  <button
                    key={archive}
                    type="button"
                    onClick={() => setSelectedArchive(archive)}
                    aria-pressed={selectedArchive === archive}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      selectedArchive === archive ? 'bg-white/10 text-white' : 'text-neutral-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span>{formatArchiveDate(archive)}</span>
                    <span className="text-xs text-neutral-500">
                      {blogPosts.filter(({ publishedAt }) => publishedAt.startsWith(archive)).length}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </section>
  );
};
