<script setup lang="ts">
/**
 * Botones de descarga de la app. Existe para que los enlaces de tienda vivan
 * en UN sitio: estaban escritos a mano en Home y en TeamCode, así que publicar
 * en una tienda nueva obligaba a buscarlos por el proyecto.
 *
 * El botón de Google Play sale solo cuando `VITE_PLAY_URL` tiene valor. Así el
 * día que la app esté publicada en Play, activarlo es rellenar esa variable en
 * Vercel y redesplegar — sin tocar código ni arriesgar un enlace roto mientras
 * la ficha aún no existe.
 */
withDefaults(
    defineProps<{
        /** `primary` para el CTA principal, `ghost` para el secundario. */
        variant?: "primary" | "ghost";
        size?: "base" | "sm";
    }>(),
    { variant: "primary", size: "base" },
);

const APP_STORE_URL = "https://apps.apple.com/us/app/voley-stats/id6737778450";
const PLAY_URL = import.meta.env.VITE_PLAY_URL ?? "";
</script>

<template>
    <a
        :href="APP_STORE_URL"
        target="_blank"
        rel="noopener"
        :class="[variant === 'primary' ? 'btn-primary' : 'btn-ghost', size === 'sm' ? 'text-sm' : 'text-base']"
    >
        <i class="bi bi-apple text-lg"></i>
        {{ $t("common.appStore") }}
    </a>
    <a
        v-if="PLAY_URL"
        :href="PLAY_URL"
        target="_blank"
        rel="noopener"
        :class="[variant === 'primary' ? 'btn-primary' : 'btn-ghost', size === 'sm' ? 'text-sm' : 'text-base']"
    >
        <i class="bi bi-google-play text-lg"></i>
        {{ $t("common.googlePlay") }}
    </a>
</template>
