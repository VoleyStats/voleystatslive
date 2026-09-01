<template>
  <div class="min-h-screen flex flex-col bg-ink-950 text-slate-200 overflow-x-hidden">
    <!-- HEADER -->
    <header
      class="sticky top-0 z-40 border-b border-white/5 bg-ink-950/70 backdrop-blur-xl"
    >
      <div class="container-x flex items-center justify-between h-16">
        <div class="flex items-center gap-3">
          <button
            v-if="showBack"
            class="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-300 hover:text-white transition-colors"
            :aria-label="$t('layout.back')"
            @click="goBack"
          >
            <i class="bi bi-arrow-left text-lg"></i>
          </button>
          <RouterLink :to="localeTo('/')" :aria-label="$t('layout.homeLink')">
            <Logo :size="28" />
          </RouterLink>
        </div>

        <nav
          v-if="isHome"
          class="hidden md:flex items-center gap-8 text-sm text-slate-300"
          :aria-label="$t('layout.sections')"
        >
          <a :href="homeAnchor('producto')" class="hover:text-white transition-colors">{{ $t('layout.nav.product') }}</a>
          <a :href="homeAnchor('como-funciona')" class="hover:text-white transition-colors">{{ $t('layout.nav.how') }}</a>
          <a :href="homeAnchor('funciones')" class="hover:text-white transition-colors">{{ $t('layout.nav.features') }}</a>
          <RouterLink :to="localeTo('/pricing')" class="hover:text-white transition-colors">{{ $t('layout.nav.pricing') }}</RouterLink>
          <a :href="homeAnchor('faq')" class="hover:text-white transition-colors">{{ $t('layout.nav.faq') }}</a>
        </nav>

        <div class="flex items-center gap-2 sm:gap-3">
          <!-- Selector de idioma ES/EN (persistido en localStorage) -->
          <div
            class="flex rounded-full border border-white/10 bg-white/[0.04] p-0.5 text-[11px] font-semibold"
            role="group"
            :aria-label="$t('layout.langSelector')"
          >
            <button
              v-for="l in SUPPORTED_LOCALES"
              :key="l"
              class="rounded-full px-2 py-1 uppercase transition-colors"
              :class="locale === l ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-white'"
              :aria-pressed="locale === l"
              @click="switchLocale(l)"
            >{{ l }}</button>
          </div>
          <RouterLink
            v-if="showWatchLive"
            :to="localeTo('/team-code')"
            class="btn-ghost !px-4 !py-2 text-xs sm:text-sm"
          >
            <i class="bi bi-broadcast text-volt-400"></i>
            <span class="hidden sm:inline">{{ $t('layout.watchLive') }}</span>
          </RouterLink>
          <a :href="homeAnchor('descargar')" class="btn-primary !px-4 !py-2 text-xs sm:text-sm">
            {{ $t('layout.downloadApp') }}
          </a>
        </div>
      </div>
    </header>

    <!-- MAIN -->
    <main class="flex-1">
      <slot />
    </main>

    <!-- FOOTER -->
    <footer class="border-t border-white/5 mt-auto">
      <div class="container-x py-12 grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <Logo :size="30" wordmark-class="text-xl" />
          <p class="mt-4 text-sm text-slate-400 max-w-xs leading-relaxed">
            {{ $t('layout.footer.tagline') }}
          </p>
        </div>
        <div>
          <h3 class="text-xs uppercase tracking-widest text-slate-500 mb-3">{{ $t('layout.footer.product') }}</h3>
          <ul class="space-y-2 text-sm text-slate-400">
            <li><a :href="homeAnchor('funciones')" class="hover:text-white">{{ $t('layout.footer.features') }}</a></li>
            <li><a :href="homeAnchor('como-funciona')" class="hover:text-white">{{ $t('layout.footer.how') }}</a></li>
            <li><RouterLink :to="localeTo('/pricing')" class="hover:text-white">{{ $t('layout.footer.pricing') }}</RouterLink></li>
            <li><RouterLink :to="localeTo('/team-code')" class="hover:text-white">{{ $t('layout.footer.liveStats') }}</RouterLink></li>
          </ul>
        </div>
        <div>
          <h3 class="text-xs uppercase tracking-widest text-slate-500 mb-3">{{ $t('layout.footer.resources') }}</h3>
          <ul class="space-y-2 text-sm text-slate-400">
            <li><a :href="homeAnchor('faq')" class="hover:text-white">{{ $t('layout.footer.faq') }}</a></li>
            <li><a :href="homeAnchor('descargar')" class="hover:text-white">{{ $t('layout.footer.download') }}</a></li>
          </ul>
        </div>
        <div>
          <h3 class="text-xs uppercase tracking-widest text-slate-500 mb-3">{{ $t('layout.footer.legal') }}</h3>
          <ul class="space-y-2 text-sm text-slate-400">
            <li><RouterLink :to="localeTo('/privacy')" class="hover:text-white">{{ $t('layout.footer.privacy') }}</RouterLink></li>
            <li><RouterLink :to="localeTo('/terms')" class="hover:text-white">{{ $t('layout.footer.terms') }}</RouterLink></li>
            <li><RouterLink :to="localeTo('/contact')" class="hover:text-white">{{ $t('layout.footer.contact') }}</RouterLink></li>
            <li><RouterLink :to="localeTo('/delete-account')" class="hover:text-white">{{ $t('layout.footer.deleteAccount') }}</RouterLink></li>
          </ul>
        </div>
      </div>
      <div class="border-t border-white/5">
        <div class="container-x py-5 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>{{ $t('layout.footer.rights', { year: currentYear }) }}</span>
          <span class="flex items-center gap-1.5">
            {{ $t('layout.footer.madeFor') }}
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
import { useI18n } from "vue-i18n";
import { SUPPORTED_LOCALES, setLocale, type AppLocale } from "../i18n";
import Logo from "../components/Logo.vue";

