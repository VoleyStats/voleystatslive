import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import VueApexCharts from "vue3-apexcharts"
import router from './router.ts'
import {firebaseApp} from "./firebase.ts";
import { VueFire, VueFireFirestoreOptionsAPI } from "vuefire"

createApp(App).use(VueApexCharts).use(router).use(VueFire, {
    firebaseApp,
    modules: [VueFireFirestoreOptionsAPI()]
}).mount('#app')
// app.config.devtools = true
