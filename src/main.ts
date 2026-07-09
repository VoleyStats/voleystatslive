import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";
import router from "./router.ts";
import "bootstrap-icons/font/bootstrap-icons.css";

// Firebase y ApexCharts NO se importan aquí: cada página lazy que los
// necesita los trae consigo (src/firebase.ts y vue3-apexcharts), así la
// Home (SEO) no paga por ellos en el bundle inicial.
createApp(App).use(router).mount("#app");
