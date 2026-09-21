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
            class="pressable flex h-10 w-10 md:h-9 md:w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-300 hover:text-white"
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
          <!-- "Ver en vivo" desaparece en movil: ahi era un icono suelto sin
               etiqueta compitiendo por el ancho con el otro CTA. Vive en el
               panel del menu, con su nombre completo. -->
          <RouterLink
            v-if="showWatchLive"
            :to="localeTo('/team-code')"
            class="btn-ghost hidden sm:inline-flex !px-4 !py-2.5 text-sm"
          >
            <i class="bi bi-broadcast text-volt-400"></i>
            {{ $t('layout.watchLive') }}
          </RouterLink>
          <a :href="homeAnchor('descargar')" class="btn-primary !px-4 !py-2.5 text-xs sm:text-sm">
            {{ $t('layout.downloadApp') }}
          </a>
          <!-- Hasta ahora en movil NO habia navegacion: el <nav> de arriba es
               `md:flex` y ademas solo en la portada, asi que las secciones,
               Planes y Preguntas solo se alcanzaban bajando hasta el pie. -->
          <button
            class="pressable md:hidden flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-200 hover:text-white"
            :aria-label="$t('layout.menu')"
            :aria-expanded="menuOpen"
            aria-controls="mobile-menu"
            @click="menuOpen = true"
          >
            <i class="bi bi-list text-xl"></i>
          </button>
        </div>
      </div>
    </header>

    <!-- MENU MOVIL (panel a pantalla completa) -->
    <Transition name="menu">
      <div
        v-if="menuOpen"
        id="mobile-menu"
        ref="menuEl"
        role="dialog"
        aria-modal="true"
        :aria-label="$t('layout.sections')"
        class="fixed inset-0 z-50 md:hidden bg-ink-950/95 backdrop-blur-2xl"
        @keydown.esc="menuOpen = false"
        @keydown.tab="trapTab"
      >
        <div class="menu-panel flex h-full flex-col overflow-y-auto px-5 pt-4 pb-[calc(2rem+env(safe-area-inset-bottom))]">
          <div class="flex h-12 items-center justify-between">
            <Logo :size="28" />
            <button
              ref="closeEl"
              class="pressable flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-300 hover:text-white"
              :aria-label="$t('layout.closeMenu')"
              @click="menuOpen = false"
            >
              <i class="bi bi-x-lg"></i>
            </button>
          </div>

          <nav class="mt-6 flex flex-col" :aria-label="$t('layout.sections')">
            <a
              v-for="item in menuSections"
              :key="item.hash"
              :href="homeAnchor(item.hash)"
              class="pressable flex items-center justify-between border-b border-white/5 py-4 text-lg font-display text-slate-200 hover:text-white"
              @click="menuOpen = false"
            >
              {{ item.label }}
              <i class="bi bi-chevron-right text-sm text-slate-600"></i>
            </a>
            <RouterLink
              :to="localeTo('/pricing')"
              class="pressable flex items-center justify-between border-b border-white/5 py-4 text-lg font-display text-slate-200 hover:text-white"
              @click="menuOpen = false"
            >
              {{ $t('layout.nav.pricing') }}
              <i class="bi bi-chevron-right text-sm text-slate-600"></i>
            </RouterLink>
          </nav>

          <!-- Los CTA al final y a lo ancho: es donde llega el pulgar. -->
          <div class="mt-auto flex flex-col gap-3 pt-8">
            <RouterLink
              :to="localeTo('/team-code')"
              class="btn-ghost w-full text-base"
              @click="menuOpen = false"
            >
              <i class="bi bi-broadcast text-volt-400"></i>
              {{ $t('layout.watchLive') }}
            </RouterLink>
            <a
              :href="homeAnchor('descargar')"
              class="btn-primary w-full text-base"
              @click="menuOpen = false"
            >
              <i class="bi bi-download"></i>
              {{ $t('layout.downloadApp') }}
            </a>
          </div>
        </div>
      </div>
    </Transition>

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
        <div class="container-x py-5 flex flex-col-reverse sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <span>{{ $t('layout.footer.rights', { year: currentYear }) }}</span>
          <div class="flex items-center gap-4">
            <span class="flex items-center gap-1.5">
              {{ $t('layout.footer.madeFor') }}
              <i class="bi bi-suit-heart-fill text-volt-500"></i>
            </span>
            <!-- Selector de idioma ES/EN (persistido en localStorage). Vive en
                 el pie, no en la cabecera: es una decision que se toma una vez,
                 y en movil competia por el ancho con los dos CTA. -->
            <div
              class="flex rounded-full border border-white/10 bg-white/[0.04] p-0.5 font-semibold"
              role="group"
              :aria-label="$t('layout.langSelector')"
            >
              <button
                v-for="l in SUPPORTED_LOCALES"
                :key="l"
                class="pressable rounded-full px-3 py-1.5 uppercase"
                :class="locale === l ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-white'"
                :aria-pressed="locale === l"
                @click="switchLocale(l)"
              >{{ l }}</button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { SUPPORTED_LOCALES, setLocale, type AppLocale } from "../i18n";
