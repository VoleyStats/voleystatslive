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
    path: '/stats/:id',
    name: 'parentStats',
    children: [
      {
        path: '',
        name: 'stats',
        component: () => import('./pages/StatsView.vue'),
      },
      {
        path: 'areas',
        name: 'areaStats',
        component: () => import('./pages/AreaStats.vue'),
      },
    ],
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
