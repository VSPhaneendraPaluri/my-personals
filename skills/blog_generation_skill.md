---
name: blog-generation
description: "Use when creating, converting, or integrating blog posts from Markdown, including naming, dating, categorizing, and listing posts."
---

# Blog Generation

Use this workflow whenever a Markdown article is added to the site as a blog post.

## Required conventions

- Name each source Markdown file with its publication date first, followed by a concise title:
  `YYYYMMDD_Title_In_Upper_Snake_Case.md`
- Do not use whitespace in filenames. Separate title words with underscores and preserve title capitalization, including acronyms.
- Start each Markdown file with front matter containing `publishedAt` (`YYYY-MM-DD`), `topicId` (an existing topic ID), `seriesLabel`, and `excerpt`, followed by a level-one Markdown title. For example:
  ```yaml
  ---
  publishedAt: 2026-10-11
  topicId: isg
  seriesLabel: FLOW · Part 1
  excerpt: A concise summary for the post listing and About Me feed.
  ---

  # Post title
  ```
- Save the post in the top-level `blogposts/` directory. The site discovers Markdown files there automatically; do not add the post to a TypeScript post array or route manually.
- Use a date that is unique for the blog post. Check for an existing post with the same date before adding it; if the date is already used or the intended publication date is unclear, ask the user rather than silently choosing a different date.
- Display the publication date on both the blog listing card and the article page. Use a readable date while preserving the same `YYYY-MM-DD` value in machine-readable date metadata.
- Every post must have one or more categories and may have multiple tags. Ask the user for categories and tags if they have not provided them; suggest relevant values based on the article, but let the user choose or confirm them before integration.
- Show a post in each category it belongs to and display its categories and tags on the article page. Keep category and tag metadata consistent between the listing and article.
- List posts within each category in reverse chronological order (newest publication date first).

## Workflow

1. Read the complete Markdown source and identify its title, intended publication date, and subject. Ask the user for the categories and tags if they are not specified, and confirm any suggested categories or tags before proceeding.
2. Check existing post filenames and metadata for date conflicts. Rename the source to `YYYYMMDD_Title_In_Upper_Snake_Case.md`, with no spaces.
3. Convert the article faithfully into the site's article presentation. Preserve the source's meaning and content while formatting headings, lists, quotations, and code appropriately.
4. The site generates the Blogs listing, latest-post feed, and article route from the Markdown file and front matter; verify that the selected topic is an existing `writingTopics` ID.
5. Display the publication date on the listing card and article page. Keep the slug, title, publication date, topic, series label, and excerpt consistent across views.
6. Verify the post is reachable from the About Me feed and Blogs page, and that the article renders from its Markdown source. Run the build and type-check.