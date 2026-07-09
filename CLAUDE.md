# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

z## Commands

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
## Overview

**voleystatslive** is the **public web viewer** for the Voley Stats iOS app. It has no backend of its own: it reads volleyball match data in realtime from the **same Firebase/Firestore project the iOS app writes to** and renders it. It is a companion to the app repo (`../VoleyStatsApp/`), coupled to it only through Firestore (see "Data source" below).

Stack: **Vue 3** (`<script setup>` SFCs) + **TypeScript** + **Vite** + **Tailwind** (dark mode via `selector`) + **ApexCharts** (`vue3-apexcharts`) + **vuefire** (Firebase bindings) + **GSAP** (landing animations) + **bootstrap-icons**. Deployed on **Vercel** as an SPA. README is stale Vite boilerplate — ignore it.

## Commands

```bash
npm install
npm run dev       # Vite dev server
npm run build     # vue-tsc type-check THEN vite build — type errors fail the build
npm run preview   # serve the production build
```

Requires a `.env` (copy `.env.example`) with Firebase `VITE_*` keys pointing at the **same Firebase project as the iOS app**. Without it, `firebase.ts` initializes with `undefined` config and all reads fail. `.env` is gitignored.

## Architecture

- **Entry:** `main.ts` mounts `App.vue`, registers the router, ApexCharts, and VueFire (with `firebaseApp` from `firebase.ts`). `App.vue` wraps `<RouterView>` in `layouts/Layout.vue` — so **every route currently renders inside Layout** (nav + gradient background + bottom toolbar + footer).
- **Router** (`router.ts`, `createWebHistory`):
  - `/` → `Home.vue` (marketing landing, GSAP fade-ins).
  - `/team-code` → `TeamCode.vue` (input where the user types the match `code`, then routes to `/stats/{code}`).
  - `/stats/:id` → `StatsView.vue` (renders `GeneralStats.vue`), child `/stats/:id/areas` → `AreaStats.vue`, child `/stats/:id/team` → `EmptyState` (placeholder, not built).
  - `:id` is the Firestore `live_matches` document id, i.e. the app's `match.code`.
- **Firebase data layer** (`src/firebase.ts`): initializes the app, exports `db` (Firestore), the `matches` collection ref, and `getMatch(id)`/`getStats(id)` helpers. In practice the pages mostly call Firestore directly rather than these helpers.
- **Realtime pattern** (the core of every stats page): subscribe to the stats subcollection ordered by `order`, and to the match doc:
  ```ts
  onSnapshot(query(collection(db, "live_matches", id, "stats"), orderBy("order")), q => {
    baseStats.data = q.docs.map(d => d.data())
  })
  const match = useDocument(doc(db, "live_matches", id))
  ```
  All displayed numbers (score, streaks, per-area errors, serve efficiency) are **derived client-side** from the raw stat stream via `watch` + `Map.groupBy` — there is no aggregation on the server. `GeneralStats.vue` is the reference for how each metric is computed.

## Data source (the contract with the iOS app — read-only here)

This app only ever **reads** Firestore; the iOS app is the sole writer. The document shapes are produced by the app's `toJSON()` methods and are a hard API — a field rename on the app side silently breaks this viewer. The authoritative, field-by-field contract is documented in **`../VoleyStatsApp/CLAUDE.md`** ("Companion web app" and "Live sets scoreboard"). Summary of what this repo consumes:

- **`live_matches/{code}/stats/{id}`** (subcollection, one per captured stat): `order`, `to` (0 rally / 1 point-us / 2 point-them), `score_us`, `score_them`, `stage`, `server` (null-checked), `player.name`, `action.id`/`action.area`/`action.type`, `set.{id,number}`.
- **`live_matches/{code}`** (match doc): `opponent`, `team` (name/color), `n_sets`, plus the live scoreboard fields `sets_us`, `sets_them`, `current_set`, `sets_scoreboard[]`.

When something in the UI shows wrong/missing data, first check whether the app is actually writing that field (the app may be an older build) before debugging the Vue side.

## Conventions & gotchas

- **Dark mode:** Tailwind `darkMode: "selector"`; the theme is the `dark` class on `<html id="voleyApp">` (hardcoded `class="dark"` in `index.html`). `ToggleTheme.vue` flips that class but is commented out in `Layout.vue` — the app is effectively dark-only right now.
- **Strict TS, loose code:** `tsconfig` has `strict`, `noUnusedLocals`, `noUnusedParameters`, yet the code leans on ~11 `@ts-ignore`s and `Map.groupBy` (newer than the ES2020 lib target). Since `build` runs `vue-tsc` first, new type errors will block deploys — keep new code clean rather than adding more `@ts-ignore`.
- **SPA routing:** `vercel.json` rewrites everything to `index.html`; deep links like `/stats/xyz` work in production because of this. Keep it when adding routes.
- **Layout wraps all routes:** any route that should NOT show the nav/footer/toolbar/background (e.g. a broadcast overlay) must bypass or conditionally disable Layout — see below.

## Current initiative: OBS scoreboard overlay (`/overlay/:code`)

We are adding a **broadcast scoreboard** to be composited into a YouTube live stream via OBS (a "Browser Source" pointing at this route). The iOS-side data (Fase 0/1) is already done and publishing the fields listed above. What this repo needs:

- A new route `/overlay/:code` rendering **only** the scoreboard: team names/score, sets won (`sets_us`–`sets_them`), current set points (from the last stat in the stream), optional per-set breakdown (`sets_scoreboard`).
- **Transparent background and no Layout chrome** — OBS composites this over video, so nav/footer/gradient must not render. Either make `App.vue`/`Layout.vue` skip the wrapper for the overlay route (Layout already gates the toolbar by route name, extend that pattern), or give the overlay its own bare layout.
- Large, high-contrast typography with outline/shadow for legibility over arbitrary video.
- Reuse the exact same Firestore subscriptions as `GeneralStats.vue` (match doc + stats subcollection); no new data plumbing needed.
- Consider URL query params (`?scale=`, `?pos=`, theme) so the streamer can place/size it in OBS without code changes.
- This is Enfoque A only. Embedding the YouTube player on our own site (Enfoque B, with a latency offset to sync scoreboard to the delayed video) is **deferred** — do not build it now.
