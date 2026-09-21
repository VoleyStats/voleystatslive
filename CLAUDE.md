# CLAUDE.md

Guía para Claude Code al trabajar en este repo.

## Qué es

`voleystatslive` es el **visor web público** del ecosistema Voley Stats (apps iOS/Android). No tiene backend propio: **lee** en tiempo real (o desde caché) el mismo proyecto Firebase/Firestore en el que las apps escriben, y lo renderiza. Coupling único con `../VoleyStatsApp/` y `../VoleyStats-Android/`: Firestore. El contrato de campos es autoritativo en `../VoleyStatsApp/CLAUDE.md` ("Companion web app" / "Live sets scoreboard") — este repo solo lee, nunca escribe.

Stack: **Vue 3** (`<script setup>`, TS) + **vue-router** (history mode) + **vuefire**/Firebase (solo Firestore) + **Tailwind** (dark-only) + **ApexCharts** (`vue3-apexcharts`) + **vue-i18n**. Build con **Vite** (rolldown). Deploy en Vercel como SPA (`vercel.json` reescribe todo a `index.html`).

## Ecosistema y flujo de trabajo

Tres repos independientes, acoplados solo por Firestore:

| Repo | GitHub | Rol | Rama de trabajo |
|---|---|---|---|
| iOS | `VoleyStats/voleyStatsApp` | **Implementación de referencia**; escribe Firestore | `dev` |
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
- `/overlay/:code` → `Overlay.vue`, `meta: { bare: true }` — marcador para OBS (Browser Source), fondo transparente, **sin** el chrome de `Layout` (ver `App.vue`: si `route.meta.bare`, renderiza el `RouterView` directo, sin envolver en `Layout`). Query params: `?setup` (panel flotante de configuración con vista previa en vivo, no pensado para OBS), `?demo=1|between` (datos simulados sin partido real, útil para maquetar/posicionar sin tocar Firestore), `?pos=`, `?scale=`, `?banners=` (posición/tamaño/modo de banners del marcador) y `?logos=0|1` (mostrar u ocultar los escudos de equipo). Estos últimos siguen una cascada de prioridad: override de sesión del panel `?setup` > config remota `teams/{team.id}.overlay` (documento hot-reloaded, para que el streamer reposicione desde la app sin tocar la URL) > el propio query param de la URL > default.
- `/team-code` → `TeamCode.vue` (input de código de partido/equipo).
- `/pricing` → `Pricing.vue` (precios y planes; en inglés vive en `/en/pricing`, el slug NO se traduce porque el gemelo `/en` se genera con `/en${path}`). Tarjetas de plan, tabla comparativa y FAQ de facturación. Todo sale de `src/data/plans.json`.
- `/privacy`, `/terms`, `/contact` → páginas legales (`Privacy.vue`/`Terms.vue` sobre `LegalPage.vue`, `Contact.vue`).
- `/stats/:id` (`parentStats`) → hijo `''` = `StatsView.vue` (envoltorio fino de `GeneralStats.vue`, la página de stats de UN partido). Seis pestañas internas (`TABS` en `GeneralStats.vue`): **General**, **Rotaciones**, **Por jugadora**, **Tablas**, **Direcciones**, **Punto a punto**. Mientras el partido está en directo (`match.live === true` y no cacheable) solo se muestran General y Punto a punto (`LIVE_VISIBLE_KEYS`); el resto (informe post-set: rotaciones, tablas por destreza, direcciones, detalle por jugadora) se desbloquea cuando el partido termina. Rutas antiguas `/stats/:id/players` y `/stats/:id/areas` redirigen a `stats` con `?tab=players` (compatibilidad de enlaces).
- `/team/:id` → `TeamMatches.vue` — página pública de un equipo (`teams/{id}`). Dos pestañas de alto nivel: **Partidos** (lista de partidos compartidos, con selector de temporada si el equipo publica `current_season`) y **Estadísticas** (agregado multi-partido), con 7 sub-pestañas propias (`STATS_TABS`): general, rotaciones, absolutas, histórico, direcciones, por jugadora, tablas.
- `/:code([A-Za-z0-9]{15,})` → enlace corto (`voleystats.vercel.app/<código>`); redirige a `stats`. El patrón (15+ alfanuméricos) evita capturar otras rutas — los códigos son IDs de Firestore.

`Layout.vue` envuelve todas las rutas salvo las `bare`: nav superior con botón "atrás" (oculto en `home`/`code`) y CTA "Ver en vivo" (oculto en `code`/`stats`/`players`/`team`/`overlay`, donde no aporta, y en móvil siempre — ahí era un icono sin etiqueta compitiendo por el ancho, y vive en el menú), más footer con enlaces legales. No hay barra inferior de navegación (toolbar) actualmente.

