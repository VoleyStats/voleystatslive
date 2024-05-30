<template>
  <main class="bg-gradient-to-tr from-rose-100 to-sky-100 dark:bg-gradient-to-tr dark:from-sky-950 dark:via-gray-800">
    <nav class="flex justify-end items-center p-4 sticky w-full">
      <ToggleTheme />
    </nav>
    <slot />
  </main>
</template>

<script setup lang="ts">
import ToggleTheme from "../components/ToggleTheme.vue";
</script>
