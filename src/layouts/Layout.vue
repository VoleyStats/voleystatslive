<template>
    <main
        class="bg-gradient-to-tr from-rose-100 to-sky-100 dark:bg-gradient-to-tr dark:from-gray-800 dark:via-gray-800 min-h-screen overflow-x-hidden"
    >
    
        <nav class="flex justify-center items-center p-4 w-full">
            <div class="flex" @click="$router.push({ name: 'home' })">
                <img src="/logo.png" alt="logo" width="20" />
                <small class="dark:text-white text-black pl-2">
                    Voley Stats Live</small
                >
            </div>
            <!-- <ToggleTheme /> -->
        </nav>
        <slot />

        <section
            class="p-4 overflow-hidden w-screen fixed bottom-0"
        >
            <div
                class="flex w-full h-12 rounded-full items-center justify-around border-slate-300 bg-clip-padding backdrop-filter backdrop-blur-md dark:bg-opacity-0 border dark:border-gray-500"
            >
                <!-- ITEMS TOOLBAR -->
                <div
                    v-for="(toolbarItem, index) in toolbarData"
                    :key="index"
                    class="flex justify-start gap-2 items-center dark:text-white text-slate-700"
                    @click="$router.push({name: toolbarItem.url})"
                >
                    <img
                        class="w-6 h-6 text-white"
                        :src="toolbarItem.icon"
                        alt=""
                    />
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
// import { useRoute } from "vue-router";
import homeIcon from "../assets/icons/home.svg";
import statsIcon from "../assets/icons/stats.svg";
import teamIcon from "../assets/icons/team.svg";
// const route = useRoute();


const toolbarData: toolbarItem[] = [
    {
        url: "stats",
        icon: homeIcon,
        name: "Home",
    },
    {
        url: "areaStats",
        icon: statsIcon,
        name: "Stats",
    },
    {
        url: "teamStats",
        icon: teamIcon,
        name: "Team",
    },
];
</script>
