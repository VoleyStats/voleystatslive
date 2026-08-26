import type { ApexOptions } from "apexcharts";

type ChartAnimations = NonNullable<NonNullable<ApexOptions["chart"]>["animations"]>;

/**
 * Animación de las gráficas (ApexCharts v5).
 *
 * Sin declarar nada, v5 aplica `{enabled:true, speed:800,
 * animateGradually:{enabled:true, delay:150}, dynamicAnimation:{enabled:true,
 * speed:350}}`. 800ms está muy por encima del techo de 300ms de los tokens de
 * movimiento (ver `style.css`), y `animateGradually` escalona además elemento
 * por elemento — con una barra por punto del partido eso son 150-200 barras.
 *
 * El detalle que decide cuál de las dos constantes toca: `chartOptions` es un
 * `computed` que devuelve un objeto NUEVO en cada recálculo, así que el
 * watcher de `vue3-apexcharts` acaba en `updateOptions(...)` con las series
 * dentro. Eso NO es el camino barato de `updateSeries`: es un re-render
 * completo que usa la animación de montaje, la de 800ms — `dynamicAnimation`
 * ni se mira. Por eso a una gráfica que se repinta con datos en vivo no le
 * basta con apagar `dynamicAnimation`: hay que apagar el interruptor maestro.
 */

/**
 * Gráficas que se repintan con datos en vivo (`onSnapshot`): una vez por punto
 * del partido, decenas o centenares de veces por partido. "Frecuente" en el
 * playbook significa sin animación, y punto.
 */
export const CHART_ANIMATIONS_OFF: ChartAnimations = { enabled: false };

/**
 * Gráficas de informe (partido terminado): se pintan una vez, al abrir su
 * pestaña, y ya no cambian. Conservan la entrada, pero dentro de presupuesto y
 * sin escalonado ni animación de actualización.
 */
export const CHART_ANIMATIONS_ENTRY: ChartAnimations = {
    enabled: true,
    speed: 280,
    animateGradually: { enabled: false },
    dynamicAnimation: { enabled: false },
};
