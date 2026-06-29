# Repository Guidelines

## Project Overview

This repository powers `seiya058904.github.io`.

- The frontend is static HTML/CSS/browser JavaScript published with GitHub Pages; it has no framework, bundler, or build step.
- `ppt-likes-api/` is a strict-TypeScript Cloudflare Worker using Hono, chanfana/OpenAPI, Zod, KV (likes/rate limits), and Supabase (auth, comments, profiles).
- Browser entry points are `index.html`, `mobile.html`, `account.html`, and `admin-likes.html`; the Worker entry is `ppt-likes-api/src/index.ts`.

## Project Structure & Module Organization

- `css/`, `js/`: shared and page-specific frontend code.
- `assets/`: runtime images, icons, project posters, and PPT covers.
- `ppt/`: standalone HTML presentations linked from the homepages.
- `tests/ppt-discovery.test.js`: Node test runner and Playwright checks.
- `ppt-likes-api/src/endpoints/`: OpenAPI route classes. Read `ppt-likes-api/AGENTS.md` before Worker work.
- `supabase/`: manually applied SQL instructions; no migration runner exists.
- `COMMENTS_SETUP.md`, `ppt-likes-api/LIKES_SETUP.md`: operating notes; verify against current code.

## Architecture Notes

Requests flow browser -> Cloudflare Worker -> KV and/or Supabase. `js/comments-config.js` is public and selects API URLs by hostname; server credentials belong only in Worker secrets. Authenticated clients send access tokens to the Worker.

Treat `data-like-id` values as persistent contracts. Keep them synchronized across `index.html`, `mobile.html`, `js/ppt-catalog.js`, and `ppt-likes-api/src/allowedLikeIds.ts`. Preserve script order. External resources or origins may require coordinated frontend CSP and Worker CORS updates.

### CSS — Dual Files & Three-Layer Design System

Frontend CSS lives in **two files** that must be kept in sync for any layout change:

- `css/style.css` — main stylesheet, contains three stacked design iterations (base → "Homepage redesign v2" → "Low-risk portfolio polish"). Add new rules at the **end of the file** to avoid being overridden by later layers.
- `css/mobile-legacy.css` — mobile-adaptation overrides; duplicate relevant filtering/layout rules here.

### PPT Filtering (Grid + Overflow)

The homepage displays 28 PPT cards, initially showing only the first 5. The remainder are moved into a separate `.ppt-overflow-grid` at runtime. On category/text filter, JS:

1. Moves all cards back into the primary `.ppt-grid` so they form a single continuous layout.
2. Adds `is-filtering` to both grids.
3. CSS overrides collapse `.ppt-card-featured` (normally full-width) to a regular two-column card.
4. On filter clear, cards past position 5 are moved back to the overflow grid and `is-filtering` is removed.

When editing filter/display logic, update **both** `style.css` and `mobile-legacy.css`.

## Build, Test & Development Commands

```powershell
npx serve . -l 4173        # Preview frontend
npm test                   # node:test + Playwright; preview must be running
Set-Location ppt-likes-api
npm run dev                # Local Worker
npm run typecheck          # TypeScript check, no output
npm run cf-typegen         # Regenerate types after binding changes
git status
git diff
git diff --stat
```

There is no frontend build, lint, format, or CI command. Installs, deployment, publishing, migrations, database writes, commits, pushes, tags, and releases require explicit authorization.

## Coding Style & Naming Conventions

Follow adjacent code. Frontend HTML/JavaScript generally uses two spaces and `camelCase`; Worker TypeScript uses tabs, strict types, and `PascalCase` endpoint classes. Preserve response shapes, script order, naming, and compatibility. Do not edit generated `ppt-likes-api/worker-configuration.d.ts`; regenerate it only for intentional binding changes.

## Testing & Verification

Run `npm test` for PPT discovery and ID synchronization changes. For frontend work, preview desktop and `390x844` mobile pages, exercise affected controls, and check console, network, and CSP errors. Check account/admin pages when relevant. For Worker work, run `npm run typecheck` and verify affected endpoints plus `/api/health`, including applicable auth, CORS, validation, and errors. Report failed or skipped checks honestly.

## Commit & Pull Request Guidelines

Recent commits use short, imperative subjects such as `Add ...`, `Fix ...`, and `Update ...`. Keep commits single-purpose. PRs should state behavior changes, verification, and remaining risk; include screenshots for UI changes and reproduction steps for fixes.

## Security & Configuration

Never commit or expose `.env`, `.dev.vars`, keys, tokens, passwords, private keys, connection strings, service-role credentials, or admin secrets. Keep server credentials out of browser code, documentation, replies, logs, and commit messages. Exclude caches, build output, Wrangler state, and temporary files. Explain risks and obtain authorization before changing auth, permissions, database data/schema, signing, production configuration, secrets, or billing.

## Agent-Specific Instructions

Read relevant files and state a short plan before editing. Make small changes; preserve user work and do not alter unrelated code, contracts, rules, values, or compatibility. Do not invent commands, paths, APIs, tests, or deployment steps. Stop on ambiguity or production/data risk. Without authorization, do not install, auto-fix, format, bulk-delete, commit, push, deploy, publish, release, create resources, change secrets, or execute database operations. Report failed and unrun checks.

## Pre-Commit Checklist

- Review `git status`, `git diff`, `git diff --stat`, and the exact staged files.
- Confirm only task files are included; exclude secrets, logs, caches, debug output, and accidental generated files.
- Run relevant checks and state what was not run.
- Recheck desktop/mobile parity, CSP/CORS, API contracts, and like-ID synchronization when applicable.
- Confirm commit and push authorization for the current task.
