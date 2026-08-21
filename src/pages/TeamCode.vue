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

      <h1 class="text-2xl font-bold text-center">{{ $t('teamCode.title') }}</h1>
      <p class="mt-2 text-sm text-slate-400 text-center">
        {{ $t('teamCode.subtitle') }}
      </p>

      <form class="mt-8" @submit.prevent="goToStats">
        <label for="team-code" class="block text-sm font-medium text-slate-300 mb-2">
          {{ $t('teamCode.label') }}
        </label>
        <input
          id="team-code"
          v-model.trim="codeTeam"
          type="text"
          autocomplete="off"
          class="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/30 transition"
          :placeholder="$t('teamCode.placeholder')"
        />

        <button
          type="submit"
          class="btn-primary w-full mt-6 text-base disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
          :disabled="!codeTeam"
        >
          {{ $t('teamCode.submit') }}
          <i class="bi bi-arrow-right"></i>
        </button>
      </form>

      <RouterLink to="/" class="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition">
        <i class="bi bi-arrow-left"></i>
        {{ $t('teamCode.back') }}
      </RouterLink>
    </div>
  </section>

  <!-- Contenido indexable. Antes esta ruta era solo el formulario de arriba:
       aunque se arregle el canonical (ver src/composables/useSeo.ts), Google no
       indexa una página sin contenido, así que /team-code seguiría fuera del
       índice. Esto además responde la consulta real que trae aquí a la gente
       ("cómo ver las estadísticas de mi equipo online"). -->
  <section class="px-5 pb-20">
    <div class="mx-auto max-w-3xl">
      <h2 class="text-xl font-bold">{{ $t('teamCode.explain.title') }}</h2>
      <p class="mt-3 text-sm leading-relaxed text-slate-400">
        {{ $t('teamCode.explain.intro') }}
      </p>

      <ol class="mt-8 grid gap-4 sm:grid-cols-3">
        <li
          v-for="(step, i) in ($tm('teamCode.explain.steps') as any[])"
          :key="i"
          class="card p-5"
        >
          <span
            class="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500/15 text-xs font-bold text-brand-300"
          >{{ i + 1 }}</span>
          <h3 class="mt-3 text-sm font-semibold">{{ $rt(step.title) }}</h3>
          <p class="mt-1.5 text-sm leading-relaxed text-slate-400">{{ $rt(step.text) }}</p>
        </li>
      </ol>

      <div class="card mt-6 p-5">
        <h3 class="text-sm font-semibold">{{ $t('teamCode.explain.freeTitle') }}</h3>
        <p class="mt-1.5 text-sm leading-relaxed text-slate-400">
          {{ $t('teamCode.explain.freeText') }}
        </p>
        <a
          href="https://apps.apple.com/us/app/voley-stats/id6737778450"
          class="mt-4 inline-flex items-center gap-1.5 text-sm text-brand-300 hover:text-brand-200 transition"
        >
          {{ $t('teamCode.explain.appCta') }}
          <i class="bi bi-arrow-right"></i>
        </a>
      </div>
    </div>
  </section>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import { RouterLink, useRouter } from "vue-router";

const router = useRouter();
const codeTeam = ref("");

const goToStats = () => {
  let value = codeTeam.value.trim();
  if (!value) return;
  // Acepta el código suelto o la URL completa pegada desde la app
  // (cualquier host: el dominio ha cambiado ya una vez y volverá a hacerlo).
  const fromUrl = value.match(/^https?:\/\/[^/]+\/(?:stats\/|team\/|overlay\/)?([A-Za-z0-9-]+)/);
  if (fromUrl) value = fromUrl[1];
  // Los enlaces de equipo llevan un UUID (36 caracteres con guiones); los de
  // partido son IDs de Firestore (20 alfanuméricos).
  const isTeam = /^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$/.test(value);
  router.push(isTeam ? `/team/${value}` : `/stats/${value}`);
};
</script>
