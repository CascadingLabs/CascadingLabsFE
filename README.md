# Cascading Labs frontend

An Astro site for the homepage and documentation, using Bun and Vite+.

## Getting started

```sh
bun install --frozen-lockfile
vp run dev
```

## Commands

```sh
vp run build      # Consume latest published Yosoi docs and build dist/
vp run preview    # Preview the production build
vp run check      # Formatting, linting, then TypeScript checking
vp run fmt        # Format supported files with Oxfmt
```

Use `vp run dev` for local authoring and `vp run build` for the published site. Use `vpr docs:build` for a local source-checkout build; the bare `vp dev` and `vp build` commands start Vite directly.

## Automatic publication and deployment

Cloudflare Pages' existing Git integration deploys frontend pushes with `bun run build`, output directory `dist`. No Cloudflare deployment token or OIDC setup is needed. Lighthouse is removed; frontend CI checks formatting, lint, types, focused contracts and the static build.

Yosoi owns `docs-artifacts/catalog.json`. Its `latest` field selects one source commit; every snapshot pins the SDK version, source commit, artifact commit and bundle hash. A docs correction creates another snapshot of the same SDK version. The frontend resolves latest once per build, downloads only that immutable bundle, verifies its complete file inventory, and prepares Markdown plus the already-generated API reference. It never compiles Rust or reads neighboring source checkouts in production. `.generated/docs-build.json` records the selected input.

The static site bundles only latest docs. The release selector carries small metadata records; historical authored Markdown and API JSON load individually from commit-pinned GitHub raw URLs and are rendered and sanitized in the archive shell. Existing pre-rendered HTML archives remain supported. Historical navigation, links, assets and source links use that snapshot's identity. Archived content is never imported into the static page collection.

After publishing the bundle and catalog, Yosoi sends `yosoi-docs-published` to this repo. `docs-update.yml` resolves current latest and commits only `docs-bundle.lock.json` to main using the existing `DOCS_DEPLOY_TOKEN`. Cloudflare sees that push through its normal integration. Frontend-only pushes also resolve latest without requiring a docs update. Repeated notifications are no-ops; a delayed notification resolves current latest rather than the event's older payload. If main advances during the pointer update, the ordinary push fails instead of overwriting it; rerun the workflow.

The pointer-update token needs Contents write on CascadingLabsFE. The token used by Yosoi to send the repository dispatch also needs access to CascadingLabsFE's repository-dispatch endpoint. Tokens stay in GitHub secrets. The workflow must be on frontend main before notifications can run. Bootstrap by publishing the first Yosoi docs snapshot, then landing the new frontend; subsequent changes deploy automatically. Hosted execution and a live Cloudflare deployment still need verification.

Cloudflare branch previews and pull-request CI use the separate `docs-artifacts-preview` catalog selected by `docs-preview.json`. Production main always uses `docs-artifacts`. This permits a real bundle/raw-content preview before the release stack lands, without promoting unreleased docs to production. `DOCS_PREVIEW=1 bun run build` reproduces the preview build locally. `/yosoi/build.json` records the deployed source and bundle hashes.

## Foundation

- Astro 7 uses its Rust compiler and Sätteri Markdown processor by default.
- `@astrojs/mdx` enables MDX with the same native Markdown pipeline.
- Vite is overridden with Vite+ core so Astro uses the Vite+ bundler.
- Vite+ supplies Oxlint and Oxfmt, configured in `vite.config.ts`.
- Tailwind 4.3.3 uses Astro’s recommended `@tailwindcss/vite` plugin in `astro.config.mjs`. PostCSS 8.5.28 and `postcss-nesting` process standard CSS nesting through `postcss.config.mjs`, including custom and scoped styles.
- Production CSS is minified and lowered by Lightning CSS through Vite+, targeting Chrome/Edge 111+, Safari 16.4+, and Firefox 128+. These match Tailwind 4's modern-browser support floor; not every future CSS feature can be polyfilled.
- Tailwind handles its CSS imports and vendor prefixes. Extra `autoprefixer` or `postcss-import` plugins are unnecessary; Lightning CSS also optimizes the complete production stylesheet.
- Use Tailwind utilities directly in Astro/MDX. The `dark:` variant follows the shared `data-theme` state, including resolved Auto mode. The `font-mono` utility uses the self-hosted DM Mono font.
- Oxfmt formats Markdown/MDX and supported code/config files, but currently skips `.astro` templates. Oxlint checks supported JavaScript/TypeScript and Astro script blocks; Astro builds validate template compilation.
- Astro configuration lives in `astro.config.mjs`; strict TypeScript uses the native TypeScript 7 compiler.
- Vite+ manages command execution; Bun manages dependencies through `bun.lock`.
- Build rendering and lint/format checks use one worker to keep resource use bounded.
- TypeScript 7.0.2 provides native type checking for TypeScript files. `astro check` rejects TypeScript 7, so full `.astro` template type checking is not currently included; Astro builds still validate template compilation.

