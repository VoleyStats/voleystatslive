<template>
    <div class="w-full flex items-center gap-3 animate-pulse">
        <div v-if="avatar" class="h-10 w-10 shrink-0 rounded-full bg-white/[0.06]"></div>
        <div class="flex-1 min-w-0 space-y-2">
            <div class="h-3.5 rounded bg-white/[0.06]" :class="titleWidth"></div>
            <div class="h-3 w-1/3 rounded bg-white/[0.06]"></div>
        </div>
        <div v-if="trailing" class="flex flex-col items-end gap-1.5 shrink-0">
            <div class="h-5 w-10 rounded bg-white/[0.06]"></div>
            <div v-if="trailingLabel" class="h-2.5 w-8 rounded bg-white/[0.06]"></div>
        </div>
    </div>
</template>

<script setup lang="ts">
// Fila skeleton tipo partido/jugadora. Deliberadamente NO se envuelve en
// `.card`: el llamador decide si cada fila es su propia card (lista de
// partidos) o si varias filas comparten una card (cabecera de jugadora +
// contenido extra debajo).
withDefaults(
    defineProps<{
        avatar?: boolean;
        trailing?: boolean;
        trailingLabel?: boolean;
        titleWidth?: string;
    }>(),
    { avatar: false, trailing: true, trailingLabel: false, titleWidth: "w-2/3" }
);
</script>
