import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";
import VueApexCharts from "vue3-apexcharts";
import router from "./router.ts";
import { firebaseApp } from "./firebase.ts";
import {
    VueFire,
    VueFireDatabaseOptionsAPI,
    VueFireFirestoreOptionsAPI,
} from "vuefire";
import "bootstrap-icons/font/bootstrap-icons.css";

createApp(App)
    .use(VueApexCharts)
    .use(router)
    .use(VueFire, {
        firebaseApp,
        modules: [VueFireFirestoreOptionsAPI(), VueFireDatabaseOptionsAPI()],
    })
    .mount("#app");
