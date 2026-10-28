# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Firefly is a feature-rich static blog theme built on **Astro 7** with **Svelte 5** for interactive components. It's a fork of [Fuwari](https://github.com/saicaca/fuwari) extended with extensive features. Primary language is Chinese (Simplified) with i18n for en, zh_TW, ja, ko, ru.

## Commands

| Command | Purpose |
|---|---|
| `pnpm dev` | Dev server at `localhost:4321` |
| `pnpm build` | Production build (LQIPs → VNDB covers → Astro build → pio asset pruning → font subsetting → Pagefind indexing) |
| `pnpm preview` | Preview production build |
| `pnpm check` | `astro check` for type/error checking |
| `pnpm type-check` | `tsc --noEmit --isolatedDeclarations` (covers `src/` and `scripts/`) |
| `pnpm lint` | Biome lint + auto-fix |
| `pnpm format` | Biome format |
| `pnpm new-post <filename>` | Scaffold a new blog post |
| `pnpm new-dynamic` (`new-d`) | Scaffold a new dynamic (microblog) entry |
| `pnpm lqips` | Regenerate LQIP data into `src/constants/lqips.json` |

Package manager is **pnpm** (enforced). Node.js >= 22 required.

## Architecture

### Astro + Svelte Hybrid

- `.astro` components for static content and layouts
- `.svelte` components for interactive UI (search, settings, pagination, archive) — mounted with `client:load` or `client:visible`
- Swup.js handles SPA-like page transitions with multiple container targets

### Configuration-Driven

All features are toggled/configured via TypeScript files in `src/config/`, exported through the barrel at `src/config/index.ts`. Key configs:

- `siteConfig.ts` — core site settings, theme, pagination
- Navbar items are all anchors now: clicking 「文章」 opens `/posts/` — a full-width list of every post sorted by time (same cards as the home list, no pagination) — while its 归档/分类/标签 children open on hover/focus.
- `sidebarConfig.ts` — sidebar layout (left/right/both, widget ordering). `sidebarPages` (default `["/", "/about/"]`) is a whitelist: only those paths keep the two sidebar columns (profile, pomodoro, music widget, stats…); every other page — posts, archive, categories, tags, photo wall, music, admin — renders as a single full-width centered column. Add a path there to give that page its sidebars back.

Switching between the two layouts is animated: the sidebar column widths are registered as `<length>` custom properties (`--lw-md`/`--rw-md`/`--lw-xl`/`--rw-xl`) and transition over 620ms, so the center column expands/contracts into place instead of jumping. Two gotchas when touching this:
- the CSS `@property` block in `layout-base.css` is dropped by the build pipeline, so `grid-layout-utils.ts` re-registers the same properties with `CSS.registerProperty` at runtime (that call is what makes the interpolation actually work);
- Swup replaces `#content-panel-inner`, so the SSR values are already final on the new node — `updateMainGridCols()` seeds the previous page's widths, forces a reflow, then writes the new ones, which is what produces the transition.
- `effectsConfig.ts` — sakura plus the interactive effects: `interactiveEffectsConfig` (`magnetic` / `starfield` / `cursorGlow` / `readingProgress` / `musicGlow`). The starfield also has a user-facing toggle (floating star button, `localStorage.starfieldEnabled`).
- `commentConfig.ts`, `analyticsConfig.ts`, `fontConfig.ts`, etc.
- `musicConfig.ts` — `/music/` 音乐页（与照片墙同形态：播放器卡片 + 歌单列表，曲目读 `local.playlist`，音频/封面放 `public/assets/music/`）
- `photoWallConfig.ts` + `types/photoWallConfig.ts` — `/wall/` 照片墙：`albums[]` 分组配置（`id` / `title` / `date` / `description` / `cover` / `photos[]`）。首页把每组渲染成一摞歪斜的相纸（封面 + 两张露边，悬停散开），点进 `/wall/<album>/` 看这组全部照片（相纸风格 + 点击大图走 Fancybox `data-fancybox`）。照片放 `public/wall/`，仓库里自带 `public/wall/demo/` 9 张自动生成的示例图；某组照片不足 3 张时用空白相纸补齐，保证「一摞」的手感。页面文字颜色直接写亮/暗两套 —— 站点有未分层的 `a`/`h1` 颜色规则会盖掉 Tailwind 工具类。
- `backgroundWallpaper.common.bannerVideo` — theme-switched hero background video (`light` / `dark` paths under `public/assets/videos/`). It only covers the banner behind the home title: the layers are wallpaper image → video (`z-6`) → scrim (`z-7`) → dim (`z-10`) → waves (`z-15`) → banner text (`z-20`), so the starfield/page background below the waves is untouched. Skipped under `prefers-reduced-motion` and `saveData`.

