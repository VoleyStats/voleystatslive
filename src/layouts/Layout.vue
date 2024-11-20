<template>
    <main
        class="bg-gradient-to-tr from-rose-100 to-sky-100 dark:bg-gradient-to-tr dark:from-gray-800 dark:via-gray-800 min-h-screen overflow-x-hidden font-sans"
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
            v-if="!['home', 'code'].includes(($route.name as string) ?? '')"
        >
            <div
                class="flex w-full h-12 rounded-full items-center justify-around border-slate-300 bg-clip-padding backdrop-filter backdrop-blur-md dark:bg-opacity-0 border dark:border-gray-500"
            >
                <!-- ITEMS TOOLBAR -->
                <div
                    v-for="(toolbarItem, index) in toolbarData"
                    :key="index"
                    class="flex justify-start gap-2 items-center dark:text-white text-slate-700"
                    @click="$router.push({ name: toolbarItem.url })"
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

        <footer class="bg-white rounded-lg shadow dark:bg-gray-900">
            <div class="w-full max-w-screen-xl mx-auto p-4 md:py-8">
                <div class="sm:flex sm:items-center sm:justify-between">
                    <div
                        class="flex justify-start items-center mb-4"
                        @click="$router.push({ name: 'home' })"
                    >
                        <img src="/logo.png" alt="logo" width="40" />
                        <small class="text-white pl-2 text-xl font-bold">
                            Voley Stats Live</small
                        >
                    </div>
                    <ul
                        class="flex flex-wrap items-center mb-6 text-sm font-medium text-gray-500 sm:mb-0 dark:text-gray-400"
                    >
                        <li>
                            <a href="#" class="hover:underline me-4 md:me-6"
                                >About</a
                            >
                        </li>
                        <li>
                            <a href="#" class="hover:underline me-4 md:me-6"
                                >Privacy Policy</a
                            >
                        </li>
                        <li>
                            <a href="#" class="hover:underline me-4 md:me-6"
                                >Licensing</a
                            >
                        </li>
                        <li>
                            <a href="#" class="hover:underline">Contact</a>
                        </li>
                    </ul>
                </div>
                <hr
                    class="my-6 border-gray-200 sm:mx-auto dark:border-gray-700 lg:my-8"
                />
                <span
                    class="block text-sm text-gray-500 sm:text-center dark:text-gray-400"
                    >© {{ currentYear }}
                    <a href="https://flowbite.com/" class="hover:underline"
                        >Voley Stats Live</a
                    >. All Rights Reserved.</span
                >
            </div>
        </footer>
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
        url: "home",
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

const currentYear = new Date().getFullYear();
</script>
