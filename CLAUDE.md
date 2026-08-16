# CLAUDE.md

Guía para Claude Code al trabajar en este repo.

## Qué es

`voleystatslive` es el **visor web público** del ecosistema Voley Stats (apps iOS/Android). No tiene backend propio: **lee** en tiempo real (o desde caché) el mismo proyecto Firebase/Firestore en el que las apps escriben, y lo renderiza. Coupling único con `../VoleyStatsApp/` y `../VoleyStats-Android/`: Firestore. El contrato de campos es autoritativo en `../VoleyStatsApp/CLAUDE.md` ("Companion web app" / "Live sets scoreboard") — este repo solo lee, nunca escribe.

Stack: **Vue 3** (`<script setup>`, TS) + **vue-router** (history mode) + **vuefire**/Firebase (solo Firestore) + **Tailwind** (dark-only) + **ApexCharts** (`vue3-apexcharts`) + **vue-i18n**. Build con **Vite** (rolldown). Deploy en Vercel como SPA (`vercel.json` reescribe todo a `index.html`).

## Ecosistema y flujo de trabajo

Tres repos independientes, acoplados solo por Firestore:

| Repo | GitHub | Rol | Rama de trabajo |
|---|---|---|---|
| iOS | `Pauhdr/voley_stats` | **Implementación de referencia**; escribe Firestore | `dev` |
| Android | `VoleyStats/VoleyStats-android` | Port a paridad con iOS; escribe Firestore | `main` |
| Web (este repo) | `VoleyStats/voleystatslive` | Visor público; solo LEE Firestore | `main` |

En local los hermanos están en `../VoleyStatsApp/` y `../VoleyStats-Android/`; en una sesión cloud donde no estén clonados, inspecciónalos con `gh` (la credencial puede leer los tres). Flujo de specs: las ideas se convierten en issues con label `spec` vía el comando `/idea` (`.claude/commands/idea.md`) — investigación + spec, sin implementar. La implementación se pide aparte y llega como PR contra `main`.

## Comandos

```bash
npm install
npm run dev       # Vite dev server
npm run build     # vue-tsc (type-check estricto) + vite build — un error de tipos bloquea el build
npm run preview   # sirve el build de producción
```

Requiere `.env` (copiar `.env.example`) con las claves `VITE_*` de Firebase, apuntando al mismo proyecto que usan las apps. Sin `.env` válido, `firebase.ts` inicializa con config `undefined` y toda lectura falla en runtime. No hay test runner ni linter; `vue-tsc` (parte de `build`) es el único check estático. `tsconfig` es estricto (`noUnusedLocals`/`noUnusedParameters`) — mantén el código limpio en vez de añadir `@ts-ignore` (actualmente no hay ninguno en el repo).

## Code-splitting

`main.ts` **no** importa Firebase ni ApexCharts — el chunk inicial (Home/SEO) se queda ligero. `src/firebase.ts` (init + `db`) solo lo importan las páginas lazy que leen Firestore; los composables de vuefire (`useDocument`) encuentran la app por defecto vía `getApp()`, así que no hace falta instalar el plugin `VueFire` en `main.ts`. `vite.config.ts` fija los chunks de vendor pesados vía `rolldownOptions.output.codeSplitting.groups` (`firebase`, `apexcharts`, y `apexcharts-ssr` para la copia SSR que `vue3-apexcharts` importa dinámicamente pero el navegador nunca descarga). No reintroduzcas esos imports en `main.ts` u otros módulos eager.

## Rutas (`src/router.ts`, `createWebHistory`)

- `/` → `Home.vue` (landing de marketing).
- `/overlay/:code` → `Overlay.vue`, `meta: { bare: true }` — marcador para OBS (Browser Source), fondo transparente, **sin** el chrome de `Layout` (ver `App.vue`: si `route.meta.bare`, renderiza el `RouterView` directo, sin envolver en `Layout`). Query params: `?setup` (panel flotante de configuración con vista previa en vivo, no pensado para OBS), `?demo=1|between` (datos simulados sin partido real, útil para maquetar/posicionar sin tocar Firestore), `?pos=`, `?scale=`, `?banners=` (posición/tamaño/modo de banners del marcador). Estos tres últimos siguen una cascada de prioridad: override de sesión del panel `?setup` > config remota `teams/{team.id}.overlay` (documento hot-reloaded, para que el streamer reposicione desde la app sin tocar la URL) > el propio query param de la URL > default.
- `/team-code` → `TeamCode.vue` (input de código de partido/equipo).
- `/privacy`, `/terms`, `/contact` → páginas legales (`Privacy.vue`/`Terms.vue` sobre `LegalPage.vue`, `Contact.vue`).
- `/stats/:id` (`parentStats`) → hijo `''` = `StatsView.vue` (envoltorio fino de `GeneralStats.vue`, la página de stats de UN partido). Seis pestañas internas (`TABS` en `GeneralStats.vue`): **General**, **Rotaciones**, **Por jugadora**, **Tablas**, **Direcciones**, **Punto a punto**. Mientras el partido está en directo (`match.live === true` y no cacheable) solo se muestran General y Punto a punto (`LIVE_VISIBLE_KEYS`); el resto (informe post-set: rotaciones, tablas por destreza, direcciones, detalle por jugadora) se desbloquea cuando el partido termina. Rutas antiguas `/stats/:id/players` y `/stats/:id/areas` redirigen a `stats` con `?tab=players` (compatibilidad de enlaces).
- `/team/:id` → `TeamMatches.vue` — página pública de un equipo (`teams/{id}`). Dos pestañas de alto nivel: **Partidos** (lista de partidos compartidos, con selector de temporada si el equipo publica `current_season`) y **Estadísticas** (agregado multi-partido), con 7 sub-pestañas propias (`STATS_TABS`): general, rotaciones, absolutas, histórico, direcciones, por jugadora, tablas.
- `/:code([A-Za-z0-9]{15,})` → enlace corto (`voleystats.vercel.app/<código>`); redirige a `stats`. El patrón (15+ alfanuméricos) evita capturar otras rutas — los códigos son IDs de Firestore.

