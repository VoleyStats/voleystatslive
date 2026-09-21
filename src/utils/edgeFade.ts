import type { Directive } from "vue";

/**
 * `v-edge-fade` — enciende el degradado de los bordes de una tira con scroll
 * horizontal (`.tabstrip`, ver style.css) según haya contenido oculto o no.
 *
 * Por qué no es CSS puro: un degradado fijo a la izquierda apaga la primera
 * pestaña —casi siempre la activa— aunque no haya nada escondido detrás, y uno
 * fijo a la derecha sigue insinuando que hay más cuando ya se ha llegado al
 * final. La única forma de saberlo es medir, así que se mide: el directivo
 * escribe `data-edge="start end"` (uno, los dos o ninguno) y el CSS decide.
 */

const OBSERVERS = new WeakMap<HTMLElement, ResizeObserver>();

function update(el: HTMLElement) {
  const max = el.scrollWidth - el.clientWidth;
  // 1px de holgura: el scroll subpíxel de un trackpad deja `scrollLeft` en
  // 0.4 y el degradado parpadearía al llegar al borde.
  const start = el.scrollLeft > 1;
  const end = el.scrollLeft < max - 1;
  const next = [start ? "start" : "", end ? "end" : ""].filter(Boolean).join(" ");
  // Escribir el mismo valor invalidaría el estilo en cada evento de scroll.
  if (el.dataset.edge !== next) el.dataset.edge = next;
}

export const vEdgeFade: Directive<HTMLElement> = {
  mounted(el) {
    const onScroll = () => update(el);
    el.addEventListener("scroll", onScroll, { passive: true });
    // El ancho de la tira cambia al girar el móvil y al cambiar de idioma
    // (las etiquetas no miden lo mismo en ES y en EN).
    const ro = new ResizeObserver(() => update(el));
    ro.observe(el);
    OBSERVERS.set(el, ro);
    update(el);
    // El ancho del CONTENIDO (no el de la tira) cambia cuando terminan de
    // cargar Inter/Space Grotesk, y eso el ResizeObserver no lo ve: sin esto
    // la primera medida se hace con la fuente de sistema y una tira que si
    // desborda puede quedarse sin degradado hasta el primer scroll.
    document.fonts?.ready.then(() => update(el));
  },
  // Se añaden y se quitan pestañas (en directo solo se ven dos de las seis).
  updated(el) {
    update(el);
  },
  unmounted(el) {
    OBSERVERS.get(el)?.disconnect();
    OBSERVERS.delete(el);
  },
};
