/**
 * Tipado y helpers sobre `plans.json`, la matriz planes × funciones.
 *
 * El JSON está aparte (y no es un `.ts` con el objeto dentro) porque lo lee
 * también `scripts/prerender-head.mjs`, que corre en Node tras el build y no
 * puede importar TypeScript. Un solo fichero de datos, dos consumidores.
 *
 * La autoridad de los gates es `../VoleyStatsApp/STORE.md`; aquí solo se copia
 * para poder pintarla.
 */
import data from "./plans.json";

export type PlanId = "free" | "analysis" | "analysisLive";

export interface PlanFeature {
    /** Sufijo de la clave i18n: `home.features.{key}Title` / `{key}Text`. */
    key: string;
    /** Icono de Bootstrap Icons. Solo lo usan las tarjetas de la home. */
    icon?: string;
    /** Tier MÍNIMO que la desbloquea. */
    plan: PlanId;
    /** El match pass (2,99 €) también la desbloquea, para un solo partido. */
    matchPass?: boolean;
    /** Marca una fila con matiz que no cabe en una insignia (ver `pricing.notes`). */
    note?: string;
}

export interface Plan {
    id: PlanId;
    /** Ausentes en el plan gratuito. */
    year?: number;
    month?: number;
}

export const PLANS = data.plans as Plan[];
export const FEATURES = data.features as PlanFeature[];
/** Filas de la tabla comparativa que no tienen tarjeta en la home. */
export const EXTRAS = data.extras as PlanFeature[];
export const MATCH_PASS_PRICE = data.matchPass.price;

/** Orden de los tiers: sirve para "¿este plan incluye esta función?". */
const RANK: Record<PlanId, number> = { free: 0, analysis: 1, analysisLive: 2 };

export const planIncludes = (plan: PlanId, minimum: PlanId): boolean => RANK[plan] >= RANK[minimum];

/**
 * Precio con el símbolo y los separadores del idioma: en español el euro va
 * detrás y decimal con coma (19,99 €), en inglés delante (€19.99). Escribirlo
 * a mano en los JSON de i18n era pedir que un cambio de precio se olvidara la
 * mitad de los sitios.
 */
export const formatPrice = (value: number, locale: string): string =>
    new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-IE", {
        style: "currency",
        currency: data.currency,
    }).format(value);
