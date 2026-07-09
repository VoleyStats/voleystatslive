<template>
  <section class="min-h-[70vh] w-full flex flex-col justify-center items-center text-center px-6">
    <div class="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/[0.04] border border-white/10 mb-6">
      <i class="bi bi-bar-chart-line text-3xl text-slate-500"></i>
    </div>
    <h2 class="text-xl font-semibold text-white">{{ titleText }}</h2>
    <p class="mt-2 text-sm text-slate-400 max-w-xs">{{ messageText }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
  title?: string;
  message?: string;
}>();

// Los textos por defecto viven en i18n: si el padre no pasa props,
// el fallback reacciona igualmente al cambio de idioma.
const { t } = useI18n();
const titleText = computed(() => props.title ?? t("empty.title"));
const messageText = computed(() => props.message ?? t("empty.message"));
</script>
