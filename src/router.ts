import { createWebHistory, createRouter, RouteRecordRaw } from 'vue-router'

import Home from './pages/Home.vue'
import { i18n, setLocale, type AppLocale } from './i18n'

const routes = [
  {
    path: '/',
    name: 'home',
    component: Home,
    meta: { seo: 'home' },
  },
  {
    // Broadcast scoreboard for OBS Browser Source. `bare` skips the site chrome
    // (nav/footer/background) so the page renders transparent over video.
    path: '/overlay/:code',
    name: 'overlay',
    component: () => import('./pages/Overlay.vue'),
    meta: { bare: true, noindex: true }
  },
  {
    path: '/team-code',
    name: 'code',
    component: () => import('./pages/TeamCode.vue'),
    meta: { seo: 'teamCode' },
  },
  {
    path: '/pricing',
    name: 'pricing',
    component: () => import('./pages/Pricing.vue'),
    meta: { seo: 'pricing' },
  },
  {
    path: '/privacy',
    name: 'privacy',
    component: () => import('./pages/Privacy.vue'),
    meta: { seo: 'privacy' },
  },
  {
    path: '/terms',
    name: 'terms',
    component: () => import('./pages/Terms.vue'),
    meta: { seo: 'terms' },
  },
  {
    path: '/delete-account',
    name: 'deleteAccount',
    component: () => import('./pages/DeleteAccount.vue'),
    meta: { seo: 'deleteAccount' },
  },
  {
    path: '/contact',
    name: 'contact',
    component: () => import('./pages/Contact.vue'),
    meta: { seo: 'contact' },
  },
  {
    path: '/stats/:id',
    name: 'parentStats',
    children: [
      {
        path: '',
        name: 'stats',
        component: () => import('./pages/StatsView.vue'),
        meta: { noindex: true },
      },
      // Antes página aparte ('players' → PlayerStats.vue); ahora es la
      // pestaña "Por jugadora" de GeneralStats.vue. Redirige preservando el
      // enlace antiguo, preseleccionando esa pestaña vía query.
      {
        path: 'players',
        redirect: (to: any) => ({ name: 'stats', params: to.params, query: { tab: 'players' } }),
      },
      // Ruta aún más antigua de la pestaña de recepción, absorbida también
      // por la pestaña "Por jugadora".
      {
        path: 'areas',
        redirect: (to: any) => ({ name: 'stats', params: to.params, query: { tab: 'players' } }),
      },
    ],
  },
  {
    // Página pública del equipo: lista sus partidos compartidos.
    path: '/team/:id',
    name: 'team',
    component: () => import('./pages/TeamMatches.vue'),
    meta: { seo: 'team' },
  },
  {
    // Enlace corto que muestra la app (voleystats-live.vercel.app/<código>):
    // los códigos son IDs de Firestore (20 caracteres alfanuméricos), así el
    // patrón no captura rutas futuras.
    path: '/:code([A-Za-z0-9]{15,})',
    redirect: (to: any) => ({ name: 'stats', params: { id: to.params.code } }),
  },
] as RouteRecordRaw[]

// SEO multi-idioma: hasta ahora las dos traducciones compartian URL y el
// idioma se elegia en el cliente con `navigator.language`, asi que para un
// buscador la version inglesa sencillamente no existia — media traduccion
// invisible. Cada ruta indexable gana un gemelo bajo `/en`, que ademas fija
// el idioma en `meta.locale`; el prerender emite su HTML con el `hreflang`
// reciproco y el `lang` correcto (scripts/prerender-head.mjs).
//
// El overlay queda fuera: es una fuente de video para OBS, no una pagina que
// nadie vaya a buscar en Google.
// Los hijos hay que CLONARLOS, no compartirlos: si el gemelo `/en` reutiliza
// los mismos objetos hijo (y por tanto sus mismos `name`), vue-router registra
// dos veces cada nombre y el ultimo gana, asi que `/stats/:id` en castellano se
// quedaba sin componente hijo y renderizaba una pagina en blanco (el padre no
// tiene componente propio). Solo `/en/stats/:id` funcionaba.
const cloneChildren = (children: RouteRecordRaw[] | undefined): RouteRecordRaw[] | undefined =>
  children?.map((c) => {
    const cloned = {
      ...c,
      name: c.name ? `${String(c.name)}-en` : undefined,
      children: cloneChildren(c.children),
      meta: { ...(c.meta ?? {}), locale: 'en' },
    } as any
    // Las redirecciones de compatibilidad (`players`, `areas`) apuntan por
    // nombre a `stats`; en el gemelo tienen que apuntar a `stats-en` o un
    // enlace antiguo en ingles acabaria saltando a la version castellana.
    if (typeof c.redirect === 'function') {
      const original = c.redirect as (to: any) => any
      cloned.redirect = (to: any) => {
        const target = original(to)
        return target && typeof target === 'object' && typeof target.name === 'string'
          ? { ...target, name: `${target.name}-en` }
          : target
      }
    }
    return cloned
  }) as RouteRecordRaw[] | undefined

const englishRoutes = routes
  .filter((r) => !r.meta?.bare && r.path !== '/:code([A-Za-z0-9]{15,})')
  .map((r) => ({
    ...r,
    path: r.path === '/' ? '/en' : `/en${r.path}`,
    name: r.name ? `${String(r.name)}-en` : undefined,
    children: cloneChildren((r as RouteRecordRaw).children),
    meta: { ...(r.meta ?? {}), locale: 'en' },
  })) as RouteRecordRaw[]

const allRoutes = [...routes, ...englishRoutes]

const router = createRouter({
  history: createWebHistory(),
  routes: allRoutes,
  scrollBehavior(to, from, savedPosition) {
    const position = savedPosition
      ?? (to.hash ? { el: to.hash, top: 80, behavior: 'smooth' as const } : { top: 0 })
    // Un salto de ancla dentro de la MISMA pagina (`/` -> `/#faq`) no cambia de
    // componente, asi que no hay transicion que esperar: retrasarlo solo se
    // notaria como lag.
    if (to.path === from.path) return position
    // Con `mode="out-in"` (ver App.vue) la pagina saliente sigue en pantalla
    // 120ms: sin esperar, el scroll subia a arriba del todo la pagina que
    // todavia se esta yendo.
    return new Promise((resolve) => setTimeout(() => resolve(position), 130))
  },
})

// Una ruta `/en` manda sobre lo que hubiera guardado o detectado el
// navegador: si alguien llega por un enlace en ingles, ve la pagina en ingles.
router.beforeEach((to) => {
  const locale = (to.meta?.locale as AppLocale | undefined) ?? null
  if (locale && i18n.global.locale.value !== locale) setLocale(locale)
})

export default router
