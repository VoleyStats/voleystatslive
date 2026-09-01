<template>
  <section class="relative overflow-hidden">
    <!-- fondos decorativos (mismo lenguaje que Home/Contact) -->
    <div class="pointer-events-none absolute inset-0 bg-grid bg-grid [mask-image:radial-gradient(ellipse_70%_50%_at_50%_0%,#000_50%,transparent_100%)]"></div>
    <div class="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-brand-500/20 blur-[120px]"></div>

    <div class="container-x relative pt-16 pb-20 lg:pt-24 lg:pb-28">
      <div class="max-w-2xl mx-auto text-center">
        <span class="eyebrow">{{ t('pricing.eyebrow') }}</span>
        <h1 class="mt-6 text-4xl sm:text-5xl font-bold leading-[1.05]">{{ t('pricing.title') }}</h1>
        <p class="mt-6 text-lg text-slate-400 leading-relaxed">{{ t('pricing.subtitle') }}</p>
      </div>

      <!-- ---------------- Tarjetas de plan ---------------- -->
      <div class="mt-14 grid gap-5 lg:grid-cols-3 items-start">
        <article
          v-for="plan in planCards"
          :key="plan.id"
          class="card p-7 h-full"
          :class="plan.featured ? 'border-brand-500/40 ring-1 ring-brand-500/20' : ''"
        >
          <div class="flex items-center justify-between gap-3">
            <h2 class="text-xl font-semibold">{{ plan.name }}</h2>
            <span v-if="plan.featured" class="rounded-full bg-brand-500/15 px-3 py-1 text-xs font-semibold text-brand-300">
              {{ t('pricing.featured') }}
            </span>
          </div>
          <p class="mt-1 text-sm text-slate-500">{{ plan.tagline }}</p>

          <p class="mt-6 flex items-baseline gap-1.5">
            <span class="text-4xl font-bold font-display">{{ plan.price }}</span>
            <span v-if="plan.per" class="text-sm text-slate-400">{{ plan.per }}</span>
          </p>
          <p class="mt-1 h-5 text-sm text-slate-500">{{ plan.alt }}</p>

          <p class="mt-5 text-sm text-slate-400 leading-relaxed">{{ plan.text }}</p>
        </article>
      </div>

      <!-- ---------------- Match pass ---------------- -->
      <div class="mt-5 card p-7 sm:flex sm:items-center sm:gap-6">
        <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-volt-500/20 to-brand-500/10 border border-white/10">
          <i class="bi bi-ticket-perforated text-xl text-volt-300"></i>
        </div>
        <div class="mt-4 sm:mt-0">
          <h2 class="text-lg font-semibold">
            {{ t('pricing.matchPassName') }}
            <span class="ml-2 text-sm font-normal text-volt-300">{{ matchPassPrice }}</span>
          </h2>
          <p class="mt-1 text-sm text-slate-400 leading-relaxed">{{ t('pricing.matchPassText') }}</p>
        </div>
      </div>

      <div class="mt-8 flex flex-col items-center gap-3">
        <div class="flex flex-wrap justify-center gap-3">
          <StoreButtons />
        </div>
        <p class="text-sm text-slate-500 text-center">{{ t('pricing.ctaNote') }}</p>
      </div>

      <!-- ---------------- Tabla comparativa ---------------- -->
      <div class="mt-20 max-w-2xl">
        <h2 class="text-3xl font-bold">{{ t('pricing.tableTitle') }}</h2>
        <p class="mt-3 text-slate-400">{{ t('pricing.tableSubtitle') }}</p>
      </div>

      <!-- La tabla es lo único ancho de la página: scroll horizontal propio en
           móvil en vez de dejar que desborde el body. -->
      <div class="mt-8 card overflow-x-auto">
        <table class="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr class="border-b border-white/10">
              <th scope="col" class="px-5 py-4 font-semibold text-slate-300">{{ t('pricing.tableFeature') }}</th>
              <th
                v-for="plan in PLANS"
                :key="plan.id"
                scope="col"
                class="px-4 py-4 text-center font-semibold text-slate-300 w-32"
              >
                {{ t(`pricing.plans${capitalize(plan.id)}Name`) }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in tableRows"
              :key="row.key"
              class="border-b border-white/5 last:border-0"
            >
              <th scope="row" class="px-5 py-3.5 font-normal text-slate-200">
                {{ row.title }}
                <sup v-if="row.note" class="ml-0.5 text-volt-400">*</sup>
                <span v-if="row.matchPass" class="ml-2 rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-slate-400">
                  {{ t('pricing.tableMatchPass') }}
                </span>
              </th>
              <td
                v-for="plan in PLANS"
                :key="plan.id"
                class="px-4 py-3.5 text-center"
              >
                <i
                  v-if="planIncludes(plan.id, row.plan)"
                  class="bi bi-check-lg text-volt-400"
                  :aria-label="t('pricing.tableIncluded')"
                ></i>
                <i
                  v-else
                  class="bi bi-dash text-slate-600"
                  :aria-label="t('pricing.tableNotIncluded')"
                ></i>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="mt-4 text-sm text-slate-500 leading-relaxed max-w-3xl">
        <span class="text-volt-400">*</span> {{ t('pricing.noteScouting') }}
      </p>

      <!-- ---------------- FAQ de facturación ---------------- -->
      <div class="mt-20 grid lg:grid-cols-[1fr_1.5fr] gap-10">
        <h2 class="text-3xl font-bold">{{ t('pricing.faqTitle') }}</h2>
        <div class="space-y-5">
          <article v-for="item in billingFaqs" :key="item.question" class="card p-6">
            <h3 class="text-base font-semibold text-white">{{ item.question }}</h3>
            <p class="mt-2 text-sm text-slate-400 leading-relaxed">{{ item.answer }}</p>
          </article>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import StoreButtons from "../components/StoreButtons.vue";
import { EXTRAS, FEATURES, MATCH_PASS_PRICE, PLANS, formatPrice, planIncludes, type PlanId } from "../data/plans";

const { t, locale } = useI18n();

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const price = (value: number) => formatPrice(value, locale.value);

const matchPassPrice = computed(() => t("pricing.matchPassPrice", { price: price(MATCH_PASS_PRICE) }));

/**
 * El precio grande de cada tarjeta es el ANUAL (que es el que interesa
 * enseñar: sale más barato por mes), con el mensual debajo como alternativa.
 * El plan gratuito no tiene ninguno de los dos, de ahí los opcionales.
 */
const planCards = computed(() =>
    PLANS.map((plan) => ({
        id: plan.id,
        featured: plan.id === "analysisLive",
        name: t(`pricing.plans${capitalize(plan.id)}Name`),
        tagline: t(`pricing.plans${capitalize(plan.id)}Tagline`),
        text: t(`pricing.plans${capitalize(plan.id)}Text`),
        price: plan.year === undefined ? t("pricing.free") : price(plan.year),
        per: plan.year === undefined ? "" : t("pricing.perYear"),
        alt: plan.month === undefined ? "" : t("pricing.orMonth", { price: price(plan.month) }),
    })),
);

/**
 * Las filas reutilizan los textos de las tarjetas de la home
 * (`home.features.f{n}Title`), así que una función nueva se describe UNA vez.
 * `EXTRAS` son capacidades con gate que no tienen tarjeta y que, sin esto, la
 * tabla dejaría fuera — precisamente las que más se preguntan antes de pagar.
 */
const tableRows = computed(() => [
    ...FEATURES.map((f) => ({
        key: f.key,
        title: t(`home.features.${f.key}Title`),
        plan: f.plan as PlanId,
        matchPass: f.matchPass === true,
        note: f.note,
    })),
    ...EXTRAS.map((x) => ({
        key: x.key,
        title: t(`pricing.${x.key}Title`),
        plan: x.plan as PlanId,
        matchPass: false,
        note: undefined as string | undefined,
    })),
]);

const billingFaqs = computed(() =>
    ([1, 2, 3, 4] as const).map((n) => ({
        question: t(`pricing.q${n}`),
        answer: t(`pricing.a${n}`),
    })),
);
</script>
