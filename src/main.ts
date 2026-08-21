import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";
import router from "./router.ts";
import { i18n } from "./i18n";
import "bootstrap-icons/font/bootstrap-icons.css";

import { installSeo } from "./composables/useSeo";

// Firebase y ApexCharts NO se importan aquí: cada página lazy que los
// necesita los trae consigo (src/firebase.ts y vue3-apexcharts), así la
// Home (SEO) no paga por ellos en el bundle inicial.
createApp(App).use(router).use(i18n).mount("#app");

// title/description/canonical/og por ruta. Sin esto, cada URL servía el
// <head> estático de index.html —canonical a "/"— y Google las descartaba
// como duplicados de la portada. Ver src/composables/useSeo.ts.
installSeo(router);
