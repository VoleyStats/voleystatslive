# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
