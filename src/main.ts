import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";
import router from "./router.ts";
import { i18n } from "./i18n";
import "bootstrap-icons/font/bootstrap-icons.css";

// Firebase y ApexCharts NO se importan aquí: cada página lazy que los
// necesita los trae consigo (src/firebase.ts y vue3-apexcharts), así la
// Home (SEO) no paga por ellos en el bundle inicial.
createApp(App).use(router).use(i18n).mount("#app");
