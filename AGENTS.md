# Repository Guidelines

## Project Overview

This repository powers `seiya058904.github.io`. Its static HTML/CSS/browser-JavaScript frontend is published by GitHub Pages without a build step. `ppt-likes-api/` is a strict-TypeScript Cloudflare Worker using Hono, chanfana/OpenAPI, Zod, KV, and Supabase. Browser entry points are `index.html`, `mobile.html`, `account.html`, and `admin-likes.html`; the Worker entry is `ppt-likes-api/src/index.ts`.

## Project Structure & Module Organization

- `css/`, `js/`: shared/page-specific frontend code; `js/bg-manager.js` is desktop-only WebGL code.
- `assets/`: runtime images, icons, project posters, and PPT covers.
- `ppt/`: 38 standalone HTML presentations linked from the homepages.
- `tests/ppt-discovery.test.js`: Node and Playwright checks.
- `ppt-likes-api/src/endpoints/`: OpenAPI route classes. Read `ppt-likes-api/AGENTS.md` before Worker work.
- `supabase/`: SQL applied manually; no migration runner exists.
- Comments public queries must never select `user_email`; comments may be written only through the Worker service-role path. Apply `supabase/harden_comments_permissions.sql` manually in Supabase after reviewing it. The WebGL background must preserve BFCache return behavior and respect `prefers-reduced-motion`.
- `design-system/`: visual notes based on `6f47e72`; they predate the latest redesign, so verify against current code.

## Architecture Notes

Requests flow browser -> Cloudflare Worker -> KV and/or Supabase. `js/comments-config.js` is public; server credentials belong only in Worker secrets. Authenticated requests carry access tokens. The three pages that load Supabase use the pinned CDN version `@supabase/supabase-js@2.110.1`.

Comment responses must own the current modal generation and item. Capture the raw draft and input revision before token acquisition; a successful POST clears only that unchanged draft, including the revision check when the user edits back to the same text. Keep the counter synchronized with the current draft, and preserve drafts on failures. Desktop/mobile race tests use synthetic API routes and never write production comments.

Keep persistent `data-like-id` values synchronized across `index.html`, `mobile.html`, `js/ppt-catalog.js`, and `ppt-likes-api/src/allowedLikeIds.ts`. Preserve script order. New external origins may require coordinated CSP and Worker CORS changes.

Desktop and mobile are separate variants. `index.html` loads `css/style.css` and `js/bg-manager.js`; its button switches three saved WebGL backgrounds with lazy initialization. `mobile.html` loads `css/mobile-legacy.css`, uses `assets/page-bg.webp`, has extra sections, and omits WebGL.

Both primary CSS files contain chronological overrides. Read the full cascade; use a narrow final override unless consolidation is requested. Keep shared layout, accessibility, and filtering aligned while preserving intentional platform differences.

PPT discovery shows five cards and moves 33 into `.ppt-overflow-grid`. Filtering reunites them, applies `is-filtering`, and normalizes the featured card; clearing restores prior state. Change this flow across `js/main.js`, both homepages, and both primary CSS files together.

## Adding a New Card

A card is only fully applied once its `data-like-id` is in `ppt-likes-api/src/allowedLikeIds.ts` **and the Worker has been redeployed**. Likes and comments share that whitelist, and the Worker enforces it server-side, so a frontend-only change leaves a new card unable to like or comment (`400 Unknown itemId`). Use lowercase letters, numbers, and hyphens only (`likeIdPattern` in `ppt-likes-api/src/types.ts`), and keep the id identical in every file that lists it.

Project card (`project-<slug>`):

- Add the `<article class="card project-card" data-like-id="...">` block to `index.html` and `mobile.html`, with a cover under `./assets/` and the repository/play links.
- Add the id to `allowedLikeIds.ts`. `js/ppt-catalog.js` holds PPT ids only, so leave it unchanged.

PPT card (`ppt-<slug>`):

- Add the `<article class="card project-card ppt-card" data-like-id="...">` block to `index.html` and `mobile.html`, containing both `href="./ppt/<name>.html"` and a cover `<img src="./assets/...">`; both paths must resolve on disk.
- Add the standalone presentation under `ppt/` and its cover under `assets/`.
- Add the id to `js/ppt-catalog.js` (with category and tags) and to `allowedLikeIds.ts`.
- Respect the featured/overflow split: only the first five `.ppt-card` elements stay direct children of `.ppt-grid`, and `js/main.js` moves the rest into `.ppt-overflow-grid`.

Supabase needs no change for either card type. `public.comments` stores a generic `item_id` with no per-card whitelist, so new cards require no SQL migration.

Update the constants that hardcode the current catalogue size: `tests/ppt-discovery.test.js` asserts 38 PPT cards, five visible `.ppt-card` children, and the expand/collapse baseline, and the counts quoted in this file and `CLAUDE.md` track the same numbers.

