# CascadingLabsFE — Project Documentation

## Overview
CascadingLabsFE is the Cascading Labs company website and documentation hub. Built with [Astro](https://astro.build/) and [Starlight](https://starlight.astro.build/) for docs. Hosts product pages, interactive charts, and project documentation.

## Technology Stack
- **Framework**: Astro 6.x + Starlight (docs)
- **Styling**: Tailwind CSS v4
- **Interactive Components**: Solid.js (charts, theme select)
- **Linting/Formatting**: Biome 2.4.x
- **Package Manager**: Bun
- **TypeScript**: Strict mode via `tsconfig.json`

## Key Commands
- `bun run dev` — start dev server
- `bun run build` — production build
- `bun run preview` — preview production build
- `bun run check` — biome check with auto-fix
- `bun run lint` — biome lint only
- `bun run format` — biome format with write
- `bun run lighthouse` — build + run Lighthouse (desktop + mobile)

## Project Structure
```
src/
  pages/
    index.astro              — Landing page
    animated.astro           — Animated variant
    dna-wave-funnel.astro    — DNA wave funnel page
  components/
    Head.astro               — HTML head / meta tags
    Header.astro             — Site header / nav
    PageFrame.astro          — Page wrapper component
    SiteTitle.astro          — Logo / site title
    ThemeSelect.astro        — Dark/light toggle
    VersionSelect.astro      — Version selector
    JsonLd.astro             — Structured data (JSON-LD)
    CostEffortChart.tsx      — Solid.js interactive chart
    PipelineChart.tsx        — Solid.js pipeline chart
    useStarlightTheme.ts     — Theme hook for Solid components
  layouts/
    Layout.astro             — Base layout
  styles/
    global.css               — Global stylesheet (Tailwind)
  plugins/                   — Astro/remark plugins
  content.config.ts          — Content collection config
  versions.ts                — Version definitions
docs/                        — Starlight documentation content
public/                      — Static assets (images, favicons)
```

## Reference System Rules
- All inline reference symbols (e.g. `[△](#ref-1)`) must render as superscript. Use `<sup>` in markdown or rely on the CSS that applies `vertical-align: super` automatically.
- In the reference list at the bottom of a page, the leading symbol (△, ○, etc.) should only be a clickable back-link if an inline reference in the text actually points to it. If nothing references it, leave the symbol as plain text (no underline, no link behavior).

## Biome Configuration
- Indent style: tabs (width 2)
- Line width: 80
- Quotes: single (JS), double (JSX)
- Trailing commas: all
- Semicolons: always
- `.astro` files: unused variable/import checks disabled (Astro frontmatter quirks)
