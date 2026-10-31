# Repository Guidelines

## Project Structure & Module Organization

Firefly is an Astro 7 site with Svelte islands and TypeScript configuration. Main source code lives in `src/`: routes in `src/pages`, layouts in `src/layouts`, reusable UI in `src/components`, styles in `src/styles`, content in `src/content`, helpers in `src/utils`, and Markdown/HTML plugins in `src/plugins`. Site configuration is split across `src/config` with matching type definitions in `src/types`; prefer imports from `@/config` when available. Static files served directly belong in `public`, source-managed images in `src/assets`, docs in `docs` and `Firefly-Docs`, and automation in `scripts`.

## Build, Test, and Development Commands

Use `pnpm`; the `preinstall` script enforces it.

- `pnpm dev` or `pnpm start`: run the local Astro dev server.
- `pnpm check`: run Astro diagnostics.
- `pnpm type-check`: run TypeScript with `--noEmit`.
- `pnpm format`: format `src` with Biome.
- `pnpm lint`: run Biome checks and safe fixes on `src`.
- `pnpm build`: generate icons, LQIPs, the Astro build, font subsets, and Pagefind search output in `dist`.
- `pnpm preview`: preview the production build locally.
- `pnpm new-post`: scaffold a new content post.
- `pnpm post:push`: publish locally written posts — stages only `src/content/posts/**`, commits with a generated `post: …` message, and pushes. Run with no argument, or a slug to limit to one post; `--dry-run`, `--no-push`, `--build` are supported.
- `pnpm post:watch`: same thing, but watches `src/content/posts/` and pushes once the files stop changing (`--quiet <seconds>`, default 5). Other flags are forwarded to `post:push`.
- Repo-root Windows helpers for people who don't want a terminal: `push-posts.cmd` (one-shot), `watch-posts.cmd` (same as `post:watch`, quiet 30 by default), `toggle-autostart.cmd` (adds/removes a Startup shortcut that runs `watch-posts.cmd` minimized). `.gitattributes` keeps `*.cmd` as CRLF.

## Coding Style & Naming Conventions

Biome is the formatter and linter. It uses tabs for indentation and double quotes for JavaScript/TypeScript strings. Keep Astro and Svelte components in `PascalCase` (`PostCard.astro`, `Search.svelte`), config modules in `camelCase` ending with `Config.ts`, and utilities in descriptive kebab case such as `date-utils.ts`. Keep `src/types` aligned with `src/config`. Avoid unrelated formatting churn.

## Testing Guidelines

There is no dedicated unit-test framework configured. Before submitting changes, run `pnpm check`, `pnpm type-check`, and `pnpm build` for rendering, content, or generated asset work. For visual or interactive changes, verify with `pnpm dev` or `pnpm preview` and include screenshots in the PR. Name future tests near the feature they cover, using the local file name as the stem.

## Commit & Pull Request Guidelines

Use Conventional Commits, matching the current history: `feat: ...`, `fix: ...`, and `chore: ...`. Keep commits and PRs focused on one concern. PRs should include a concise summary, linked issues when relevant, validation commands run, and screenshots for UI changes. Discuss major features or design changes in an issue or discussion before implementation.

## Security & Configuration Tips

Do not commit secrets, tokens, or service keys in config files. Keep deployment-specific settings in the target platform environment, and review generated files such as `dist`, `src/constants/lqips.json`, and `src/constants/icons.ts` before committing them.

`pnpm install` installs the repo's Git hooks (`core.hooksPath` → `.githooks`), so `pre-commit` and `pre-push` run `scripts/check-secrets.mjs` and reject staged/pushed secrets; CI repeats the scan in the `secret-scan` job. Rules, key locations, and the explicit `--no-verify` escape hatch are documented in `docs/SECRETS.md` — never weaken the rules to get a commit through.