**El `<nav>` de escritorio es `hidden md:flex` y además `v-if="isHome"`**, así que en móvil no había NINGUNA navegación: las secciones, `/pricing` y la FAQ solo se alcanzaban bajando hasta el pie. Lo cubre el **menú móvil** (`md:hidden`): botón en la cabecera → panel a pantalla completa (`<Transition name="menu">`, ver `.menu-*` en `style.css`) con las cuatro secciones + Planes y los dos CTA abajo, donde llega el pulgar. Los enlaces salen de `homeAnchor`, así que el menú funciona igual desde `/stats` o `/pricing` (`#faq` → `/#faq`). Cierra con Escape, al navegar (incluido el botón "atrás" del navegador, vía `watch` sobre `route.fullPath`), y bloquea el scroll de `<body>` mientras está abierto; `trapTab` es una trampa de foco mínima porque `aria-modal` calla a los lectores de pantalla pero no al tabulador.

**El selector de idioma ES/EN vive en la barra inferior del footer**, no en la cabecera: es una decisión que se toma una vez y en móvil competía por el ancho con los dos CTA.

**Trampa de los gemelos `/en`:** sus rutas se llaman `home-en`, `code-en`… (el
sufijo lo pone `router.ts`), así que comparar `route.name === 'home'` a pelo da
falso en TODA la versión inglesa — es lo que dejaba la portada `/en` con botón
"Volver" y sin CTA. La normalización vive en **`src/composables/useLocalePath.ts`**
(`baseName` quita el sufijo; `localeTo(path)` / `homeAnchor(hash)` mantienen al
usuario en su idioma en vez de saltar a la URL castellana, que además declara
otro canonical). El toggle ES/EN navega al gemelo, no solo cambia el locale.

**Esto NO es solo del chrome.** Estaba resuelto en `Layout.vue` y sin resolver en
las páginas: los CTA del hero, el enlace a Planes de "Funciones", el "volver" de
`/team-code` y el propio `router.push` de su formulario eran rutas castellanas
literales, así que un lector de `/en` salía de su versión del sitio al primer
clic. Por eso la lógica está en un composable: **cualquier enlace interno nuevo
va por `localeTo`/`homeAnchor`**, esté en el layout o en una página.

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
- `src/composables/useLocalePath.ts` — `localeTo`/`homeAnchor`/`baseName` para que todo enlace interno respete el gemelo `/en` (ver la trampa arriba).
- `src/utils/edgeFade.ts` — directivo `v-edge-fade` para las tiras de pestañas con scroll horizontal (`.tabstrip`): mide y escribe `data-edge="start end"`, y el CSS enciende el degradado del lado que corresponda. Se mide en vez de poner un degradado fijo porque uno fijo a la izquierda apaga la primera pestaña —normalmente la activa— sin que haya nada oculto detrás.
- `src/composables/useTeamStats.ts` — composable que orquesta la lista de partidos de un equipo: caché `localStorage` (ver arriba), resolución cache-first/one-shot/`onSnapshot` por partido, y merge de stats entre partidos.
- `src/components/stats/*.vue` (`SkillTablesSection`, `DirectionsSection`, `Rotations360Section`, `PlayerDetailSection`) — secciones de pestañas reutilizadas entre `GeneralStats.vue` (un partido) y `TeamMatches.vue` (agregado de equipo).

## Planes y matriz de gating (`src/data/plans.json`)

Fuente única de "qué plan desbloquea qué" en la web: precios, la lista de las 17
funciones (icono + tier mínimo + si el match pass también la abre) y las filas
extra de la tabla que no tienen tarjeta en la home. La **autoridad real es
`../VoleyStatsApp/STORE.md`** (matriz de gating) y `Entitlements.swift`; esto es
una copia para marketing y hay que actualizarla cuando cambie un gate en la app.

Lo consumen tres sitios que no comparten runtime, y por eso es JSON plano:
`src/data/plans.ts` (tipos + `planIncludes`/`formatPrice`), `Home.vue` (las
insignias de plan de cada tarjeta) y `Pricing.vue` (tabla), más
`scripts/prerender-head.mjs`, que genera con él los `Offer` del JSON-LD — un
`.mjs` de Node no puede importar TypeScript. Los textos siguen en i18n: la tabla
de `/pricing` reutiliza `home.features.f{n}Title`, así que **una función se
describe una sola vez**. Nombres comerciales: **Análisis** y **Análisis Live**
(nunca los tiers técnicos "Normal"/"Pro", que solo viven en ids de producto).

