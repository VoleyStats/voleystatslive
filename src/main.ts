import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import VueApexCharts from "vue3-apexcharts"
import router from './router.ts'

createApp(App).use(VueApexCharts).use(router).mount('#app')
// app.config.devtools = true
