import { createWebHistory, createRouter, RouteRecordRaw } from 'vue-router'

import Home from './pages/Home.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: Home,
  },
  {
    // Broadcast scoreboard for OBS Browser Source. `bare` skips the site chrome
    // (nav/footer/background) so the page renders transparent over video.
    path: '/overlay/:code',
    name: 'overlay',
    component: () => import('./pages/Overlay.vue'),
    meta: { bare: true }
  },
  {
    path: '/team-code',
    name: 'code',
    component: () => import('./pages/TeamCode.vue'),
  },
  {
    path: '/privacy',
    name: 'privacy',
    component: () => import('./pages/Privacy.vue'),
  },
  {
    path: '/terms',
    name: 'terms',
    component: () => import('./pages/Terms.vue'),
  },
  {
    path: '/contact',
    name: 'contact',
    component: () => import('./pages/Contact.vue'),
  },
  {
    path: '/stats/:id',
    name: 'parentStats',
    children: [
      {
        path: '',
        name: 'stats',
        component: () => import('./pages/StatsView.vue'),
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
  },
  {
    // Enlace corto que muestra la app (voleystats-live.vercel.app/<código>):
    // los códigos son IDs de Firestore (20 caracteres alfanuméricos), así el
    // patrón no captura rutas futuras.
    path: '/:code([A-Za-z0-9]{15,})',
    redirect: (to: any) => ({ name: 'stats', params: { id: to.params.code } }),
  },
] as RouteRecordRaw[]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, top: 80, behavior: 'smooth' }
    return { top: 0 }
  },
})

export default router