## i18n

vue-i18n Composition API (`legacy: false`, `globalInjection: true`), fuente de verdad `src/i18n/es.json`, traducción `en.json`. Locale por defecto: `localStorage["vsl-locale"]` si existe, si no `navigator.language` (es si empieza por "es", en en caso contrario); persistido al cambiar desde el toggle ES/EN del `Layout`. **Al añadir texto de UI, añade la clave a AMBOS JSON.** `Overlay.vue` (marcador OBS) se deja **sin traducir a propósito** — el streamer controla el idioma vía OBS/stream, no por navegador. El SEO estático + JSON-LD de `index.html` también se queda en español fijo (no vue-i18n, es HTML estático).

## Contrato de datos (solo lectura)

Este repo nunca escribe Firestore; las apps (iOS/Android) son las únicas escritoras. Los shapes vienen de `toJSON()`/`updateLiveScoreboard` en las apps y son un API duro — un rename ahí rompe esto en silencio (no en compilación). Contrato autoritativo, campo a campo: `../VoleyStatsApp/CLAUDE.md`.

Resumen de lo que se consume:
- `live_matches/{code}` — `opponent`, `team.{id,name,color}`, `n_sets`, `live`, `current_season`, y el marcador de sets (`sets_us`, `sets_them`, `current_set`, `sets_scoreboard[]`).
- `live_matches/{code}/stats/{id}` — `order`, `to` (0 rally en curso / 1 punto nuestro / 2 punto rival), `score_us`/`score_them`, `stage`, `server`, `set.{id,number}`, `player.{id,name}`, `action.{id,area,type}`, más campos ya documentados en el contrato (`rotation`, `direction`, `setter`, `detail`, `player_in`, `rotationCount`/`Turns`, `set_closed`).
- `teams/{team.id}` — nombre/color/temporada del equipo, y opcionalmente `teams/{id}.overlay` (config remota de posición del marcador, ver rutas).
- **Escudo de equipo** (aditivo, issue `voleyStatsApp#21`): `live_matches/{code}.team.logo_url`, `live_matches/{code}.opponent_logo_url` y `teams/{id}.logo_url` — String con URL pública absoluta y cache-buster `?v=<epoch>`, **`""` cuando no hay escudo, nunca `null`**. `teams/{id}.overlay.logos` (Bool) apaga los escudos en el overlay: **ausente significa `true`**, para que un cliente antiguo que nunca lo escriba no apague la feature. Se pintan con `src/components/TeamCrest.vue`, cuyo fallback es el contenido del slot (chip de color, insignia de iniciales) — la mayoría de equipos no tendrá escudo, así que el fallback es el caso normal, no el error. El origen permitido se valida en `src/utils/teamLogo.ts` y se declara además en la CSP `img-src` de `vercel.json`: **añadir un host de imágenes nuevo obliga a tocar los dos sitios**.
- **Nota de privacidad:** `player.birthday` **nunca** llega en los JSON de jugadora — se elimina intencionadamente de toda escritura a Firestore (`LivePrivacy.stripBirthday` en iOS, espejo en Android). No es un bug ni un campo a reclamar. El escudo de equipo es la **única** imagen que sí viaja al canal público, y por eso vive en un bucket aparte: las fotos de jugadora tienen prohibido llegar aquí (bucket privado, `player-photos`) porque en las plantillas hay menores y el visor es una URL sin registro.

Si algo sale mal o vacío en la UI, comprueba primero si la app está escribiendo ese campo (puede ser una build antigua) antes de depurar el lado Vue.

## SEO / GEO

