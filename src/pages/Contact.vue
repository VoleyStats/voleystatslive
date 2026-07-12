<template>
  <section class="relative overflow-hidden">
    <!-- fondos decorativos (mismo lenguaje que Home/TeamCode) -->
    <div class="pointer-events-none absolute inset-0 bg-grid bg-grid [mask-image:radial-gradient(ellipse_70%_50%_at_50%_0%,#000_50%,transparent_100%)]"></div>
    <div class="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-brand-500/20 blur-[120px]"></div>
    <div class="pointer-events-none absolute top-40 right-0 h-72 w-72 rounded-full bg-volt-500/10 blur-[120px]"></div>

    <div class="container-x relative pt-16 pb-20 lg:pt-24 lg:pb-28">
      <div class="max-w-2xl mx-auto text-center">
        <span class="eyebrow">{{ t('contact.eyebrow') }}</span>
        <h1 class="mt-6 text-4xl sm:text-5xl font-bold leading-[1.05]">
          {{ t('contact.title') }}
        </h1>
        <p class="mt-6 text-lg text-slate-400 leading-relaxed">
          {{ t('contact.text') }}
        </p>

        <div class="mt-8 flex flex-col items-center gap-4">
          <a :href="mailtoHref" class="btn-primary text-base">
            <i class="bi bi-envelope-fill"></i>
            {{ t('contact.cta') }}
          </a>
          <p class="text-sm text-slate-500">
            {{ t('contact.emailIntro') }}
            <a
              :href="mailtoHref"
              class="select-all font-semibold text-brand-300 hover:text-brand-200 transition-colors"
            >{{ CONTACT_EMAIL }}</a>
          </p>
        </div>
      </div>

      <div class="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto">
        <article
          v-for="card in cards"
          :key="card.title"
          class="card p-6 text-left"
        >
          <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500/20 to-volt-500/10 border border-white/10">
            <i :class="['bi', card.icon, 'text-xl text-brand-300']"></i>
          </div>
          <h2 class="mt-5 text-lg font-semibold">{{ card.title }}</h2>
          <p class="mt-2 text-sm text-slate-400 leading-relaxed">{{ card.text }}</p>
          <RouterLink
            v-if="card.to"
            :to="card.to"
            class="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-volt-400 hover:text-volt-300 transition-colors"
          >
            {{ card.link }}
            <i class="bi bi-arrow-right"></i>
          </RouterLink>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";

const { t, locale } = useI18n();

// Sin backend: el contacto es solo por correo (mailto con asunto prellenado).
const CONTACT_EMAIL = "voleystats@gmail.com";

const mailtoHref = computed(
  () => `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(t("contact.subject"))}`
);

const cards = computed(() => [
  {
    icon: "bi-life-preserver",
    title: t("contact.cards.support.title"),
    text: t("contact.cards.support.text"),
  },
  {
    icon: "bi-lightbulb",
    title: t("contact.cards.feedback.title"),
    text: t("contact.cards.feedback.text"),
  },
  {
    icon: "bi-shield-lock",
    title: t("contact.cards.privacy.title"),
    text: t("contact.cards.privacy.text"),
    link: t("contact.cards.privacy.link"),
    to: { name: "privacy" },
  },
]);

const setTitle = () => {
  document.title = t("contact.docTitle");
};
onMounted(setTitle);
watch(locale, setTitle);
</script>