### Interactive Effects

Mounted in `Layout.astro`, outside the Swup container, each idempotent via a `window.__*Ready` guard:

- `CursorAmbience.astro` — dark-mode starfield canvas drawn under the cards at `z-1`, two layers. (1) Dense background field of tiny twinkling stars (`bgDensity`/`bgMaxParticles`, ~400 at 1440×900) drawn as batched fills, never linked. (2) Sparse big glowing nodes (≤88, ~16.8k px² per star) rendered from pre-baked radial-gradient sprites plus a solid core, ~8% warm-tinted, joined by two link tiers: star↔star constellation lines (`starLinkDistance`, 150px, one batched path) and pointer↔star links (`pointerDistance`, 176px, brighter, capped at `maxLinks`, grown in over 280ms). Plus cursor glow (`z-25`).
- `ParallaxStars.astro` — pure-CSS starfield layer: three box-shadow dot layers (1/2/3px) drifting upward at 70/120/190s, tile height = section height so the loop is seamless; pinned below the banner, dark-mode only, toggled from the settings panel (`parallaxStarsEnabled`).
- `RingTransition.astro` — concentric-ring wipe used only for navigations that touch `/wall/` or `/music/` (other → wall/music, wall/music → other, wall ↔ music): six annular-sector rings sweep in from 12 o'clock (inner first, wave outward), hold while the incoming page mounts behind the cover, then retract clockwise. It intercepts the click in the capture phase, calls `swup.navigate()` once fully covered, and releases on `astro:page-load` (1.2s fallback). Skipped under `prefers-reduced-motion`; all other navigation keeps the default Swup transition. Ported from the standalone `page-transition.html` demo.
- `MagneticHover.astro` — pointer-proximity offset for buttons/cards via the `translate` property (never `transform`; that is reserved for entrance/hover animations)
- `ReadingProgress.astro` — top 3px progress bar, only on pages that contain `.custom-md`
- `SettingsPanel.svelte` — the single「设置」panel in the navbar (gear icon): theme (light / dark / system) plus switches for 星空背景（视差繁星层）/ 璀璨繁星（canvas 星点 + 星座连线）/ 指针光晕 / 指针连线. Choices persist in `localStorage` (`starfieldEnabled`, `cursorGlowEnabled`, `pointerLinksEnabled`) and are broadcast as CustomEvents (`starfieldToggle` / `cursorGlowToggle` / `pointerLinksToggle`) so `CursorAmbience` reacts live without a reload.
- `AdminEntry.astro` — floating "write a post" pencil that links to `/admin/publish/` (default on, toggle stored in `localStorage.adminEntry`); also owns the `Ctrl/⌘+Shift+P` shortcut

All of them respect `prefers-reduced-motion`, stop their rAF loops when idle or the tab is hidden, and skip touch devices where a pointer is required.

> `displaySettingsConfig.enable` is `false` by default (bundle-size guard); the settings panel row for the starfield only appears when it is enabled via `PUBLIC_DISPLAY_SETTINGS=true`.

### Layout System

- `Layout.astro` — base HTML shell (head, body, theme init, analytics, Swup hooks)
- `MainGridLayout.astro` — full page grid with sidebar(s), navbar, wallpaper, footer

### Scroll Performance Constraints

Scroll-linked work in `src/utils/` is rAF-throttled and must stay cheap on mobile — do not regress these:

- `fullscreen-wallpaper-utils.ts` — fullscreen-mode title fade + blur ramp. The blur value `--fullscreen-blur` is **quantized to 2px steps** (skips writes when unchanged) and the max blur (`--overlay-blur`) is **cached** (read once; refreshed by a MutationObserver on `#wallpaper-wrapper` style). Avoid per-frame `getComputedStyle` or continuous full-screen `filter: blur()` writes — each change re-rasterizes the whole viewport on mobile.
- `grid-layout-utils.ts` — `updateSidebarStickySpacing()` is the per-scroll path and **must not read layout** (`offsetHeight` etc.). The sidebar top-container visibility (`hasVisibleTop`) is cached by `refreshSidebarStickyState()`, which runs on init/navigation only.
- Fullscreen blur ramp can be disabled per device via `backgroundWallpaper.fullscreen.blurRamp.enable.{desktop,mobile}` — when off, fullscreen mode has no blur on that device (home + other pages) and the settings-panel blur slider is hidden. Documented in `Firefly-Docs/` (zh/en).

### Content Collections

