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
          <RouterLink to="/" :aria-label="$t('layout.homeLink')">
            <Logo :size="28" />
          </RouterLink>
        </div>

        <nav
          v-if="isHome"
          class="hidden md:flex items-center gap-8 text-sm text-slate-300"
          :aria-label="$t('layout.sections')"
        >
          <a href="#producto" class="hover:text-white transition-colors">{{ $t('layout.nav.product') }}</a>
          <a href="#como-funciona" class="hover:text-white transition-colors">{{ $t('layout.nav.how') }}</a>
          <a href="#funciones" class="hover:text-white transition-colors">{{ $t('layout.nav.features') }}</a>
          <a href="#faq" class="hover:text-white transition-colors">{{ $t('layout.nav.faq') }}</a>
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
              @click="setLocale(l)"
            >{{ l }}</button>
          </div>
          <RouterLink to="/team-code" class="btn-ghost !px-4 !py-2 text-xs sm:text-sm">
            <i class="bi bi-broadcast text-volt-400"></i>
            <span class="hidden sm:inline">{{ $t('layout.watchLive') }}</span>
          </RouterLink>
          <a href="#descargar" class="btn-primary !px-4 !py-2 text-xs sm:text-sm">
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
          <Logo :size="30" wordmark-class="text-xl" grad-id="footer-grad" />
          <p class="mt-4 text-sm text-slate-400 max-w-xs leading-relaxed">
            {{ $t('layout.footer.tagline') }}
          </p>
        </div>
        <div>
          <h3 class="text-xs uppercase tracking-widest text-slate-500 mb-3">{{ $t('layout.footer.product') }}</h3>
          <ul class="space-y-2 text-sm text-slate-400">
            <li><a href="/#funciones" class="hover:text-white">{{ $t('layout.footer.features') }}</a></li>
            <li><a href="/#como-funciona" class="hover:text-white">{{ $t('layout.footer.how') }}</a></li>
            <li><RouterLink to="/team-code" class="hover:text-white">{{ $t('layout.footer.liveStats') }}</RouterLink></li>
          </ul>
        </div>
        <div>
          <h3 class="text-xs uppercase tracking-widest text-slate-500 mb-3">{{ $t('layout.footer.resources') }}</h3>
          <ul class="space-y-2 text-sm text-slate-400">
            <li><a href="/#faq" class="hover:text-white">{{ $t('layout.footer.faq') }}</a></li>
            <li><a href="#descargar" class="hover:text-white">{{ $t('layout.footer.download') }}</a></li>
          </ul>
        </div>
        <div>
          <h3 class="text-xs uppercase tracking-widest text-slate-500 mb-3">{{ $t('layout.footer.legal') }}</h3>
          <ul class="space-y-2 text-sm text-slate-400">
            <li><a href="#" class="hover:text-white">{{ $t('layout.footer.privacy') }}</a></li>
            <li><a href="#" class="hover:text-white">{{ $t('layout.footer.terms') }}</a></li>
            <li><a href="#" class="hover:text-white">{{ $t('layout.footer.contact') }}</a></li>
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
import { SUPPORTED_LOCALES, setLocale } from "../i18n";
import Logo from "../components/Logo.vue";

const route = useRoute();
const router = useRouter();
const { locale } = useI18n();

const isHome = computed(() => route.name === "home");
const showBack = computed(
  () => !["home", "code"].includes((route.name as string) ?? "")
);

const goBack = () => {
  if (window.history.length > 1) router.back();
  else router.push("/team-code");
};

const currentYear = new Date().getFullYear();
</script>