`src/pages/index.astro` is the company homepage, with Yosoi and qscrape.dev project cards and email contact. The shared theme control cycles Auto → Light → Dark, stores the preference in the `cl-theme` cookie, and updates route-specific favicons and project images. Fonts are served locally. The shared BrandIcon component embeds the tiny theme-aware PNG marks directly into HTML and requests synchronous decoding, avoiding separate image loads on navigation.

## Yosoi documentation

Starlight consumes the prepared Markdown snapshot at `.generated/yosoi/docs` through the managed, gitignored `src/content/docs/yosoi` link and its native Markdown loader. The resolved navigation in `routes.json` supplies its sidebar; Starlight owns documentation routes, heading outlines, and the mobile menu. The company homepage uses its own Astro layout. All custom styles and palette tokens live in `src/styles/global.css`; the docs reuse the Auto/Light/Dark cookie control and Yosoi favicons.

```sh
vpr dev                         # Prepare, serve, and watch Yosoi/docs/public
vpr docs:prepare                # Prepare Markdown and reuse verified API artifacts
vpr docs:prepare --docs-only    # Fast local refresh; never compiles Rust
vpr docs:reference              # Regenerate the current commit's Rust API reference
vpr docs:build                  # Prepare and produce static HTML
vpr docs:test                   # Fast navigation/preparation contracts with vite-plus/test
vpr docs:test:live              # Isolated browser check of live edits; no Rust compilation
vpr docs:test:site              # Production browser smoke check; run docs:build first
```

`YOSOI_REPO_ROOT` defaults to the neighboring `../Yosoi` checkout. Local Markdown preparation includes uncommitted edits. API generation always uses an exact source commit, one Cargo worker, and the compiler pinned by Yosoi's reference generator. Set `YOSOI_DOCS_TOOLCHAIN` to an installed matching channel when needed.

The same preparation code is used for an exact-commit CI build:

```sh
vpr docs:prepare --source FULL_YOSOI_COMMIT --version 0.1.0
vpr build
# Or: vpr docs:build --source FULL_YOSOI_COMMIT --version 0.1.0
```

Astro only consumes prepared files. It does not invoke the generator or read the Rust/source repository. Preparation validates public-only inputs and reference hashes, then replaces the snapshot after success. `vpr dev` recursively watches every file in `Yosoi/docs/public`, including `_navigation.json` and assets, with debounced, serial preparation. Invalid edits leave the last successful snapshot available; save a correction to retry. After a successful refresh, a fresh Astro process clears route/content caches. A small Astro integration injects a local event listener in development; the watcher notifies the browser only after the new server reports ready. API compilation stays cached. The watcher and reload listener are absent from production builds. Restart an already-running `vpr dev` once after updating this tooling.

Generated files, Rustdoc caches, and `docs-sources.local.json` are gitignored. The prepared bodies carry content while frontmatter carries the title rendered by Starlight. Markdown is prepared now; MDX ingestion remains a follow-up. The browser checks use a sandboxed system Chromium (default `/usr/bin/chromium`, overridable with `DOCS_BROWSER_EXECUTABLE`), with one Vite+ worker and temporary profiles on the workspace disk.

The local preview currently uses the previously verified API artifact because the current Yosoi commit cannot pass Rustdoc's `--locked` check. Its older source commit is displayed on API pages. This local override is ignored for exact-commit/CI preparation:

```json
{
	"apiSource": "FULL_VERIFIED_API_COMMIT",
	"referenceArtifact": "/path/to/verified/reference"
}
```

Starlight search is enabled and indexed during production builds. Its native search index is unavailable in the development server; verify search with `vpr build` then `vpr preview`. The docs header links to the Yosoi GitHub repository and Discord community. Native Go back/Next pagination follows the source-owned navigation order. Language controls are disabled. The docs palette, wide content layout, and active sidebar styling are restored from the original FE main branch; Cascading Labs and Yosoi are the only header brands. The three-column docs view remains static HTML with small scripts for navigation and theme interactions. `src/pages/docs/` retains the initial Markdown/MDX tooling fixtures.

Production builds emit normal static HTML for all routes. The content and links work without JavaScript; a small inline script handles theme preferences.

## Source-owned navigation

