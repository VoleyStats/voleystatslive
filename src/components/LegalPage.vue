<template>
  <section class="relative overflow-hidden">
    <!-- fondos decorativos (mismo lenguaje que Home/TeamCode) -->
    <div class="pointer-events-none absolute inset-0 bg-grid bg-grid [mask-image:radial-gradient(ellipse_70%_40%_at_50%_0%,#000_50%,transparent_100%)]"></div>
    <div class="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-brand-500/15 blur-[120px]"></div>

    <div class="container-x relative pt-16 pb-20 lg:pt-20 lg:pb-28">
      <div class="max-w-3xl">
        <span class="eyebrow">{{ t('legal.eyebrow') }}</span>
        <h1 class="mt-6 text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.1]">
          {{ t(`${baseKey}.title`) }}
        </h1>
        <p class="mt-4 text-sm text-slate-500">{{ t(`${baseKey}.lastUpdated`) }}</p>

        <div class="mt-12 space-y-10">
          <section v-for="(s, i) in sections" :key="i">
            <h2 v-if="s.heading" class="text-xl sm:text-2xl font-semibold text-white">
              {{ s.heading }}
            </h2>
            <p
              v-for="(p, j) in s.paragraphs"
              :key="`p-${j}`"
              class="mt-4 text-slate-400 leading-relaxed"
            >{{ p }}</p>
            <ul
              v-if="s.list.length"
              class="mt-4 list-disc pl-5 space-y-2 marker:text-brand-400"
            >
              <li
                v-for="(item, j) in s.list"
                :key="`l-${j}`"
                class="text-slate-400 leading-relaxed"
              >{{ item }}</li>
            </ul>
          </section>
        </div>

        <p
          v-if="note"
          class="mt-14 border-t border-white/5 pt-6 text-xs italic text-slate-500"
        >{{ note }}</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from "vue";
import { useI18n } from "vue-i18n";

/**
 * Layout reutilizable de página legal: título + "última actualización" +
 * secciones (encabezado, párrafos y/o lista) leídas de i18n con tm().
 * `baseKey` apunta al bloque raíz de mensajes (p. ej. "privacy" o "terms").
 */
const props = defineProps<{ baseKey: "privacy" | "terms" }>();

const { t, tm, rt, te, locale } = useI18n();

interface LegalSection {
  heading?: string;
  paragraphs: string[];
  list: string[];
}

// tm() devuelve los mensajes sin resolver; rt() los renderiza a texto plano
// (necesario para literales como {'@'} en los correos electrónicos).
const sections = computed<LegalSection[]>(() =>
  (tm(`${props.baseKey}.sections`) as any[]).map((s) => ({
    heading: s.heading ? rt(s.heading) : undefined,
    paragraphs: ((s.paragraphs ?? []) as any[]).map((p) => rt(p)),
    list: ((s.list ?? []) as any[]).map((item) => rt(item)),
  }))
);

const note = computed(() =>
  te(`${props.baseKey}.note`) ? t(`${props.baseKey}.note`) : ""
);

const setTitle = () => {
  document.title = t(`${props.baseKey}.docTitle`);
};
onMounted(setTitle);
watch(locale, setTitle);
</script>
