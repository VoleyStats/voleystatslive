<script setup lang="ts">
// Escudo de equipo, con caída al identificador de siempre.
//
// El escudo es SIEMPRE redondo: las apps recortan en círculo de forma
// destructiva antes de subir, así que el PNG ya llega con las esquinas
// transparentes y aquí no hay nada que recortar (solo que no asome el halo).
//
// Contrato de uso: el CONTENIDO DEL SLOT es el fallback, y es lo que se pinta
// mientras no haya un escudo utilizable. Se resuelve así, y no con un chip
// dibujado aquí dentro, porque cada superficie identifica al equipo de una
// forma distinta (el `.chip` de color del overlay, la insignia de iniciales de
// `/team/:id`, nada en la cabecera de `/stats/:id`) y porque el día 1 la
// inmensa mayoría de equipos no tendrá escudo: con el fallback en manos del
// llamante, un partido sin logos se ve exactamente igual que antes de existir
// este componente — no hay markup nuevo que pueda desplazar un píxel.
//
// Hay tres caminos al fallback y los tres importan:
//   1. `url` ausente o `""` (lo que publican las apps cuando no hay logo).
//   2. `url` de un host inesperado (ver `safeLogoUrl`).
//   3. la imagen falla al cargar (`@error`) — el caso de la URL huérfana: un
//      equipo importado por `.vstats` apunta al objeto de quien lo exportó, y
//      si allí se borra la URL da 404. En una emisión en directo un icono roto
//      es inaceptable, así que se vuelve al identificador de color.
//
// Sin `loading="lazy"` (lo tuvo): el escudo está SIEMPRE en el viewport —barra
// del marcador, cabecera de equipo— y en OBS no se scrollea nunca, así que
// diferirlo solo podía retrasar su pintado.
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { safeLogoUrl } from "../utils/teamLogo";

defineOptions({ inheritAttrs: false });

const props = withDefaults(
    defineProps<{
        /** `logo_url` tal cual viene de Firestore (`""` cuando no hay escudo). */
        url?: string | null;
        /** Diámetro del escudo en px. El hueco es cuadrado y el escudo, redondo. */
        size?: number;
        /**
         * Halo neutro detrás de la imagen: un anillo de 2px que la separa del
         * fondo. Necesario por defecto porque el PNG llega con alfa y un escudo
         * oscuro sobre el panel oscuro del overlay (o uno claro sobre una
         * tarjeta clara) se perdería contra el fondo.
         */
        halo?: boolean;
        alt?: string;
    }>(),
    { url: "", size: 24, halo: true, alt: "" }
);

const src = computed(() => safeLogoUrl(props.url));
const failed = ref(false);
// El escudo se monta en cuanto hay URL, pero los píxeles llegan después: sin
// esto se veía primero el halo vacío y luego la imagen de golpe (y en el
// overlay, además, moviendo la columna del nombre). Se pinta cuando ha
// cargado, con un fundido corto.
const loaded = ref(false);
const imgEl = ref<HTMLImageElement | null>(null);
// Red de seguridad: si la imagen ya estaba en caché y `load` se disparó antes
// de que el listener existiera, `complete` lo delata. Un escudo que se quedase
// invisible para siempre en una emisión en directo es peor que uno sin fundido.
function syncComplete() {
    if (imgEl.value?.complete) loaded.value = true;
}
onMounted(syncComplete);
// Una URL nueva (típicamente el mismo objeto con otro `?v=`) merece otro
// intento: si no, un 404 puntual dejaría el escudo apagado para siempre.
watch(src, () => {
    failed.value = false;
    loaded.value = false;
    nextTick(syncComplete);
});
const show = computed(() => !!src.value && !failed.value);

// El anillo del halo crece con el escudo: 2px fijos se comían 4 de los 18px del
// crest del marcador de `/stats/:id`, donde el escudo ya es un acento pequeño.
const boxStyle = computed(() => ({
    width: `${props.size}px`,
    height: `${props.size}px`,
    padding: props.halo ? `${Math.max(1, Math.round(props.size * 0.06))}px` : "0",
}));
</script>

<template>
    <img
        v-if="show"
        ref="imgEl"
        class="crest"
        :class="{ halo, 'is-loaded': loaded }"
        :src="src"
        :alt="alt"
        :style="boxStyle"
        decoding="async"
        referrerpolicy="no-referrer"
        draggable="false"
        @load="loaded = true"
        @error="failed = true"
    />
    <slot v-else />
</template>

<style scoped>
.crest {
    display: block;
    /* Las apps recortan el escudo en CÍRCULO de forma destructiva: el PNG llega
       ya con las esquinas transparentes, círculo inscrito en un lienzo 512x512
       cuadrado. El hueco también es cuadrado y del mismo lado, así que `contain`
       no introduce ningún margen (con imagen y caja cuadradas, `contain` encaja
       exacto); se mantiene como red de seguridad para un objeto antiguo o no
       cuadrado, que se centraría en vez de deformarse. */
    object-fit: contain;
    /* El recorte circular ya viene en los píxeles; este radio solo redondea el
       halo/anillo de debajo, que si no asomaría por las esquinas vacías. */
    border-radius: 50%;
    /* Nunca se estira ni se encoge dentro de un flex/grid: el hueco es fijo. */
    flex: none;
    /* El hueco ya reserva su sitio en el layout desde el primer fotograma
       (tamaño fijo en el estilo inline); lo que se funde al cargar es solo lo
       que se PINTA — imagen y halo. */
    opacity: 0;
    transition: opacity 0.2s var(--ease-out);
}
.crest.is-loaded {
    opacity: 1;
}
.crest.halo {
    /* El padding (proporcional al tamaño, en el estilo inline) deja ver el fondo
       como un anillo alrededor del escudo. */
    box-sizing: border-box;
    background: rgba(255, 255, 255, 0.1);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18), 0 1px 3px rgba(0, 0, 0, 0.45);
}
</style>
