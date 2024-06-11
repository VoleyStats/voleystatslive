import { createWebHistory, createRouter } from 'vue-router'

import Home from "./pages/Home.vue"
import StatsView from './pages/StatsView.vue'
const routes = [
  {
    path: '/',
    name: 'home',
    component: Home
  },
  {
    path: '/stats/:id',
    name: 'stats',
    component: StatsView,
    children: [
      {
        path: 'tables',
        name: 'tableStats',
        component: ''
      },
      {
        path: 'team',
        name: 'teamStats',
        component: ''
      },
    ]
  }
]
 
const router = createRouter({
  history: createWebHistory(),
  routes,
})



export default router