<template>
    <div class="card w-full p-4 animate-pulse">
        <div v-if="title" class="mb-3 h-3.5 w-1/3 rounded bg-white/[0.06]"></div>
        <div class="w-full rounded-xl bg-white/[0.06]" :style="{ height: heightPx }"></div>
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

// Altura EXACTA de sustitución del ApexChart real que reemplaza (200/220/240/280
// en las páginas de stats) — evita cualquier salto de layout al llegar los datos.
const props = withDefaults(
    defineProps<{
        height?: number | string;
        title?: boolean;
    }>(),
    { height: 220, title: true }
);
const heightPx = computed(() => (typeof props.height === "number" ? `${props.height}px` : props.height));
</script>
