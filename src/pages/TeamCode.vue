<template>
  <section class="relative min-h-[calc(100vh-4rem)] flex items-center justify-center overflow-hidden px-5 py-16">
    <div class="pointer-events-none absolute inset-0 bg-grid bg-grid [mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,#000_50%,transparent_100%)]"></div>
    <div class="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 h-80 w-80 rounded-full bg-brand-500/20 blur-[120px]"></div>

    <div class="card relative w-full max-w-md p-8 sm:p-10">
      <div class="flex justify-center mb-6">
        <span class="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500/20 to-volt-500/10 border border-white/10">
          <i class="bi bi-broadcast text-2xl text-volt-400"></i>
        </span>
      </div>

      <h1 class="text-2xl font-bold text-center">Estadísticas en vivo</h1>
      <p class="mt-2 text-sm text-slate-400 text-center">
        Introduce el código del partido para acceder al marcador y las
        estadísticas en directo. El código lo comparte quien registra el
        partido desde la app.
      </p>

      <form class="mt-8" @submit.prevent="goToStats">
        <label for="team-code" class="block text-sm font-medium text-slate-300 mb-2">
          Código del partido
        </label>
        <input
          id="team-code"
          v-model.trim="codeTeam"
          type="text"
          autocomplete="off"
          class="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/30 transition"
          placeholder="Pega aquí el código del partido"
        />

        <button
          type="submit"
          class="btn-primary w-full mt-6 text-base disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
          :disabled="!codeTeam"
        >
          Acceder
          <i class="bi bi-arrow-right"></i>
        </button>
      </form>

      <RouterLink to="/" class="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition">
        <i class="bi bi-arrow-left"></i>
        Volver al inicio
      </RouterLink>
    </div>
  </section>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import { RouterLink, useRouter } from "vue-router";

const router = useRouter();
const codeTeam = ref("");

const goToStats = () => {
  if (!codeTeam.value) return;
  router.push(`/stats/${codeTeam.value}`);
};
</script>