`index.html` lleva meta estática completa (title, description, canonical, Open Graph, Twitter) sobre el dominio real `https://voleystats.vercel.app/`, más tres bloques JSON-LD: `SoftwareApplication`, `Organization`+`WebSite`, `FAQPage`. **El array `offers` de `SoftwareApplication` se deja vacío en el fuente y lo rellena el prerender desde `src/data/plans.json`** (el script exige que el ancla `"offers": []` aparezca EXACTAMENTE una vez: `String.replace` sustituye solo la primera, así que citarla en un comentario del HTML dejaba el JSON-LD sin ofertas en silencio). `featureList` sigue siendo manual. **El `FAQPage` ya NO se escribe a mano**: `index.html` solo lleva el ancla `<!-- @faq-jsonld -->` y `scripts/prerender-head.mjs` lo genera en el build desde `home.faq` de `src/i18n/{es,en}.json` (misma fuente que el acordeón de `Home.vue`), inyectándolo en la portada (`home.faq`, 12 preguntas) y en `/pricing` (`pricing.q{n}`/`a{n}`, facturación) de cada idioma — cada página publica solo las preguntas que pinta, vía el campo `faq` de su entrada en `ROUTES`. Antes se copiaba a mano y derivó —seguía anunciando «plan Normal»/«plan Pro» tras el rename a Análisis/Análisis Live—, y encima el propio script lo borraba también de la portada, así que no se publicaba en ninguna URL. Para añadir una pregunta basta con `q{n}`/`a{n}` consecutivos en los DOS JSON y ampliar el array de índices de `Home.vue`; el script recorre hasta el primer hueco y rompe el build si una `q{n}` se queda sin su `a{n}`. `public/` incluye `robots.txt` (permite explícitamente crawlers de IA — GPTBot, ClaudeBot, PerplexityBot... — para GEO), `sitemap.xml`, `llms.txt` (resumen de producto para motores generativos), `site.webmanifest`, iconos y `og-image.png`. **Prerender del head por ruta** (`scripts/prerender-head.mjs`, encadenado en `npm run build`): tras `vite build` emite `dist/team-code.html`, `privacy.html`, `terms.html`, `delete-account.html` y `contact.html` — copias de `index.html` con su title/description/canonical/`og:*` ya escritos (leídos de `src/i18n/es.json` → `seo`, la misma fuente que `useSeo.ts`) y con el `FAQPage` solo en la portada (en el resto el ancla se sustituye por nada), que es la única página donde ese FAQ se muestra. `vercel.json` los enruta con un `rewrite` explícito por ruta (`/team-code` → `/team-code.html`, etc.) **antes** de la rewrite catch-all `/(.*)` → `/index.html`, que se evalúa en orden y es la que mantiene viva la SPA; más un `redirect` de `/x.html` → `/x` para no dejar dos URLs indexables por página. **No uses `cleanUrls: true` aquí**: se probó y desactiva el fallback de la catch-all, así que `/stats/:id`, `/team/:id` y `/overlay/:code` pasan a devolver 404 — el visor entero caído. **Al añadir una ruta estática indexable hay que tocar cinco sitios: `router.ts`, `ROUTES` del script, `public/sitemap.xml`, la lista del `<noscript>` de `index.html` y las dos `rewrites` de `vercel.json` (la castellana y la `/en`).** El script falla el build si una etiqueta del head de `index.html` deja de coincidir con sus regex — a propósito: es preferible romper el build a publicar en silencio páginas que vuelven a apuntar su canonical a la portada. Sigue sin haber SSG de `<body>`: el JSON-LD + `llms.txt` cubren crawlers no-JS/IA.

**El `<head>` por ruta lo pone `src/composables/useSeo.ts`** (`installSeo(router)` desde `main.ts`): title, description, canonical, `og:*` y `robots`, a partir de `meta.seo` de cada ruta (clave de la sección `seo` de los JSON de i18n) y `meta.noindex` (`/overlay/:code` y `/stats/:id`). Antes de esto la meta estática de `index.html` se servía en TODAS las rutas, así que cada URL declaraba `canonical="/"` y Google las descartaba como duplicados de la portada. **`useSeo.ts` solo arregla al rastreador que ejecuta JS y en su segunda pasada**: durante meses `/team-code` siguió sin indexarse porque el HTML servido —lo que se lee en la primera pasada— seguía declarando canonical a `/`. Por eso existe además el prerender del head (arriba); los dos mecanismos escriben lo mismo desde la misma fuente y deben seguir coincidiendo. Dos trampas ya pisadas: `installSeo` corre después de `mount()`, así que hay que aplicar una vez a mano en `router.isReady()` (si no, la carga en frío —la que ve el crawler— se queda con la meta estática); y **nunca metas `|` en las cadenas de `seo.*`**, que es el separador de plurales de vue-i18n y trunca el mensaje. Los valores de `seo.home` deben coincidir palabra por palabra con el `<title>`/`description` estáticos de `index.html`, que es lo único que ven los crawlers sin JS.

**Al publicar la app Android hay que actualizar tres sitios** que hoy afirman que el producto es solo para iPad (cierto a 21-08-2026, la app Android está sin publicar): `public/llms.txt` línea 5 («exclusiva para iPad (no hay versión Android)»), `public/llms.txt` línea 47 («Plataforma: solo iPad… No hay versión Android publicada») y `index.html` → `SoftwareApplication.operatingSystem` (`"iPadOS"`). Si no se tocan, los motores generativos seguirán respondiendo que la app no existe para Android.

