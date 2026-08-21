// SEO por ruta — arreglo del bug de indexación (2026-08-21).
//
// `index.html` trae un <head> completo pero ESTÁTICO: canonical, og:url,
// title y description apuntaban siempre a la portada. Como la app es SPA y
// `vercel.json` reescribe todo a `/index.html`, cada ruta servía esos mismos
// valores — es decir, `/team-code` le declaraba a Google "soy un duplicado de
// `/`". Search Console lo reportaba como "Página alternativa con etiqueta
// canónica adecuada" y se negaba a indexarla, hiciera falta cuantas veces se
// pidiera la indexación a mano.
//
// Aquí centralizamos el <head> por ruta: cada `RouteRecord` declara
// `meta.seo` (clave dentro de la sección `seo` de los JSON de i18n) y, si
// procede, `meta.noindex`. Se aplica en `afterEach` y también al cambiar de
// idioma, porque title/description son traducibles.
//
// OJO: esto arregla a Google, que sí ejecuta JavaScript. NO arregla a los
// rastreadores de IA (GPTBot, ClaudeBot, PerplexityBot...), que en general no
// lo ejecutan y solo ven el HTML servido. Para esos hace falta pre-render
// (vite-ssg) — ver README/CLAUDE.md.
import { watch } from "vue";
import type { Router } from "vue-router";
import { i18n } from "../i18n";

// Único sitio donde vive el dominio público. `TeamCode.vue` ya avisa de que
// "el dominio ha cambiado ya una vez y volverá a hacerlo": cuando cambie, se
// toca aquí (y en index.html, sitemap.xml y robots.txt), no en cada página.
export const SITE_ORIGIN: string =
    (import.meta.env.VITE_SITE_ORIGIN as string | undefined) ??
    "https://voleystats.vercel.app";

type SeoMeta = { seo?: string; noindex?: boolean };

function upsertMeta(attr: "name" | "property", key: string, value: string) {
    const selector = `meta[${attr}="${key}"]`;
    let el = document.head.querySelector<HTMLMetaElement>(selector);
    if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
    }
    el.setAttribute("content", value);
}

function upsertCanonical(href: string) {
    let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!el) {
        el = document.createElement("link");
        el.setAttribute("rel", "canonical");
        document.head.appendChild(el);
    }
    el.setAttribute("href", href);
}

function applySeo(router: Router) {
    const route = router.currentRoute.value;
    const meta = route.meta as SeoMeta;
    const t = i18n.global.t;
    const base = meta.seo ?? "home";

    // OJO al escribir estas cadenas en los JSON de i18n: NUNCA metas "|". Es
    // el separador de plurales de vue-i18n, que parte el mensaje en formas y
    // hace que t() devuelva solo la primera. El título en inglés llevaba
    // "... for iPad | Live and scouting" y se publicaba truncado en "for iPad".
    const title = t(`seo.${base}.title`);
    const description = t(`seo.${base}.description`);
    // Sin query ni hash: dos URLs que solo difieren en `?tab=` no son páginas
    // distintas y no deben competir entre sí.
    const url = SITE_ORIGIN + route.path;

    document.title = title;
    upsertMeta("name", "description", description);
    upsertCanonical(url);
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:url", url);
    upsertMeta("property", "og:locale", i18n.global.locale.value === "en" ? "en_US" : "es_ES");
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description);
    // El visor en vivo y el overlay son efímeros (un partido concreto): no
    // aportan nada a un índice y ensucian los resultados de marca. `follow`
    // para que el enlace a la portada siga contando.
    upsertMeta(
        "name",
        "robots",
        meta.noindex ? "noindex, follow" : "index, follow, max-image-preview:large",
    );
}

export function installSeo(router: Router) {
    router.afterEach(() => applySeo(router));
    watch(i18n.global.locale, () => applySeo(router));
    // `installSeo` se llama DESPUÉS de mount(), así que la navegación inicial
    // ya ha ocurrido y `afterEach` no se dispara para ella. Sin esta llamada
    // explícita, una carga en frío —justo lo que ve el rastreador— se
    // quedaría con el <head> estático de index.html y el bug seguiría vivo en
    // la única visita que importa para SEO.
    void router.isReady().then(() => applySeo(router));
}
