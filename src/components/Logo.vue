<template>
  <span class="inline-flex items-center gap-2.5 select-none">
    <svg
      :width="size"
      :height="size"
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      class="shrink-0"
    >
      <defs>
        <linearGradient :id="gradId" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#3D6BFF" />
          <stop offset="1" stop-color="#2140B4" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" :fill="`url(#${gradId})`" />
      <rect x="15" y="34" width="7" height="14" rx="3.5" fill="#fff" />
      <rect x="28.5" y="26" width="7" height="22" rx="3.5" fill="#fff" />
      <rect x="42" y="18" width="7" height="30" rx="3.5" fill="#CBFB45" />
      <circle cx="45.5" cy="15" r="5" fill="#CBFB45" />
    </svg>
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
    gradId?: string;
  }>(),
  {
    size: 28,
    showWordmark: true,
    wordmarkClass: "text-lg",
    gradId: "logo-grad",
  }
);
</script>
