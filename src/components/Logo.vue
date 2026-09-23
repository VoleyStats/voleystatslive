<template>
  <span class="inline-flex items-center gap-2.5 select-none">
    <img
      src="/logo.png"
      :width="size"
      :height="size"
      alt=""
      aria-hidden="true"
      class="shrink-0 object-contain"
      :style="{ width: `${size}px`, height: `${size}px` }"
    />
    <span
      v-if="showWordmark"
      class="font-display font-bold tracking-tight leading-none"
      :class="wordmarkClass"
    >
      <span class="text-brand-400">Clipeo</span> <span class="text-ink-950 dark:text-white">Stats</span>
    </span>
  </span>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    size?: number;
    showWordmark?: boolean;
    wordmarkClass?: string;
  }>(),
  {
    size: 28,
    showWordmark: true,
    wordmarkClass: "text-lg",
  }
);
</script>
