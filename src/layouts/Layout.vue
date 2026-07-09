<template>
  <div class="min-h-screen flex flex-col bg-ink-950 text-slate-200 overflow-x-hidden">
    <!-- HEADER -->
    <header
      class="sticky top-0 z-40 border-b border-white/5 bg-ink-950/70 backdrop-blur-xl"
    >
      <div class="container-x flex items-center justify-between h-16">
        <RouterLink to="/" aria-label="Voley Stats Live - inicio">
          <Logo :size="28" />
        </RouterLink>

        <nav
          v-if="isHome"
          class="hidden md:flex items-center gap-8 text-sm text-slate-300"
          aria-label="Secciones"
        >
          <a href="#producto" class="hover:text-white transition-colors">Producto</a>
          <a href="#como-funciona" class="hover:text-white transition-colors">Cómo funciona</a>
          <a href="#funciones" class="hover:text-white transition-colors">Funciones</a>
          <a href="#faq" class="hover:text-white transition-colors">Preguntas</a>
        </nav>

        <div class="flex items-center gap-2 sm:gap-3">
          <RouterLink to="/team-code" class="btn-ghost !px-4 !py-2 text-xs sm:text-sm">
            <i class="bi bi-broadcast text-volt-400"></i>
            <span class="hidden sm:inline">Ver en vivo</span>
          </RouterLink>
          <a href="#descargar" class="btn-primary !px-4 !py-2 text-xs sm:text-sm">
            Descargar app
          </a>
        </div>
      </div>
    </header>

    <!-- MAIN -->
    <main class="flex-1">
      <slot />
    </main>

    <!-- BOTTOM TOOLBAR (solo en vistas de estadísticas) -->
    <nav
      v-if="showToolbar"
      class="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-md"
      aria-label="Navegación de la app"
    >
      <div
        class="flex items-center justify-around h-14 rounded-full border border-white/10 bg-ink-850/80 backdrop-blur-xl shadow-card"
      >
        <button
          v-for="item in toolbarData"
          :key="item.url"
          class="flex flex-col items-center gap-0.5 px-4 py-1.5 text-[11px] transition-colors"
          :class="isActive(item.url) ? 'text-volt-400' : 'text-slate-400 hover:text-white'"
          @click="go(item)"
        >
          <i :class="['bi', item.icon, 'text-lg']"></i>
          {{ item.name }}
        </button>
      </div>
    </nav>

    <!-- FOOTER -->
    <footer class="border-t border-white/5 mt-auto" :class="{ 'pb-24': showToolbar }">
      <div class="container-x py-12 grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <Logo :size="30" wordmark-class="text-xl" grad-id="footer-grad" />
          <p class="mt-4 text-sm text-slate-400 max-w-xs leading-relaxed">
            Estadísticas de voleibol en vivo. Registra cada acción, sigue el
            marcador en tiempo real y mejora partido a partido.
          </p>
        </div>
        <div>
          <h3 class="text-xs uppercase tracking-widest text-slate-500 mb-3">Producto</h3>
          <ul class="space-y-2 text-sm text-slate-400">
            <li><a href="/#funciones" class="hover:text-white">Funciones</a></li>
            <li><a href="/#como-funciona" class="hover:text-white">Cómo funciona</a></li>
            <li><RouterLink to="/team-code" class="hover:text-white">Estadísticas en vivo</RouterLink></li>
          </ul>
        </div>
        <div>
          <h3 class="text-xs uppercase tracking-widest text-slate-500 mb-3">Recursos</h3>
          <ul class="space-y-2 text-sm text-slate-400">
            <li><a href="/#faq" class="hover:text-white">Preguntas frecuentes</a></li>
            <li><a href="#descargar" class="hover:text-white">Descargar app</a></li>
          </ul>
        </div>
        <div>
          <h3 class="text-xs uppercase tracking-widest text-slate-500 mb-3">Legal</h3>
          <ul class="space-y-2 text-sm text-slate-400">
            <li><a href="#" class="hover:text-white">Privacidad</a></li>
            <li><a href="#" class="hover:text-white">Términos</a></li>
            <li><a href="#" class="hover:text-white">Contacto</a></li>
          </ul>
        </div>
      </div>
      <div class="border-t border-white/5">
        <div class="container-x py-5 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© {{ currentYear }} Voley Stats Live. Todos los derechos reservados.</span>
          <span class="flex items-center gap-1.5">
            Hecho para equipos que compiten
            <i class="bi bi-suit-heart-fill text-volt-500"></i>
          </span>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import Logo from "../components/Logo.vue";
import type { toolbarItem } from "../interfaces/navegationTypes";

const route = useRoute();
const router = useRouter();

const isHome = computed(() => route.name === "home");
const showToolbar = computed(
  () => !["home", "code"].includes((route.name as string) ?? "")
);

const toolbarData: toolbarItem[] = [
  { url: "home", icon: "bi-house", name: "Inicio" },
  { url: "areaStats", icon: "bi-bar-chart-line", name: "Stats" },
  { url: "teamStats", icon: "bi-people", name: "Equipo" },
];

const isActive = (name: string) => route.name === name;
const go = (item: toolbarItem) =>
  router.push(item.url === "home" ? { name: "home" } : { name: item.url, params: route.params });

const currentYear = new Date().getFullYear();
</script>