const route = useRoute();
const router = useRouter();
const { locale } = useI18n();

// Los gemelos en ingles se llaman `home-en`, `code-en`... (ver router.ts), asi
// que comparar contra `route.name` a pelo daba falsos negativos en TODA la
// version inglesa: la portada `/en` se pintaba con boton "Volver" y sin CTA.
const baseName = computed(() => ((route.name as string) ?? "").replace(/-en$/, ""));
const isEn = computed(() => route.meta?.locale === "en");

// Un enlace del chrome tiene que quedarse en el idioma en el que esta el
// usuario: desde `/en` el pie no puede mandar a la URL castellana, que ademas
// declara otro canonical.
const localeTo = (path: string) => (isEn.value ? (path === "/" ? "/en" : `/en${path}`) : path);

const isHome = computed(() => baseName.value === "home");

// En la portada el ancla se queda relativa (`#faq`), que es un salto nativo sin
// recargar; desde cualquier otra pagina hace falta la ruta completa, y en su
// idioma.
const homeAnchor = (hash: string) =>
  isHome.value ? `#${hash}` : `${isEn.value ? "/en" : "/"}#${hash}`;
const showBack = computed(() => !["home", "code"].includes(baseName.value));

// El CTA "Ver en vivo" solo aporta cuando el usuario aún no está dentro de un
// directo: se oculta en las vistas de estadísticas, la página del equipo, el
// overlay y el propio formulario de código.
const showWatchLive = computed(
  () => !["code", "stats", "players", "team", "overlay"].includes(baseName.value)
);

// El toggle ES/EN cambiaba el idioma pero no la URL, asi que desde `/pricing`
// se acababa leyendo ingles en una direccion que declara canonical castellano
// (y al reves). Ahora salta al gemelo: mismo contenido, la URL que le toca.
const switchLocale = (l: AppLocale) => {
  setLocale(l);
  const bare = route.path.replace(/^\/en(?=\/|$)/, "") || "/";
  router.push(l === "en" ? (bare === "/" ? "/en" : `/en${bare}`) : bare);
};

const goBack = () => {
  if (window.history.length > 1) router.back();
  else router.push(localeTo("/team-code"));
};

const currentYear = new Date().getFullYear();
</script>
