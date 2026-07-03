<template>
  <section class="min-h-[70vh] w-full flex flex-col justify-center items-center text-center px-6">
    <div class="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/[0.04] border border-white/10 mb-6">
      <i class="bi bi-bar-chart-line text-3xl text-slate-500"></i>
    </div>
    <h2 class="text-xl font-semibold text-white">{{ title }}</h2>
    <p class="mt-2 text-sm text-slate-400 max-w-xs">{{ message }}</p>
  </section>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string;
    message?: string;
  }>(),
  {
    title: "No hay datos todavía",
    message: "Cuando empiece el partido, aquí aparecerán las estadísticas en tiempo real.",
  }
);
</script>
