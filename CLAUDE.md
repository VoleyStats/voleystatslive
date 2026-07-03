# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Vite dev server
npm run build    # vue-tsc typecheck THEN vite build — typecheck failures block the build
npm run preview  # serve the production build locally
```

There is no test runner and no linter. `vue-tsc` (run as part of `build`) is the only static check. `tsconfig.json` is strict with `noUnusedLocals`/`noUnusedParameters`, so unused variables/imports fail the build — but note the stats components lean heavily on `// @ts-ignore` and `any[]` to bypass this on the Firestore data. Commit prefixes like `test:` in the history refer to manual verification, not an automated suite.

## Setup

Firebase credentials come from `VITE_*` env vars. Copy `.env.example` to `.env` and fill in the Firebase project config before running. Without a valid `.env`, Firestore calls fail at runtime.

## Architecture

Single-page Vue 3 app (`<script setup>` SFCs, TypeScript) that displays **live volleyball match statistics** read in real time from Firestore. There is no backend in this repo — a separate app (not in this codebase) writes match data; this app is read-only. UI copy is in Spanish.

**Stack:** Vue 3 + vue-router (history mode, non-home routes lazy-loaded) + VueFire/Firebase (Firestore only) + Tailwind + ApexCharts (`vue3-apexcharts`, registered globally as `<apexchart>`; the ApexCharts core loads as its own async chunk, so the landing doesn't pay for it). Deployed on Vercel; `vercel.json` rewrites all paths to `index.html` for client-side routing.

**Composition:** `App.vue` → `layouts/Layout.vue` (nav + bottom toolbar + footer) → `<RouterView>` slot. The bottom toolbar is hidden on the `home` and `code` routes.

### Firestore data model

- Collection `live_matches` — each document is one match, keyed by an ID that **is the "team code"** users type on `/team-code`. That navigates to `/stats/<id>`. Match docs carry `n_sets` (used to render the set selector).
- Subcollection `live_matches/<id>/stats` — each document is a single recorded action/rally outcome. Components subscribe with `onSnapshot(query(..., orderBy("order")))` for live updates, and read the match doc with VueFire's `useDocument`.

> The helper functions `getMatch`/`getStats` in `src/firebase.ts` are unused legacy — components call `onSnapshot` directly. `src/firebase.ts` exports the live `db`, the `matches` collection, and Firebase init.

### Stat document shape (reverse-engineered — there are no type definitions for it)

Each stat doc is consumed with fields including: `order` (sort key), `set.number`, `stage` (`0` = serve stage), `score_us`/`score_them`, `server`, `player` (`{ name, ... }`), and `action` (`{ id, type, area }`).

- `to`: rally outcome — `0` = rally still in progress, `1` = point for our team, `2` = point for opponent / our error. `to !== 0` means the rally finished.
- `action.area`: index into this fixed label array (see `GeneralStats.vue`): `["Recepción", "Bloqueo", "Defensa", "Colocación", "Saque", "Ataque", "Falta"]` (0–6).
- `action.id`: specific action code. Reception grades used in `AreaStats.vue`: `2` = "-", `3` = "+", `4` = "++", `22` = error; ids `1,2,3,4,22` are the reception actions. `action.type === "error"` flags errors.

All aggregation (score, streaks, per-player/per-area breakdowns, serve efficiency) is derived **client-side** with a `watch(stats, ...)` handler and `Map.groupBy`. When editing stats logic, expect to trace these derivations rather than a schema.

### Routes (`src/router.ts`)

- `/` → `Home.vue` (marketing landing page)
- `/team-code` → `TeamCode.vue` (enter match/team code)
- `/stats/:id` → parent with no component; children render directly:
  - `''` → `StatsView.vue` → `GeneralStats.vue` (score, streaks, error & point-log charts)
  - `areas` → `AreaStats.vue` (per-player reception breakdown)
  - `team` → `EmptyState.vue` (placeholder — not yet built)

The bottom toolbar links to `areaStats` ("Stats") and `teamStats` ("Team"), not to the base `stats` route.

### Known duplication

`GeneralStats.vue` and `AreaStats.vue` each independently reimplement the same set-selector UI and the same `onSnapshot` + `baseStats`/`stats` + `watch(set)` filtering boilerplate. A change to how stats are fetched or filtered by set usually needs to be made in both.

### Design system & theming

The app commits to a single dark visual world (sports-analytics product) — there is no light theme. Design tokens live in `tailwind.config.js`: brand palette `ink` (near-black grounds), `brand` (electric blue, primary), `volt` (lime, energy/CTA accent); fonts `font-display` (Space Grotesk) and `font-sans` (Inter), loaded via `<link>` in `index.html`. Reusable component classes (`.btn-primary`, `.btn-ghost`, `.card`, `.eyebrow`, `.text-gradient`, `.container-x`, `.reveal`) are defined in `src/style.css` under `@layer components` — prefer these over re-deriving utility soup. `src/components/Logo.vue` is the inline-SVG brand mark (replaces the old 490 KB PNG on the critical path).

**Scroll reveals** use a progressive-enhancement pattern (see `Home.vue` + `style.css`): content is visible by default; an inline script in `index.html` adds a `js` class to `<html>`, and only then does `.reveal` start hidden and animate in via `IntersectionObserver`. This keeps content crawlable for non-JS bots. Respect `prefers-reduced-motion` (already handled in `style.css`).

### SEO & GEO

`index.html` carries full static meta (title, description, canonical, Open Graph, Twitter) plus three JSON-LD blocks: `SoftwareApplication`, `Organization`, and `FAQPage`. **The `FAQPage` JSON-LD must be kept in sync with the `faqs` array in `src/pages/Home.vue`.** `public/` holds `robots.txt` (explicitly allows AI crawlers — GPTBot, ClaudeBot, PerplexityBot, etc. — for GEO), `sitemap.xml`, `llms.txt` (product summary for generative engines), `site.webmanifest`, `favicon.svg`, and `og-image.svg`.

> All absolute URLs use the placeholder domain `https://voleystatslive.com` — replace with the real production domain (in `index.html` canonical/OG/Twitter/JSON-LD, `robots.txt`, and `sitemap.xml`) before launch. There is no prerendering/SSG yet: Google renders the JS, and JSON-LD + `llms.txt` + a `<noscript>` summary cover non-JS/AI crawlers. Firebase still ships in the main bundle (VueFire is initialized globally in `main.ts`); deferring it to the stats routes is the main remaining perf win.
