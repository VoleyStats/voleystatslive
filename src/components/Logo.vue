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
      class="font-display font-bold tracking-tight text-white leading-none"
      :class="wordmarkClass"
    >
      Voley<span class="text-brand-400">Stats</span>
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
