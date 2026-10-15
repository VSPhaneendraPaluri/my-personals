import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { BlogPost, formatPostDate, writingTopics } from '../data/blogPosts';
import { ThemeAccent } from '../types/portfolio';
import { getAccentValues } from './CursorSpotlight';

interface MarkdownBlogPostProps {
  post: BlogPost;
  accent: ThemeAccent;
}

const renderInlineMarkdown = (text: string, keyPrefix: string): React.ReactNode[] => {
  const tokens = text.split(/(!\[[^\]]*\]\([^)]+\)|\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);

  return tokens.map((token, index) => {
    const key = `${keyPrefix}-${index}`;
    const image = token.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (image) {
      const [, alt, src] = image;
      const isSafeImage = /^\/(?!\/)|^https?:\/\//i.test(src);
      return isSafeImage
        ? <img key={key} src={src} alt={alt} loading="lazy" className="my-8 block h-auto w-full rounded-2xl border border-white/10" />
        : token;
    }
    const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      const [, label, href] = link;
      const isSafeLink = /^(https?:\/\/|mailto:|\/|#)/i.test(href);
      return isSafeLink ? <a key={key} href={href} className="text-cyan-300 underline underline-offset-4 hover:text-white">{label}</a> : label;
    }
    if (token.startsWith('**') && token.endsWith('**')) {
      return <strong key={key} className="font-semibold text-white">{token.slice(2, -2)}</strong>;
    }
    if (token.startsWith('*') && token.endsWith('*')) {
      return <em key={key}>{token.slice(1, -1)}</em>;
    }
    if (token.startsWith('`') && token.endsWith('`')) {
      return <code key={key} className="rounded bg-white/10 px-1.5 py-0.5 text-sm text-cyan-100">{token.slice(1, -1)}</code>;
    }
    return token;
  });
};

const isBlockStart = (line: string) =>
  /^(#{1,6}\s|[-*+]\s|\d+\.\s|>\s|```|---+\s*$)/.test(line);

const renderMarkdown = (markdown: string): React.ReactNode[] => {
  const lines = markdown.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) {
      index += 1;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const Heading = `h${level}` as React.ElementType;
      blocks.push(
        <Heading key={index} className="pt-4 font-display text-2xl font-bold text-white">
          {renderInlineMarkdown(heading[2], `heading-${index}`)}
        </Heading>,
      );
      index += 1;
      continue;
    }

    if (/^---+\s*$/.test(line)) {
      blocks.push(<hr key={index} className="border-white/10" />);
      index += 1;
      continue;
    }

    if (line.startsWith('```')) {
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        codeLines.push(lines[index]);
        index += 1;
      }
      index += 1;
      blocks.push(
        <pre key={`code-${index}`} className="overflow-x-auto rounded-2xl border border-white/10 bg-black/30 p-5 text-sm leading-6 text-neutral-200">
          <code>{codeLines.join('\n')}</code>
        </pre>,
      );
      continue;
    }

    const listMatch = line.match(/^([-*+])\s+(.+)$/) ?? line.match(/^(\d+)\.\s+(.+)$/);
    if (listMatch) {
      const ordered = /^\d+\./.test(line);
      const items: string[] = [];
      while (index < lines.length) {
        const item = lines[index].trim().match(ordered ? /^\d+\.\s+(.+)$/ : /^[-*+]\s+(.+)$/);
        if (!item) break;
        items.push(item[1]);
        index += 1;
      }
      const List = ordered ? 'ol' : 'ul';
      blocks.push(
        <List key={`list-${index}`} className={`space-y-2 pl-6 ${ordered ? 'list-decimal' : 'list-disc'} marker:text-neutral-500`}>
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInlineMarkdown(item, `list-${index}-${itemIndex}`)}</li>
          ))}
        </List>,
      );
      continue;
    }

    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith('> ')) {
        quoteLines.push(lines[index].trim().slice(2));
        index += 1;
      }
      blocks.push(
        <blockquote key={`quote-${index}`} className="border-l-2 border-white/20 pl-5 italic text-neutral-400">
          {renderInlineMarkdown(quoteLines.join(' '), `quote-${index}`)}
        </blockquote>,
      );
      continue;
    }

    const paragraphLines = [line];
    index += 1;
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines[index].trim())) {
      paragraphLines.push(lines[index].trim());
      index += 1;
    }
    blocks.push(
      <p key={`paragraph-${index}`}>
        {renderInlineMarkdown(paragraphLines.join(' '), `paragraph-${index}`)}
      </p>,
    );
  }

  return blocks;
};

export const MarkdownBlogPost: React.FC<MarkdownBlogPostProps> = ({ post, accent }) => {
  const accentVals = getAccentValues(accent);
  const topic = writingTopics.find(({ id }) => id === post.topicId);

  return (
    <article className="relative border-t border-white/5 py-24">
      <div className="mx-auto max-w-4xl px-6 sm:px-8">
        <a
          href="/blogs"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-neutral-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All posts
        </a>
        <header className="mt-10 border-b border-white/10 pb-10">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold uppercase tracking-[0.18em]">
            <span style={{ color: accentVals.hex }}>{post.seriesLabel}</span>
            <span className="text-neutral-600" aria-hidden="true">·</span>
            <time dateTime={post.publishedAt} className="text-neutral-500">
              {formatPostDate(post.publishedAt)}
            </time>
            {topic && <span className="text-neutral-500">{topic.title}</span>}
          </div>
          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
            {post.title}
          </h1>
          <p className="mt-5 text-lg leading-8 text-neutral-400">{post.excerpt}</p>
        </header>
        <div className="prose-post space-y-5 pt-8 text-base leading-8 text-neutral-300">
          {renderMarkdown(post.body.replace(/^#\s+.+(?:\r?\n)+/, ''))}
        </div>
      </div>
    </article>
  );
};