**Grafo de enlaces para rastreadores** (`index.html` → `<noscript>`): todos los enlaces internos del sitio son `RouterLink` dentro de componentes Vue, así que el HTML servido no contenía **ni un solo `<a href>`**. Search Console reportaba `/team-code` como «Google no reconoce esta URL — no se ha detectado ninguna página de referencia», es decir jamás rastreada: sin enlaces en el HTML crudo, la única vía de descubrimiento era que Google renderizase la portada en su cola diferida, y en un dominio `*.vercel.app` sin autoridad eso puede no ocurrir nunca (los rastreadores de IA no renderizan en absoluto). Por eso el bloque `<noscript>` lleva ahora una lista de enlaces reales a las rutas estáticas. Va en `<noscript>` a propósito: no es contenido oculto para usuarios con JS, y se hereda automáticamente en los HTML prerenderizados. **Al añadir una ruta estática indexable hay que tocar los cinco sitios de la lista de arriba, esta incluida.**

**Scroll reveals** (`Home.vue` + `style.css`): progressive enhancement — contenido visible por defecto; un script inline en `index.html` añade la clase `js` a `<html>`, y solo entonces `.reveal` arranca oculto y anima con `IntersectionObserver`. Mantiene el contenido crawleable para bots sin JS. Respeta `prefers-reduced-motion`.

## Diseño

Dark-only (no hay light theme real; `ToggleTheme` no está enganchado). Tokens en `tailwind.config.js`: `ink` (fondos), `brand` (azul, primario), `volt` (lima, acento/CTA); fuentes `font-display` (Space Grotesk) y `font-sans` (Inter). Clases reutilizables en `src/style.css` bajo `@layer components` (`.btn-primary`, `.btn-ghost`, `.card`, `.eyebrow`, `.text-gradient`, `.container-x`, `.reveal`, `.pressable`, `.tabstrip`) — prefiérelas a recomponer utilidades sueltas. `src/components/Logo.vue` es la marca en SVG inline.

**Movimiento.** Toda curva sale de los tokens `--ease-out` / `--ease-in-out` / `--ease-drawer` de `:root` (con sus presupuestos documentados ahí mismo: nada de UI por encima de 300ms). Las piezas con nombre:
- `.page-*` — cambio de página, montado en `App.vue`. Lo que se anima es un `<div>` envoltorio y NO el componente de la página: la mitad de las páginas (Home, TeamCode, TeamMatches) tienen varias `<section>` hermanas como raíz, y `<Transition>` sobre un fragmento no anima nada, solo avisa por consola. La `key` es el **nombre** de la ruta, no el path, para que `/stats/A` → `/stats/B` no vuelva a montar el componente. `mode="out-in"` obliga además a que `scrollBehavior` (en `router.ts`) espere 130ms antes de subir arriba — sin eso el scroll saltaba en la página que todavía se estaba yendo; el salto de ancla dentro de la misma página se exime porque ahí no hay transición que esperar.
- `.tab-swap` — cambio de pestaña en `/stats/:id` y `/team/:id`, con un `<div :key="activeTab">` envolviendo el bloque de pestañas. Solo anima la **entrada**: dos pestañas no miden lo mismo, y un cruce de verdad exigiría posicionarlas en absoluto y congelar la altura.
- `.menu-*` — panel del menú móvil.
- `.tabstrip` + `v-edge-fade`, `.tl-*` (timeline punto a punto), `.vsl-fade-in` (relevo de skeleton), `.faq-answer` (`grid-template-rows` 0fr↔1fr, interrumpible), `.reveal` (portada, progressive enhancement).

`prefers-reduced-motion` está resuelto **caso a caso, no con un `*` global**: los pulsos de estado (indicador "en vivo", skeletons) se cambian por un fundido de una pasada en vez de congelarse, la decoración pura se apaga, y las entradas conservan el fundido pero pierden el desplazamiento. Al añadir movimiento nuevo, añade también su caso ahí.

## Deuda conocida

- No hay tests automatizados ni linter; la única verificación es `vue-tsc` vía `npm run build`.
- `GeneralStats.vue` y `TeamMatches.vue` comparten bastante estructura de pestañas/selector de set pero no un componente común — al tocar cómo se filtra/pintan las pestañas, revisa ambos.
- Sin SSG de `<body>`: el head sí va prerenderizado por ruta, pero el contenido depende de que el bot ejecute JS (mitigado con JSON-LD/`llms.txt`, ver SEO/GEO).
