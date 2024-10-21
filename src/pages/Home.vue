<template>
    <section class="rounded-lg p-6 mt-6">
        <div class="text-cente w-full flex justify-center">
            <h4
                class="text-xs font-thin border-slate-600 border w-fit text-center py-1 px-4 text-slate-300 rounded-full"
            >
                Conecta con tu equipo
                <i class="bi bi-arrow-right-short text-sm"></i>
            </h4>
        </div>
        <h1 class="text-center text-4xl leading-tight text-pretty">
            Alcanza el mejor potencial de tu equipo
        </h1>
        <p
            class="text-center text-slate-300 text-sm font-thin leading-normal tracking-normal mt-4 mb-7"
        >
            Registra tus estadisticas, descarga informes y mejora partido a
            partido
        </p>
        <div class="flex justify-center items-center">
            <RouterLink
                :to="'/team-code'"
                class="text-sm font-thin border-slate-600 border bg-slate-700 w-fit text-center py-1 px-4 rounded-full"
                >Ver la app
            </RouterLink>
            <RouterLink
                :to="'/teamCode'"
                class="text-sm font-thin w-fit text-center py-1 px-4 rounded-full"
                >Conocer más
            </RouterLink>
        </div>
    </section>
</template>

<script lang="ts" setup>
import { RouterLink } from "vue-router";
</script>