Defined in `src/content.config.ts`:
- `posts` — blog posts (`.md`/`.mdx`) with frontmatter: title, published, tags, category, draft, pinned, password, comment, etc.
- `spec` — special pages (about, guestbook)
- `dynamic` — microblog entries (`.md`) with frontmatter: published, pinned, location

Date fields use `z.coerce.date()`, so `published: 2026-10-23` and `published: "2026-10-23"` both validate — different editors serialize YAML differently.

### Publishing

Three paths write the same files; see `docs/PUBLISH.md`:

- `src/pages/admin/publish.astro` — the in-site publish tool (static page, `noindex`, no backend). It renders inside `MainGridLayout` with a collapsed banner (`--banner-height-non-home` override) and talks to the GitHub Contents API with a token the author pastes in: kept in `sessionStorage` unless "记住" is checked, images committed to `src/content/posts/images/` (so Astro optimizes them), and submissions default to a `post/<slug>` branch plus a compare link so a Vercel preview can be reviewed before merging. Entry points: the floating pencil button (`AdminEntry.astro`, enabled by `localStorage.adminEntry`, auto-enabled on first visit) and `Ctrl/⌘+Shift+P`. Links to it use `data-no-swup` so the page's script always boots.
- `.pages.yml` + [Pages CMS](https://app.pagescms.org) — hosted git CMS, GitHub App auth (no PAT), collections mirror the schema above; keep `.pages.yml` and `content.config.ts` in sync.
- Local `pnpm new-post` + `git push`.

### Key Directories

- `src/components/` — organized by domain: `analytics/`, `comment/`, `common/`, `controls/`, `features/`, `layout/`, `misc/`, `pages/`, `widget/`
- `src/plugins/` — 15 custom remark/rehype plugins (Mermaid, PlantUML, KaTeX, GitHub cards, reading time, wiki links, etc.)
- `src/i18n/` — translation keys in `i18nKey.ts`, language files in `languages/*.ts`, lookup via `translation.ts`
- `src/utils/` — content sorting, crypto (encrypted posts), date formatting, image processing/LQIP, TOC generation
- `src/pages/` — Astro file-based routing
- `scripts/` — build-time utilities (`generate-lqips.ts`, `generate-vndb-covers.ts`, `subset-fonts.ts`, `new-post.js`, `new-dynamic.js`)

### Path Aliases (tsconfig.json)

`@components/*`, `@assets/*`, `@constants/*`, `@utils/*`, `@i18n/*`, `@layouts/*` → `./src/<dir>/*`; `@/*` → `./src/*`

## Code Style

- **Biome** enforces: tab indentation, double quotes, recommended lint rules
- Relaxed rules for `.svelte`/`.astro`/`.vue` files (`useConst`, `useImportType`, `noUnusedVariables`, `noUnusedImports` off)
- `pnpm lint`/`pnpm format` only target `./src` — `scripts/` is type-checked (tsconfig `include`) but not linted, and currently has pre-existing Biome findings
- `scripts/subset-font.d.ts` is a hand-written ambient declaration for the untyped `subset-font` package
- Commit convention: **Conventional Commits** (`feat:`, `fix:`, `chore:`, etc.)

## Build Pipeline

Multi-step: `scripts/generate-lqips.ts` → `scripts/generate-vndb-covers.ts` → `astro build` → `scripts/prune-pio-assets.ts` → `scripts/subset-fonts.ts` → `scripts/minify-inline-scripts.ts` → `pagefind --site dist`

LQIP data is generated into `src/constants/lqips.json` and committed — regenerate with `pnpm lqips`. Icon data lives in `src/constants/icons-data.json` (committed, Biome-ignored, consumed by `src/components/common/Icon.svelte`) but has no generator script in the current build.

`generate-vndb-covers.ts` downloads VNDB cover art into `public/vndb-covers/` (gitignored, skips files that already exist). It no-ops unless `siteConfig.vndb` has a `userId`, `downloadCovers: true`, and `mode: "static"`.

`prune-pio-assets.ts` deletes unused 看板娘 assets from `dist/` after the Astro build (Astro copies all of `public/` regardless of config). It drops `dist/pio/models/live2d` plus the orphaned `Live2DWidget` client chunk when `live2dWidgetConfig.enable` is false, `dist/pio/models/spine` and `dist/pio/static` when `spineModelConfig.enable` is false, and all of `dist/pio` when both are off (~15 MiB). It no-ops when both are enabled.

## Deployment

- **Vercel** (default, `vercel.json`)
- **Cloudflare Workers** (`wrangler.jsonc`, set `CF_WORKERS` env var)
- Static output to `dist/`

