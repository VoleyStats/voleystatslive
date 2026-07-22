<template>
    <div class="card w-full p-4 animate-pulse">
        <div v-if="title" class="mb-3 h-3.5 w-1/3 rounded bg-white/[0.06]"></div>
        <div v-if="height" class="w-full rounded-xl bg-white/[0.06]" :class="height"></div>
        <div v-else class="space-y-2.5">
            <div
                v-for="n in lines"
                :key="n"
                class="h-3 rounded bg-white/[0.06]"
                :class="n === lines ? 'w-2/3' : 'w-full'"
            ></div>
        </div>
    </div>
</template>

<script setup lang="ts">
// Bloque skeleton tipo `.card`: o bien un rectángulo sólido a una altura fija
// (prop `height`, p.ej. "h-24") o un stack de N líneas de texto (`lines`).
// `prefers-reduced-motion` ya se gestiona globalmente en style.css (anula
// `animation-duration` en todo `*`), no hace falta duplicarlo aquí.
withDefaults(
    defineProps<{
        lines?: number;
        height?: string;
        title?: boolean;
    }>(),
    { lines: 3, title: true }
);
</script>