import { useLocalePath } from "../composables/useLocalePath";
import Logo from "../components/Logo.vue";

const route = useRoute();
const router = useRouter();
const { locale, t } = useI18n();

// `baseName`/`localeTo`/`homeAnchor` viven en el composable porque las paginas
// de contenido (Home, TeamCode) tienen exactamente el mismo problema con los
// gemelos `/en` y lo estaban resolviendo... no resolviendolo.
const { baseName, localeTo, homeAnchor } = useLocalePath();

const isHome = computed(() => baseName.value === "home");

/* ---------------------------- Menu movil ---------------------------- */
const menuOpen = ref(false);
const menuEl = ref<HTMLElement | null>(null);
const closeEl = ref<HTMLElement | null>(null);
// El que abrio el panel, para devolverle el foco al cerrarlo.
let opener: HTMLElement | null = null;

// Las mismas secciones que el <nav> de escritorio. `homeAnchor` ya convierte
// `#faq` en `/#faq` cuando no estamos en la portada, asi que el menu sirve
// tambien desde /stats o /pricing — que es justo donde en movil no habia
// ninguna navegacion.
const menuSections = computed(() => [
  { hash: "producto", label: t("layout.nav.product") },
  { hash: "como-funciona", label: t("layout.nav.how") },
  { hash: "funciones", label: t("layout.nav.features") },
  { hash: "faq", label: t("layout.nav.faq") },
]);

const FOCUSABLE = 'a[href], button:not([disabled])';

// Trampa de foco minima: con `aria-modal` los lectores de pantalla ya ignoran
// lo de detras, pero el tabulador no, y detras hay una pagina entera.
const trapTab = (e: KeyboardEvent) => {
  const nodes = menuEl.value?.querySelectorAll<HTMLElement>(FOCUSABLE);
  if (!nodes || nodes.length === 0) return;
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  const active = document.activeElement;
  if (e.shiftKey && active === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus();
  }
};

watch(menuOpen, async (open) => {
  if (open) {
    opener = document.activeElement as HTMLElement | null;
    // La pagina de detras no puede seguir scrolleando bajo el panel.
    document.body.style.overflow = "hidden";
    await nextTick();
    closeEl.value?.focus();
  } else {
    document.body.style.overflow = "";
    opener?.focus();
    opener = null;
  }
});

// Navegar cierra el panel. Cubre tambien el boton "atras" del navegador, que
// no pasa por ningun @click.
watch(() => route.fullPath, () => { menuOpen.value = false; });

// Si el componente muere con el panel abierto (no deberia, pero el estilo se
// queda en <body> y no en su plantilla), el scroll se quedaria bloqueado.
onBeforeUnmount(() => { document.body.style.overflow = ""; });

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