`Layout.vue` envuelve todas las rutas salvo las `bare`: nav superior con botón "atrás" (oculto en `home`/`code`) y CTA "Ver en vivo" (oculto en `code`/`stats`/`players`/`team`/`overlay`, donde no aporta), más footer con enlaces legales. No hay barra inferior de navegación (toolbar) actualmente.

## Patrón de datos

Dos modos de lectura según el estado del partido, decididos **una sola vez** al resolver el doc de `live_matches/{id}` (ver `GeneralStats.vue` y el composable `useTeamStats.ts` para el caso multi-partido de `/team/:id`):

- **En directo** (`match.live === true` y `!isMatchCacheable(match)`): `onSnapshot` permanente sobre `query(collection(db,"live_matches",id,"stats"), orderBy("order"))` + `useDocument(doc(db,"live_matches",id))`. Si el partido termina con la página abierta, esa sesión sigue con el mismo listener (no migra a mitad de sesión); solo una visita nueva tras recargar entraría en modo one-shot.
- **Terminado / cacheable** (`isMatchFinished`/`isMatchCacheable` en `src/utils/volleyStats.ts`): one-shot **cache-first** — intenta `getDocsFromCache` (IndexedDB local, sin red); si lanza o viene vacía, cae a `getDocs` contra el servidor. Sin listener: la página no vuelve a tocar Firestore para ese partido.

Toda la agregación (marcador, rachas, eficiencias, kills/aces derivados, rotaciones, direcciones...) es **client-side**, vía `watch` + `Map.groupBy` sobre el stream crudo de `stats` — no hay agregación en servidor. `GeneralStats.vue` es la referencia de cómo se deriva cada métrica.

**Dos capas de caché, con propósitos distintos:**
1. `initializeFirestore` + `persistentLocalCache({ tabManager: persistentMultipleTabManager() })` en `src/firebase.ts` — caché IndexedDB nativa de Firestore (multi-pestaña), usada por `getDoc`/`getDocs`/`getDocsFromCache`/`onSnapshot` para todo. Si `initializeFirestore` falla síncronamente (Safari privado, cuota agotada...) cae a `getFirestore` (caché en memoria).
2. `localStorage` en `useTeamStats.ts` (para `/team/:id`, que agrega muchos partidos): esquema versionado (`CACHE_SCHEMA_VERSION = 3`, clave `vsl-team-match-v3:{code}`), con entradas que incluyen un **fingerprint** (`sets_scoreboard`/`current_set`) para invalidar si el partido cambió, y una proyección **"slim"** de los stats cacheados (solo los campos necesarios) para caber en la cuota de ~5 MB de `localStorage` con varios partidos. Versiones de esquema anteriores se purgan automáticamente al arrancar.

## Dónde vive la lógica compartida

- `src/utils/volleyStats.ts` — el núcleo: constantes de `action.id` por área (`KILL_IDS`, `ATTACK_IDS`, `SERVE_IDS`, `RECEPTION_IDS`...), `AREA_LABEL_KEYS` (10 áreas, 0–9), derivación de kills/aces reales (`deriveCredits`/`mergeCredits`, re-atribuyendo errores rivales de recepción/defensa como punto nuestro), eficiencias, side-out/break, `isMatchFinished`/`isMatchCacheable`, radar, rotaciones, ataque por técnica/dirección. Punto de entrada obligado para tocar cualquier métrica.
- `src/utils/teamTables.ts` — tablas agregadas multi-partido para `/team/:id`.
- `src/composables/useTeamStats.ts` — composable que orquesta la lista de partidos de un equipo: caché `localStorage` (ver arriba), resolución cache-first/one-shot/`onSnapshot` por partido, y merge de stats entre partidos.
- `src/components/stats/*.vue` (`SkillTablesSection`, `DirectionsSection`, `Rotations360Section`, `PlayerDetailSection`) — secciones de pestañas reutilizadas entre `GeneralStats.vue` (un partido) y `TeamMatches.vue` (agregado de equipo).

