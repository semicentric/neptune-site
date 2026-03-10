# Neptune Site

Static landing page + Fumadocs documentation site for Neptune, an AI-powered reverse engineering pipeline for firmware SBOM generation and vulnerability correlation.

## Structure

- `public/index.html` — Landing page (static HTML)
- `public/styles.css` — Landing page styles with dark/light mode and mobile responsive layout
- `public/main.js` — Text morphing animation (torph) for install button and contact button
- `src/` — Fumadocs (Next.js) documentation app
- `content/docs/` — MDX documentation content

## Landing Page

The landing page is plain HTML/CSS/JS served from `public/`. It is NOT a React/Next.js page. The Fumadocs app handles `/docs` routes only.

### Key Details

- Two-column layout (desktop): left panel with animated background (Unicorn Studio), right panel with description + capabilities + links
- Single-column stacked layout (mobile, ≤768px): left panel shrinks to 28dvh, right panel fills remaining space
- `<br>` tags in `.descriptor` are hidden on mobile via `display: none` — spaces must exist adjacent to `<br>` tags so words don't merge when line breaks are removed
- Text morph animation system (`torph`) handles character-level FLIP animations for the install command and contact button
- Light/dark mode via `prefers-color-scheme` media queries
- Safe area insets for notched devices

### Fonts

- Fraunces (serif) — headings and body text
- Geist Mono — labels, links, install command

## Docs

Fumadocs-based Next.js app with MDX content in `content/docs/`. Uses `fumadocs-ui` preset with neutral theme. Tailwind CSS v4. Docs are docs — don't touch the landing page when working on docs and vice versa.

## Tooling

- Bun (package manager and runtime)
- Next.js with static export (`out/`)
- Deployed to GitHub Pages via `.github/` workflows
