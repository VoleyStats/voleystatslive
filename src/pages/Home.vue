<template>
  <section class="flex justify-center items-center h-screen">

      <article
        class="mx-4 p-8 rounded-3xl flex flex-col justify-center items-center max-w-lg bg-clip-padding 
        backdrop-filter 
        backdrop-blur-lg 
        bg-white
        bg-opacity-5 "
      >
        <h3 class="text-slate-800 text-2xl font-bold text-center mb-6 dark:text-white">
          Accede a las estadisticas en vivo de tu equipo
        </h3>
        <div class="w-full">
          <label
            for="validation"
            class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
          ></label>
          <input
            v-model="codeTeam"
            type="text"
            id="validation"
            class="bg-transparent border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            placeholder="Escribe el código de tu equipo..."
            required
          />
        </div>
        <RouterLink :to=" codeTeam ?'/stats/'+codeTeam : ''" class="dark:text-white dark:bg-blue-800 py-1 px-10 rounded-lg text-slate-800 bg-slate-100 w-full mt-6 hover:scale-105 text-center">Acceder</RouterLink>
      </article>
    </section>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import {RouterLink} from "vue-router";

const codeTeam = ref("");

</script>