## i18n

vue-i18n Composition API (`legacy: false`, `globalInjection: true`), fuente de verdad `src/i18n/es.json`, traducción `en.json`. Locale por defecto: `localStorage["vsl-locale"]` si existe, si no `navigator.language` (es si empieza por "es", en en caso contrario); persistido al cambiar desde el toggle ES/EN del `Layout`. **Al añadir texto de UI, añade la clave a AMBOS JSON.** `Overlay.vue` (marcador OBS) se deja **sin traducir a propósito** — el streamer controla el idioma vía OBS/stream, no por navegador. El SEO estático + JSON-LD de `index.html` también se queda en español fijo (no vue-i18n, es HTML estático).

## Contrato de datos (solo lectura)

Este repo nunca escribe Firestore; las apps (iOS/Android) son las únicas escritoras. Los shapes vienen de `toJSON()`/`updateLiveScoreboard` en las apps y son un API duro — un rename ahí rompe esto en silencio (no en compilación). Contrato autoritativo, campo a campo: `../VoleyStatsApp/CLAUDE.md`.

Resumen de lo que se consume:
- `live_matches/{code}` — `opponent`, `team.{id,name,color}`, `n_sets`, `live`, `current_season`, y el marcador de sets (`sets_us`, `sets_them`, `current_set`, `sets_scoreboard[]`).
- `live_matches/{code}/stats/{id}` — `order`, `to` (0 rally en curso / 1 punto nuestro / 2 punto rival), `score_us`/`score_them`, `stage`, `server`, `set.{id,number}`, `player.{id,name}`, `action.{id,area,type}`, más campos ya documentados en el contrato (`rotation`, `direction`, `setter`, `detail`, `player_in`, `rotationCount`/`Turns`, `set_closed`).
- `teams/{team.id}` — nombre/color/temporada del equipo, y opcionalmente `teams/{id}.overlay` (config remota de posición del marcador, ver rutas).
- **Nota de privacidad:** `player.birthday` **nunca** llega en los JSON de jugadora — se elimina intencionadamente de toda escritura a Firestore (`LivePrivacy.stripBirthday` en iOS, espejo en Android). No es un bug ni un campo a reclamar.

Si algo sale mal o vacío en la UI, comprueba primero si la app está escribiendo ese campo (puede ser una build antigua) antes de depurar el lado Vue.

## SEO / GEO

`index.html` lleva meta estática completa (title, description, canonical, Open Graph, Twitter) sobre el dominio real `https://voleystats.vercel.app/`, más tres bloques JSON-LD: `SoftwareApplication`, `Organization`+`WebSite`, `FAQPage`. **El JSON-LD de `FAQPage` debe mantenerse sincronizado a mano con el array `faqs` de `src/pages/Home.vue`.** `public/` incluye `robots.txt` (permite explícitamente crawlers de IA — GPTBot, ClaudeBot, PerplexityBot... — para GEO), `sitemap.xml`, `llms.txt` (resumen de producto para motores generativos), `site.webmanifest`, iconos y `og-image.png`. No hay prerendering/SSG: Google renderiza el JS; el JSON-LD + `llms.txt` cubren crawlers no-JS/IA.

**Scroll reveals** (`Home.vue` + `style.css`): progressive enhancement — contenido visible por defecto; un script inline en `index.html` añade la clase `js` a `<html>`, y solo entonces `.reveal` arranca oculto y anima con `IntersectionObserver`. Mantiene el contenido crawleable para bots sin JS. Respeta `prefers-reduced-motion`.

## Diseño

Dark-only (no hay light theme real; `ToggleTheme` no está enganchado). Tokens en `tailwind.config.js`: `ink` (fondos), `brand` (azul, primario), `volt` (lima, acento/CTA); fuentes `font-display` (Space Grotesk) y `font-sans` (Inter). Clases reutilizables en `src/style.css` bajo `@layer components` (`.btn-primary`, `.btn-ghost`, `.card`, `.eyebrow`, `.text-gradient`, `.container-x`, `.reveal`) — prefiérelas a recomponer utilidades sueltas. `src/components/Logo.vue` es la marca en SVG inline.

## Deuda conocida

- No hay tests automatizados ni linter; la única verificación es `vue-tsc` vía `npm run build`.
- `GeneralStats.vue` y `TeamMatches.vue` comparten bastante estructura de pestañas/selector de set pero no un componente común — al tocar cómo se filtra/pintan las pestañas, revisa ambos.
- Sin prerendering: el LCP inicial depende de que los bots ejecuten JS (mitigado con JSON-LD/`llms.txt`, ver SEO/GEO).