Verify with `npm test`, then confirm production with a read-only `GET /api/comments?itemId=<new-id>`; `success: true` proves the deployed whitelist contains the new id.

## Build, Test & Development Commands

```powershell
npx serve . -l 4173        # Preview static frontend
npm test                   # node:test + Playwright; preview must be running
gh run list --limit 5      # Inspect CI runs for this branch
Set-Location ppt-likes-api
npm run dev                # Local Worker
npm run typecheck          # TypeScript check, no output
npm run cf-typegen         # Regenerate types after binding changes
npm run deploy             # Deploy Worker; explicit authorization required
git status
git diff
git diff --stat
```

There is no frontend build, lint, or format step. CI is defined in `.github/workflows/ci.yml` and runs on pull requests and pushes to `main`: it starts a static preview on port 4173 and runs `npm test`. Nothing in it deploys. Installs, deployment, migrations, database writes, commits, pushes, tags, and releases require explicit authorization.

## Coding Style & Naming Conventions

Follow adjacent code. Frontend HTML/JavaScript generally uses two spaces and `camelCase`; Worker TypeScript uses tabs, strict types, and `PascalCase` endpoint classes. Preserve response shapes, script order, and compatibility. Regenerate, never hand-edit, `ppt-likes-api/worker-configuration.d.ts`.

## Testing & Verification

`npm test` runs test files sequentially so browser suites do not compete for CI resources; it checks ID synchronization and desktop/mobile PPT filtering at `http://127.0.0.1:4173` (or `TEST_BASE_URL`). Preview frontend changes on desktop and `390x844` mobile; test affected controls, console/network/CSP errors, keyboard focus, reduced motion, and fallbacks. Check WebGL and the mobile static background when relevant. Check account/admin pages when affected. For Worker changes, run `npm run typecheck` and verify affected routes plus `/api/health`, including auth, CORS, validation, and errors. Report failures and skipped checks.

## Browser Testing

For changes affecting web UI, routing, interaction, responsiveness, or runtime behavior, perform real browser verification before declaring completion.

Use the most appropriate tool:

- **Browser plugin** — preferred for routine localhost checks, navigation, visual inspection, and exploratory testing.
- **Playwright** — use for repeatable E2E flows, regression tests, assertions, and important user paths.
- **Chrome plugin** — use when the real Chrome profile, cookies, sessions, extensions, or logged-in state are required.
- **Chrome DevTools** — use for console, network, rendering, memory, scrolling, or performance diagnosis.
- **Computer Use** — use only when native OS interaction is required.

Prefer real user flows over injected state, modified storage, hidden routes, or DOM manipulation.

When relevant, verify the affected flow, routing/refresh behavior, representative desktop and mobile sizes, console errors, failed resources, and the deployed site when localhost may differ from production.

A successful build or passing unit tests do not prove browser behavior is correct.

If a bug is found, reproduce it, fix the root cause, and rerun the failing path. Add a Playwright regression test when recurrence would be costly.

Keep testing proportional to risk; do not run every browser tool unnecessarily.

Never claim browser verification passed unless the required flow was actually executed successfully.

## Commit & Pull Request Guidelines

Recent subjects are short and imperative, sometimes prefixed `fix:` or `chore:`. Keep commits single-purpose. PRs need behavior, verification, risks, UI screenshots, and fix reproduction steps where applicable.

## Security & Configuration

Never commit/expose `.env`, `.dev.vars`, keys, tokens, passwords, private keys, connection strings, service-role credentials, or admin secrets. Keep secrets out of browser code, docs, replies, logs, and commit messages. Exclude caches, build output, Wrangler state, and temporary files. Explain risk and obtain authorization before changing auth, permissions, database data/schema, signing, production configuration, secrets, or billing.

Before proposing Durable Objects or another strong-consistency migration for likes, read the accepted trade-off in `CLAUDE.md`; KV counter and soft rate-limit races are intentionally accepted for this low-traffic decorative feature unless the user explicitly reopens the decision.

## Agent-Specific Instructions

Read relevant files and state a short plan before editing. Make small, reviewable changes; preserve user work and do not alter unrelated code, contracts, rules, values, or compatibility. Do not invent commands, paths, APIs, tests, or deployment steps. Stop on ambiguity or production/data risk. Without authorization, do not install dependencies, auto-fix, format the repository, commit, push, deploy, publish, release, create resources, change secrets, or execute database operations. Report failed and unrun checks.

## Pre-Commit Checklist

- Review `git status`, `git diff`, `git diff --stat`, and exact staged files.
- Include only task files; exclude secrets, logs, caches, debug output, and generated files.
- Run relevant checks and name anything skipped.
- Recheck desktop/mobile parity, CSP/CORS, API contracts, and like-ID synchronization when applicable.
- Confirm explicit commit/push authorization.