Generated Reference navigation follows public Rust namespaces. Each namespace contains an alphabetical list of items with compact kind badges; actual sub-namespaces remain nested. Namespace overviews show Name / Kind / Summary tables. Item pages group variants, fields, inherent methods, and associated items; trait implementations use native closed details sections. The right outline shows section headings. Canonical reference URLs remain unchanged, and archived snapshots preserve this navigation metadata.

`Yosoi/docs/public/_navigation.json` is authored and version-controlled with the docs. Comments (`//` and `/* ... */`) and trailing commas are supported. Its section array controls labels and order; `pages` selects named Markdown files (optionally with a navigation-only label), `directory` discovers pages automatically, and `generated: "rust-api"` includes the complete generated reference. Directory `order` arrays prioritize known pages while newly discovered pages are appended. Each section's overview comes first.

Preparation rejects invalid paths, missing or excluded page references, duplicate assignments, and unsupported schema fields. When `_navigation.json` exists, its section list is authoritative: removing a section or an explicit `pages` entry hides it from the sidebar. An empty section list produces an empty sidebar. Documents remain generated and accessible by their existing URLs. A configured `directory` still discovers new pages automatically; its `order` array only prioritizes pages, so removing a filename from `order` changes priority rather than hiding that page. Without a metadata file, preparation falls back to automatically discovered navigation. The resolved tree and source metadata digest live in `.generated/yosoi/routes.json`; Starlight consumes that tree directly, with no hardcoded group-label mapping. The local watcher also watches `_navigation.json`.

Local preparation caches remain ignored. Published, versioned snapshots belong in a separate `docs-artifacts` Git branch or artifact repository, with a small catalog pinning each manifest's artifact commit and digest. Source commits and artifact commits are distinct. The frontend bundles the selected latest snapshot; archived-version routing and GitHub transport remain the next implementation slice. No artifact publication is configured by the current local preview.

The verified local API artifact is owned by `.generated/yosoi-cache/verified-reference`; this preview no longer reads inputs from the old FE experiment worktree. Its original source identity and checksums are retained.

## Documentation CI

Yosoi's `scripts/docs` package owns the public content/navigation contract. Its `Docs CI result` workflow runs formatting, link/frontmatter/navigation checks, native Markdown rendering, and focused Vite+ tests on every pull request and push to main. Locally: `cd ../Yosoi/scripts/docs && vp install --frozen-lockfile && vpr check`; use `vpr fmt` to fix public Markdown/navigation formatting. The frontend preparation task imports those same contracts. Source checks do not compile Rust or contact external websites. Require `Docs CI result` in GitHub branch protection after this workflow is merged. Hosted CI and branch protection have not been activated by these local changes.

## Releases

The compact tag control beside the Yosoi logo defaults to Latest. In local preview its full version appears in the tooltip. `src/data/docs-releases.json` is the bundled registry: only published docs releases belong there. Every entry pins a release tag, SDK source commit, docs artifact commit, manifest path, and SHA-256. The registry starts empty; no fake releases are shipped.

The latest snapshot renders as static HTML. Older docs use the single `/yosoi/archive/?version=0.x.y&page=cli/map` shell, loading that release's own navigation and Markdown, generated API JSON, or existing pre-rendered HTML from immutable GitHub raw URLs. The browser verifies manifest/page hashes and sanitizes rendered HTML. It never evaluates fetched MDX. The native header search remains the latest docs search on archive pages.

Release sequence:

1. Commit and tag the SDK source (`v0.x.y`) first. Generate and verify its matching Rust reference using Yosoi's reference workflow.
2. Run `vpr docs:prepare --source FULL_SOURCE_COMMIT --version 0.x.y --reference-artifact VERIFIED_REFERENCE`. Exact source and API commits must match.
3. Run `vpr docs:export-release --out /path/to/docs-artifacts/versions/0.x.y`. It writes prepared Markdown, routes.json, assets, and the verified API-reference files. It refuses working-tree previews or mismatched/missing SDK tags and existing output directories.
4. Commit those files on a `docs-artifacts` branch or artifact repository. Register only the committed blobs: `vpr docs:register-release --checkout /path/to/docs-artifacts --manifest versions/0.x.y/manifest.json --repository OWNER/REPO`. This verifies the committed page/asset hashes and refuses to replace existing releases.
5. Commit the registry update with the frontend build. Source and artifact commits remain separate to avoid a self-referential manifest.

These manual export/register commands remain available for local testing; they do not create tags, commit, push, or deploy. The automatic path is described above under publication and deployment. The approved older API remains a local-preview fixture and is never selected by the production bundle importer.
