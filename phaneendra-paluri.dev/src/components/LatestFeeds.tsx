import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpenText, Pause, Play } from 'lucide-react';
import { blogPosts, formatPostDate } from '../data/blogPosts';
import { ThemeAccent } from '../types/portfolio';
import { getAccentValues } from './CursorSpotlight';

interface LatestFeedsProps {
  accent: ThemeAccent;
}

export const LatestFeeds: React.FC<LatestFeedsProps> = ({ accent }) => {
  const [activePostIndex, setActivePostIndex] = useState(0);
  const [autoplayEnabled, setAutoplayEnabled] = useState(true);
  const [isCarouselHovered, setIsCarouselHovered] = useState(false);
  const [isCarouselFocused, setIsCarouselFocused] = useState(false);
  const accentVals = getAccentValues(accent);
  const latestPosts = [...blogPosts].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const activePost = latestPosts[activePostIndex];

  useEffect(() => {
    if (latestPosts.length < 2 || !autoplayEnabled || isCarouselHovered || isCarouselFocused) return;

    const interval = window.setInterval(() => {
      setActivePostIndex((index) => (index + 1) % latestPosts.length);
    }, 6000);

    return () => window.clearInterval(interval);
  }, [autoplayEnabled, isCarouselFocused, isCarouselHovered, latestPosts.length]);

  const showPreviousPost = () => {
    setActivePostIndex((index) => (index - 1 + latestPosts.length) % latestPosts.length);
  };

  const showNextPost = () => {
    setActivePostIndex((index) => (index + 1) % latestPosts.length);
  };

  if (!activePost) return null;

  return (
    <section
      className="w-full max-w-2xl pt-2"
      aria-labelledby="latest-posts-heading"
      aria-roledescription="carousel"
      onMouseEnter={() => setIsCarouselHovered(true)}
      onMouseLeave={() => setIsCarouselHovered(false)}
      onFocusCapture={() => setIsCarouselFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsCarouselFocused(false);
        }
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 id="latest-posts-heading" className="font-display text-lg font-bold text-white">
          Latest posts
        </h2>
        <a
          href="/blogs"
          className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-neutral-400 transition-colors hover:text-white"
        >
          All posts
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
      <div
        role="group"
        aria-roledescription="slide"
        aria-label={`Post ${activePostIndex + 1} of ${latestPosts.length}`}
        aria-live={autoplayEnabled ? 'off' : 'polite'}
      >
        <a
          href={activePost.slug}
          className="spotlight-card group block rounded-2xl p-4 transition-transform hover:-translate-y-0.5 sm:p-5"
        >
          <div className="flex items-start gap-3">
            <BookOpenText
              className="mt-0.5 h-5 w-5 shrink-0"
              style={{ color: accentVals.hex }}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-500">
                <span className="font-semibold uppercase tracking-wider" style={{ color: accentVals.hex }}>
                  {activePost.seriesLabel}
                </span>
                <span aria-hidden="true">·</span>
                <time dateTime={activePost.publishedAt}>{formatPostDate(activePost.publishedAt)}</time>
              </div>
              <h3 className="mt-1 font-display font-semibold text-white group-hover:text-neutral-200">
                {activePost.title}
              </h3>
              <p className="mt-1 line-clamp-2 text-sm leading-5 text-neutral-400">
                {activePost.excerpt}
              </p>
            </div>
          </div>
        </a>
      </div>
      {latestPosts.length > 1 && (
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2" aria-label="Choose a post">
            {latestPosts.map((post, index) => (
              <button
                key={post.slug}
                type="button"
                onClick={() => setActivePostIndex(index)}
                aria-label={`Show post ${index + 1}: ${post.title}`}
                aria-current={activePostIndex === index ? 'true' : undefined}
                className="h-2 rounded-full transition-all"
                style={{
                  width: activePostIndex === index ? '1.5rem' : '0.5rem',
                  backgroundColor: activePostIndex === index ? accentVals.hex : 'rgba(255,255,255,0.3)',
                }}
              />
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={showPreviousPost}
              aria-label="Previous post"
              className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setAutoplayEnabled((enabled) => !enabled)}
              aria-label={autoplayEnabled ? 'Pause automatic post rotation' : 'Resume automatic post rotation'}
              className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              {autoplayEnabled
                ? <Pause className="h-4 w-4" aria-hidden="true" />
                : <Play className="h-4 w-4" aria-hidden="true" />}
            </button>
            <button
              type="button"
              onClick={showNextPost}
              aria-label="Next post"
              className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
