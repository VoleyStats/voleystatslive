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
    name: 'parentStats',
    children: [
      {
        path: '',
        name: 'stats',
        component: StatsView,
      },
      {
        path: 'tables',
        name: 'tableStats',
        component: Home
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