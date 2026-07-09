import { createI18n } from "vue-i18n";
import es from "./es.json";
import en from "./en.json";

// El castellano es la fuente de verdad (y el idioma del SEO estático de
// index.html, que NO se traduce). El inglés se resuelve por detección de
// navegador o por elección explícita del usuario, persistida en localStorage.
const STORAGE_KEY = "vsl-locale";

export type AppLocale = "es" | "en";
export const SUPPORTED_LOCALES: AppLocale[] = ["es", "en"];

function detectLocale(): AppLocale {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === "es" || saved === "en") return saved;
    } catch {
        // localStorage puede no estar disponible (p. ej. modo privado estricto).
    }
    return (navigator.language ?? "es").toLowerCase().startsWith("es") ? "es" : "en";
}

export const i18n = createI18n({
    legacy: false,
    globalInjection: true,
    locale: detectLocale(),
    fallbackLocale: "es",
    // Algunos mensajes (bloques de PlayerStats) llevan <br>/<b> y se pintan
    // con v-html a propósito; silenciamos el aviso de desarrollo.
    warnHtmlMessage: false,
    messages: { es, en },
});

export function setLocale(locale: AppLocale) {
    i18n.global.locale.value = locale;
    try {
        localStorage.setItem(STORAGE_KEY, locale);
    } catch {
        // Sin persistencia no pasa nada: la sesión actual sí cambia de idioma.
    }
    document.documentElement.lang = locale;
}

// Refleja el idioma inicial en <html lang> (index.html trae "es" estático).
document.documentElement.lang = i18n.global.locale.value;
