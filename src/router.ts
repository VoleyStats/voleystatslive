
import { createWebHistory, createRouter, RouteRecordRaw } from 'vue-router'


import Home from "./pages/Home.vue"
import StatsView from './pages/StatsView.vue'
import AreaStats from './pages/AreaStats.vue'
import EmptyState from './components/EmptyState.vue'
import TeamCode from './pages/TeamCode.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: Home
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
    component: TeamCode
  },
  {
    path: '/stats/:id',
    name: 'parentStats',
    children: [
      {
        path: '',
        name: 'stats',
        component: StatsView,
      },
      {
        path: 'areas',
        name: 'areaStats',
        component: AreaStats
      },
      {
        path: 'team',
        name: 'teamStats',
        component: EmptyState
      },
    ]
  }
] as RouteRecordRaw[]
 
const router = createRouter({
  history: createWebHistory(),
  routes,
})



export default router