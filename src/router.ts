import { createWebHistory, createRouter } from 'vue-router'
// import GeneralStats from './pages/GeneralStats.vue'
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
    component: StatsView
  }
]
 
const router = createRouter({
  history: createWebHistory(),
  routes,
})



export default router