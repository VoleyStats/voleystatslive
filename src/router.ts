import { createWebHistory, createRouter } from 'vue-router'
import GeneralStats from './pages/GeneralStats.vue'
import Home from "./pages/Home.vue"
const routes = [
  {
    path: '/',
    name: 'home',
    component: Home
  },
  {
    path: '/stats/:id',
    name: 'stats',
    beforeEnter(to, from){
        console.log(to, from)
        return true
    },
    component: GeneralStats
  }
]
 
const router = createRouter({
  history: createWebHistory(),
  routes,
})



export default router