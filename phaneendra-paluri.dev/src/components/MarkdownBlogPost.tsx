import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { BlogPost, formatPostDate, getAdjacentFlowPosts, writingTopics } from '../data/blogPosts';
import { ThemeAccent } from '../types/portfolio';
import { getAccentValues } from './CursorSpotlight';

interface BlogPostNavigationProps {
  post: BlogPost;
}

export const BlogPostNavigation: React.FC<BlogPostNavigationProps> = ({ post }) => {
  const { previous, next } = getAdjacentFlowPosts(post);

  if (!previous && !next) return null;

  return (
    <nav aria-label="Related FLOW posts" className="mt-12 grid gap-4 border-t border-white/10 pt-8 sm:grid-cols-2">
      {previous ? (
        <a
          href={previous.slug}
          className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-white/20 hover:bg-white/[0.06]"
        >
          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 group-hover:text-neutral-300">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Previous post
          </span>
          <span className="mt-2 block font-display font-semibold text-white">{previous.title}</span>
        </a>
      ) : <div aria-hidden="true" />}
      {next && (
        <a
          href={next.slug}
          className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-right transition-colors hover:border-white/20 hover:bg-white/[0.06]"
        >
          <span className="flex items-center justify-end gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 group-hover:text-neutral-300">
            Next post
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="mt-2 block font-display font-semibold text-white">{next.title}</span>
        </a>
      )}
    </nav>
  );
};

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
  /^(#{1,6}\s|[-*+]\s|\d+\.\s|>\s|```|---+\s*$|\|.*\|$)/.test(line);

const isTableRow = (line: string) => /^\|.*\|$/.test(line);

const parseTableCells = (line: string) =>
  line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());

const isTableSeparator = (line: string, columnCount: number) => {
  if (!isTableRow(line)) return false;
  const cells = parseTableCells(line);
  return cells.length === columnCount && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
};

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

    if (isTableRow(line)) {
      const headers = parseTableCells(line);
      const separator = lines[index + 1]?.trim() ?? '';
      if (isTableSeparator(separator, headers.length)) {
        const rows: string[][] = [];
        index += 2;
        while (index < lines.length && isTableRow(lines[index].trim())) {
          rows.push(parseTableCells(lines[index].trim()));
          index += 1;
        }
        blocks.push(
          <div key={`table-${index}`} className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-max border-collapse text-left text-sm leading-6">
              <thead className="bg-white/5 text-white">
                <tr>
                  {headers.map((header, cellIndex) => (
                    <th key={cellIndex} scope="col" className="border-b border-white/10 px-4 py-3 font-semibold">
                      {renderInlineMarkdown(header, `table-${index}-header-${cellIndex}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="odd:bg-white/[0.02]">
                    {headers.map((_, cellIndex) => (
                      <td key={cellIndex} className="border-b border-white/5 px-4 py-3 align-top last:border-b-0">
                        {renderInlineMarkdown(row[cellIndex] ?? '', `table-${index}-${rowIndex}-${cellIndex}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        );
        continue;
      }
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
        <BlogPostNavigation post={post} />
      </div>
    </article>
  );
};
