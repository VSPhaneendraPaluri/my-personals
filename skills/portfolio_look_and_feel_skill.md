---
name: portfolio-look-and-feel
description: "Use when designing, implementing, or reviewing this portfolio's visual style, responsive compatibility, cards, topic tags, search, or filters."
---

# Portfolio Look and Feel

Use these conventions when changing portfolio pages, sections, cards, tags, archives, or responsive behavior. Preserve the established dark, restrained, content-themed visual style and keep the content easy to scan as it grows.

## Visual and Card Requirements

- Keep typography, spacing, alignment, and contrast consistent with nearby sections. Give consecutive content items enough separation; do not compress writing into a dense wall of cards.
- Use cards to group related information, not to add decoration around every small detail. Keep card content legible, actions easy to locate, and card heights driven by their content.
- Use the existing `spotlight-card` styling and `data-card-theme` values where appropriate. Prefer subtle CSS gradients and patterns that relate to the content, without competing with text.
- Any icon, badge, or visual shorthand on a card must clearly relate to that card's subject or description. Prefer a concise, explicit keyword label (for example, `C++`, `Python testing`, or `Build systems`) over a generic or ambiguous symbol. Do not assign icons by list position; map them to stable subject identifiers or labels. Keep labels truthful, concise, and secondary to the title.
- Do not add SVG image assets or SVG illustrations. Prefer CSS patterns, gradients, and existing HTML/CSS treatments; existing icon components may remain.
- Make clickable destinations unambiguous. Use real links for navigation, preserve keyboard focus visibility, and avoid nested interactive elements such as links inside links.
- For repository cards, link to the correct original GitHub repository. If a separate live demo exists, label its link separately from the GitHub link.
- Show GitHub stars or other live metrics only when fetched from their real source. Distinguish loading and unavailable states; never show a failed or missing value as zero.

## Topics, Tags, and Metadata

- Reuse the established topic IDs and labels from the site's writing-topic data. Do not invent a new spelling or near-duplicate tag for an existing topic.
- Keep topic/tag metadata consistent across the archive, article page, homepage feed, and any project or series summary that uses it.
- Make topic counts derive from the same content set shown by that topic's filter. Include external posts when they have a matching topic association.
- Use tags to make content easier to discover, not as a substitute for a concise title or excerpt. Keep labels short, understandable, and consistently capitalized.
- Preserve content type (such as blog post, LinkedIn post, or LinkedIn article) where it helps readers distinguish destinations.
- Never fabricate engagement numbers, dates, project associations, or links. Omit unknown values; only display likes, comments, and reposts when verified or explicitly supplied.
- Validate external links and metadata at the data boundary, and use safe external-link behavior consistent with existing components.

## Search, Filtering, and Growing Archives

- Keep archives easy to scan at scale. Prefer one unified, searchable list with clear content-type and topic filters over multiple competing blocks of cards.
- Keep the available topics visible; let filter chips wrap onto additional lines instead of making the entire topic set dependent on horizontal scrolling.
- Provide useful search across titles, excerpts, topics, and project names where those fields exist. Keep the search affordance clear of the typed text.
- Preserve relevant date and sort controls, result counts, and an obvious way to clear filters or return to all results.
- Paginate long lists rather than shrinking entries or putting the whole archive inside a nested scroll area. Keep the page's natural document scrolling and a consistent, readable gap between entries.
- Ensure empty results explain that nothing matched and provide a clear reset path.

## Responsive Compatibility and Accessibility

- Compatibility checks are mandatory for every new addition or modification, not only for changes explicitly described as responsive. Check all affected pages, tabs, cards, controls, and relevant interactive states at representative mobile, tablet, and desktop widths; include 320, 360, 390, 768, 1024, and 1440 CSS pixels when browser testing is available.
- Design mobile-first and verify representative widths at 360, 390, 768, 1024, and 1440 CSS pixels when browser testing is available.
- Check every changed page or component at narrow and wide widths. Confirm there is no document-level horizontal overflow, clipped text/actions, accidental overlap, or content hidden behind fixed navigation.
- Horizontal scrolling is acceptable only for an intentionally scrollable control or preformatted code block; keep its scroll affordance usable and do not let it widen the page.
- Let text and cards reflow naturally. Use responsive grids and flex wrapping; avoid fixed widths or heights that break with longer text, translated text, or larger browser zoom.
- Make touch targets comfortably usable (aim for at least 44 by 44 CSS pixels for primary controls). Keep labels and controls readable without relying on hover.
- Verify mobile navigation, filter controls, tabs, and dialogs can be reached and operated with keyboard and touch. Use semantic buttons, links, headings, and accessible names/states.
- Respect `prefers-reduced-motion`; avoid animations that are required to understand content or operate controls.

## Workflow

1. Inspect the relevant page, data model, shared styles, and existing components before changing the design. Reuse established components and topic definitions.
2. Keep content, destination, and metadata correct while applying the visual change; do not sacrifice functionality for compactness.
3. Check relevant mobile and desktop layouts, including navigation and interactive controls. Use browser inspection when available to verify actual geometry rather than relying only on source classes.
4. Run the narrowest relevant type-check, lint, build, or tests. Report any viewport or browser coverage that was not verified; do not claim universal compatibility from a limited check.
