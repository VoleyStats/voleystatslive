<template>
  <main
    class="bg-gradient-to-tr from-rose-100 to-sky-100 dark:bg-gradient-to-tr dark:from-sky-950 dark:via-gray-800 h-screen overflow-x-hidden"
  >
    <nav class="flex justify-center items-center p-4 w-full">
      <div class="flex">
        <img src="/logo.png" alt="logo" width="20">
        <small class="dark:text-white text-black pl-2"> Voley Stats Live</small>
      </div>
      <!-- <ToggleTheme /> -->
    </nav>
    <slot />

    <section
      v-if="route.name == 'stats'"
      class="p-4 overflow-hidden w-screen fixed bottom-0"
    >
      <div
        class="flex w-full h-12 rounded-full items-center justify-around 
        border-slate-300
        bg-clip-padding 
        backdrop-filter 
        backdrop-blur-md 
        dark:bg-opacity-0 
        border 
        dark:border-gray-500
        "
      >
        <!-- ITEMS TOOLBAR -->
        <div
          v-for="(toolbarItem, index) in toolbarData"
          :key="index"
          class="flex justify-start gap-2 items-center dark:text-white text-slate-700"
        >
          <img class="w-6 h-6 text-white" :src="toolbarItem.icon" alt="" />
          <small class="">
            {{ toolbarItem.name }}
          </small>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
// import ToggleTheme from "../components/ToggleTheme.vue";

import type { toolbarItem } from "../interfaces/navegationTypes";
import { useRoute } from "vue-router";
const route = useRoute();

const toolbarData: toolbarItem[] = [
  {
    url: "",
    icon: "../../public/icons/home.svg",
    name: "Home",
  },
  {
    url: "",
    icon: "../../public/icons/stats.svg",
    name: "Stats",
  },
  {
    url: "",
    icon: "../../public/icons/team.svg",
    name: "Team",
  },
];
</script>
