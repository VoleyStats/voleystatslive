import { createWebHistory, createRouter, RouteRecordRaw } from 'vue-router'

import Home from "./pages/Home.vue"
import StatsView from './pages/StatsView.vue'
import AreaStats from './pages/AreaStats.vue'
const routes = [
  {
    path: '/',
    name: 'home',
    component: Home
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
        component: ''
      },
    ]
  }
] as RouteRecordRaw[]
 
const router = createRouter({
  history: createWebHistory(),
  routes,
})



export default router