<template>
  <!-- ================= HERO ================= -->
  <section class="relative overflow-hidden">
    <!-- fondos decorativos -->
    <div class="pointer-events-none absolute inset-0 bg-grid bg-grid [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,#000_60%,transparent_100%)]"></div>
    <div class="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[520px] w-[520px] rounded-full bg-brand-500/20 blur-[120px]"></div>
    <div class="pointer-events-none absolute top-20 right-0 h-[320px] w-[320px] rounded-full bg-volt-500/10 blur-[120px]"></div>

    <div class="container-x relative pt-16 pb-20 lg:pt-24 grid lg:grid-cols-2 gap-12 items-center">
      <div>
        <span class="eyebrow">
          <span class="relative flex h-2 w-2">
            <span class="absolute inline-flex h-full w-full rounded-full bg-volt-400 animate-pulse-ring"></span>
            <span class="relative inline-flex h-2 w-2 rounded-full bg-volt-400"></span>
          </span>
          Voleibol · Analítica en tiempo real
        </span>

        <h1 class="mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05]">
          Las estadísticas de tu equipo,
          <span class="text-gradient">en directo</span>.
        </h1>

        <p class="mt-6 text-lg text-slate-400 max-w-xl leading-relaxed">
          Registra cada acción del partido, sigue el marcador y la eficiencia
          en tiempo real, y descarga informes por set y por jugador.
          Adiós a las planillas de papel.
        </p>

        <div class="mt-8 flex flex-wrap items-center gap-3">
          <a href="#descargar" class="btn-primary text-base">
            <i class="bi bi-download"></i>
            Descargar app
          </a>
          <RouterLink to="/team-code" class="btn-ghost text-base">
            <i class="bi bi-broadcast text-volt-400"></i>
            Ver estadísticas en vivo
          </RouterLink>
        </div>

        <dl class="mt-12 grid grid-cols-3 gap-6 max-w-md">
          <div v-for="s in heroStats" :key="s.label">
            <dt class="text-2xl font-display font-bold text-white">{{ s.value }}</dt>
            <dd class="text-xs text-slate-400 mt-1">{{ s.label }}</dd>
          </div>
        </dl>
      </div>

      <!-- MOCKUP PRODUCTO -->
      <div class="relative reveal">
        <div class="absolute inset-0 -z-10 bg-gradient-to-tr from-brand-500/20 to-volt-500/10 blur-2xl rounded-[2rem]"></div>
        <div class="card p-5 sm:p-6 animate-float">
          <div class="flex items-center justify-between mb-4">
            <span class="inline-flex items-center gap-2 text-xs font-semibold text-volt-400">
              <span class="h-2 w-2 rounded-full bg-volt-400 animate-pulse"></span>
              EN VIVO · Set 3
            </span>
            <span class="text-xs text-slate-500">CD Vóley · vs Rival</span>
          </div>

          <!-- marcador -->
          <div class="grid grid-cols-2 gap-3 mb-5">
            <div class="rounded-2xl bg-brand-500/10 border border-brand-500/20 p-4 text-center">
              <p class="text-4xl font-display font-bold text-brand-300">21</p>
              <p class="text-xs text-slate-400 mt-1">Tu equipo</p>
            </div>
            <div class="rounded-2xl bg-white/[0.03] border border-white/10 p-4 text-center">
              <p class="text-4xl font-display font-bold text-slate-300">18</p>
              <p class="text-xs text-slate-400 mt-1">Rival</p>
            </div>
          </div>

          <!-- mini chart -->
          <div class="rounded-2xl bg-white/[0.03] border border-white/10 p-4 mb-4">
            <p class="text-xs text-slate-400 mb-3">Eficiencia por área</p>
            <div class="flex items-end justify-between gap-2 h-24">
              <div
                v-for="(bar, i) in mockBars"
                :key="i"
                class="flex-1 rounded-t-md"
                :class="bar.color"
                :style="{ height: bar.h }"
              ></div>
            </div>
          </div>

          <!-- fila jugador -->
          <div class="space-y-2">
            <div
              v-for="p in mockPlayers"
              :key="p.name"
              class="flex items-center justify-between rounded-xl bg-white/[0.03] border border-white/10 px-3 py-2"
            >
              <span class="text-sm text-slate-200">{{ p.name }}</span>
              <span class="flex items-center gap-1.5">
                <span
                  v-for="g in p.grades"
                  :key="g.label"
                  class="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                  :class="g.class"
                >{{ g.label }}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- ================= PRODUCTO ================= -->
  <section id="producto" class="container-x py-20 lg:py-28 grid lg:grid-cols-2 gap-12 items-center">
    <div class="reveal order-2 lg:order-1">
      <div class="card p-6 grid grid-cols-2 gap-4">
        <div v-for="m in productMetrics" :key="m.label" class="rounded-2xl bg-white/[0.03] border border-white/10 p-5">
          <i :class="['bi', m.icon, 'text-2xl text-brand-400']"></i>
          <p class="mt-3 text-3xl font-display font-bold text-white">{{ m.value }}</p>
          <p class="text-sm text-slate-400">{{ m.label }}</p>
        </div>
      </div>
    </div>
    <div class="reveal order-1 lg:order-2">
      <span class="eyebrow">El producto</span>
      <h2 class="mt-5 text-3xl sm:text-4xl font-bold">Controla el partido al completo</h2>
      <p class="mt-4 text-slate-400 leading-relaxed">
        Registra las estadísticas de cada jugador acción a acción: recepción,
        saque, ataque, bloqueo, defensa y colocación. Compara el rendimiento
        entre sets, detecta las rachas y decide tus cambios con datos, no con
        intuición.
      </p>
      <ul class="mt-6 space-y-3">
        <li v-for="point in productPoints" :key="point" class="flex items-start gap-3 text-slate-300">
          <i class="bi bi-check-circle-fill text-volt-400 mt-0.5"></i>
          <span>{{ point }}</span>
        </li>
      </ul>
    </div>
  </section>

  <!-- ================= CÓMO FUNCIONA ================= -->
  <section id="como-funciona" class="relative py-20 lg:py-28 border-y border-white/5 bg-ink-900/40">
    <div class="container-x">
      <div class="max-w-2xl reveal">
        <span class="eyebrow">Cómo funciona</span>
        <h2 class="mt-5 text-3xl sm:text-4xl font-bold">De la cancha al informe en tres pasos</h2>
        <p class="mt-4 text-slate-400">Sin curva de aprendizaje. Empieza a registrar en tu primer partido.</p>
      </div>
      <div class="mt-12 grid md:grid-cols-3 gap-6">
        <article
          v-for="(step, i) in steps"
          :key="step.title"
          class="card p-6 reveal"
          :style="revealDelay(i)"
        >
          <div class="flex items-center gap-3">
            <span class="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/15 text-brand-300 font-display font-bold">
              {{ i + 1 }}
            </span>
            <i :class="['bi', step.icon, 'text-xl text-volt-400']"></i>
          </div>
          <h3 class="mt-4 text-lg font-semibold">{{ step.title }}</h3>
          <p class="mt-2 text-sm text-slate-400 leading-relaxed">{{ step.text }}</p>
        </article>
      </div>
    </div>
  </section>

  <!-- ================= FUNCIONES ================= -->
  <section id="funciones" class="container-x py-20 lg:py-28">
    <div class="max-w-2xl reveal">
      <span class="eyebrow">Funciones</span>
      <h2 class="mt-5 text-3xl sm:text-4xl font-bold">Todo lo que necesita tu cuerpo técnico</h2>
      <p class="mt-4 text-slate-400">Herramientas pensadas para entrenadores, analistas y jugadores.</p>
    </div>
    <div class="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
      <article
        v-for="(feature, i) in appFeatures"
        :key="feature.title"
        class="card p-6 hover:border-brand-500/40 hover:-translate-y-1 transition-all duration-300 reveal"
        :style="revealDelay(i)"
      >
        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500/20 to-volt-500/10 border border-white/10">
          <i :class="['bi', feature.icon, 'text-xl text-brand-300']"></i>
        </div>
        <h3 class="mt-5 text-lg font-semibold">{{ feature.title }}</h3>
        <p class="mt-2 text-sm text-slate-400 leading-relaxed">{{ feature.description }}</p>
      </article>
    </div>
  </section>

  <!-- ================= DESCARGAR ================= -->
  <section id="descargar" class="container-x pb-20 lg:pb-28">
    <div class="card relative overflow-hidden p-10 lg:p-16 text-center reveal">
      <div class="pointer-events-none absolute inset-0 bg-grid bg-grid opacity-40 [mask-image:radial-gradient(ellipse_60%_100%_at_50%_50%,#000,transparent)]"></div>
      <div class="pointer-events-none absolute -bottom-24 left-1/2 -translate-x-1/2 h-64 w-[420px] rounded-full bg-brand-500/25 blur-[100px]"></div>
      <div class="relative">
        <h2 class="text-3xl sm:text-4xl lg:text-5xl font-bold">Lleva a tu equipo al siguiente nivel</h2>
        <p class="mt-4 text-slate-400 max-w-xl mx-auto">
          Descarga Voley Stats Live y empieza a registrar estadísticas en tu
          próximo partido. Gratis para empezar.
        </p>
        <div class="mt-8 flex flex-wrap justify-center gap-3">
          <a href="#" class="btn-primary text-base">
            <i class="bi bi-apple text-lg"></i>
            App Store
          </a>
          <RouterLink to="/team-code" class="btn-ghost text-base">
            Consultar en la web
          </RouterLink>
        </div>
      </div>
    </div>
  </section>

  <!-- ================= FAQ ================= -->
  <section id="faq" class="container-x pb-24 lg:pb-32">
    <div class="grid lg:grid-cols-[1fr_1.5fr] gap-10">
      <div class="reveal">
        <span class="eyebrow">Preguntas frecuentes</span>
        <h2 class="mt-5 text-3xl sm:text-4xl font-bold">¿Tienes dudas?</h2>
        <p class="mt-4 text-slate-400">
          Y si no encuentras tu respuesta, escríbenos y te ayudamos.
        </p>
      </div>
      <div class="space-y-3">
        <article
          v-for="(q, index) in faqs"
          :key="index"
          class="card overflow-hidden reveal"
        >
          <button
            class="w-full flex items-center justify-between gap-4 text-left px-5 py-4"
            :aria-expanded="qSelection.includes(index)"
            @click="toggleQuestion(index)"
          >
            <h3 class="text-base font-semibold text-white">{{ q.question }}</h3>
            <i
              class="bi text-brand-300 transition-transform duration-200 shrink-0"
              :class="qSelection.includes(index) ? 'bi-dash-lg' : 'bi-plus-lg'"
            ></i>
          </button>
          <p
            v-show="qSelection.includes(index)"
            class="px-5 pb-5 -mt-1 text-sm text-slate-400 leading-relaxed"
          >
            {{ q.answer }}
          </p>
        </article>
      </div>
    </div>
  </section>
</template>

<script lang="ts" setup>
import { onMounted, onBeforeUnmount, ref } from "vue";
import { RouterLink } from "vue-router";

/* -------- Reveal on scroll (progressive enhancement, SEO-safe) -------- */
let observer: IntersectionObserver | null = null;
onMounted(() => {
  const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer?.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  els.forEach((el) => observer?.observe(el));
});
onBeforeUnmount(() => observer?.disconnect());

const revealDelay = (i: number) => ({ transitionDelay: `${i * 80}ms` });

/* -------- Contenido -------- */
const heroStats = [
  { value: "6", label: "áreas de juego" },
  { value: "Por set", label: "análisis detallado" },
  { value: "PDF", label: "informes descargables" },
];

const mockBars = [
  { h: "40%", color: "bg-brand-500/60" },
  { h: "70%", color: "bg-brand-500/80" },
  { h: "55%", color: "bg-brand-400" },
  { h: "90%", color: "bg-volt-400" },
  { h: "60%", color: "bg-brand-500/70" },
  { h: "35%", color: "bg-brand-500/50" },
];

const mockPlayers = [
  {
    name: "Laura M.",
    grades: [
      { label: "++", class: "bg-volt-500/20 text-volt-300" },
      { label: "+", class: "bg-brand-500/20 text-brand-300" },
    ],
  },
  {
    name: "Nadia R.",
    grades: [
      { label: "++", class: "bg-volt-500/20 text-volt-300" },
      { label: "-", class: "bg-white/10 text-slate-300" },
    ],
  },
];

const productMetrics = [
  { icon: "bi-people-fill", value: "12", label: "jugadoras seguidas" },
  { icon: "bi-graph-up-arrow", value: "94%", label: "eficiencia en K2" },
  { icon: "bi-clipboard-data", value: "5", label: "sets analizados" },
  { icon: "bi-lightning-charge-fill", value: "Live", label: "actualización" },
];

const productPoints = [
  "Marcador y eficiencia actualizados acción a acción.",
  "Detección automática de rachas de aciertos y errores.",
  "Desglose por jugador y por área del campo.",
  "Filtra las estadísticas set a set.",
];

const steps = [
  {
    icon: "bi-pencil-square",
    title: "Registra las acciones",
    text: "Anota cada jugada desde la app durante el partido: saque, recepción, ataque, bloqueo, defensa y colocación.",
  },
  {
    icon: "bi-broadcast",
    title: "Sigue el directo",
    text: "Comparte el código del partido y cualquiera puede ver el marcador y las estadísticas en tiempo real desde la web.",
  },
  {
    icon: "bi-filetype-pdf",
    title: "Descarga el informe",
    text: "Al terminar, genera un PDF con el resumen del partido por set y por jugador para revisarlo con el equipo.",
  },
];

const appFeatures = [
  {
    title: "Marcador en vivo",
    description: "Sigue el resultado set a set y la evolución del partido en tiempo real desde cualquier dispositivo.",
    icon: "bi-trophy",
  },
  {
    title: "Estadísticas por jugador",
    description: "Evalúa el rendimiento individual en cada área y encuentra los puntos fuertes de tu plantilla.",
    icon: "bi-person-badge",
  },
  {
    title: "Análisis por áreas",
    description: "Recepción, saque, ataque, bloqueo, defensa y colocación: mide la eficiencia en cada fase del juego.",
    icon: "bi-bar-chart-line",
  },
  {
    title: "Curva de registro",
    description: "Visualiza las rachas de puntos y errores para entender los momentos clave de cada set.",
    icon: "bi-activity",
  },
  {
    title: "Informes en PDF",
    description: "Descarga informes de partido y de temporada para compartir con tu cuerpo técnico y jugadores.",
    icon: "bi-filetype-pdf",
  },
  {
    title: "Acceso por código",
    description: "Comparte un simple código y todo el equipo consulta las estadísticas online, sin registros complejos.",
    icon: "bi-key",
  },
];

const faqs = [
  {
    question: "¿Qué es Voley Stats Live?",
    answer: "Es una aplicación para registrar y consultar estadísticas de voleibol en tiempo real. Anotas cada acción del partido desde la app y cualquiera puede seguir el marcador y las estadísticas en vivo desde la web usando el código del equipo.",
  },
  {
    question: "¿Cómo consulto las estadísticas de mi equipo online?",
    answer: "Entra en la sección 'Ver en vivo', introduce el código de tu equipo y accede al marcador y a las estadísticas del partido en directo, con desglose por set y por jugador.",
  },
  {
    question: "¿Qué estadísticas puedo registrar?",
    answer: "Puedes registrar acciones en las seis áreas del juego: recepción, saque, ataque, bloqueo, defensa y colocación, además del marcador, las rachas y la eficiencia de cada jugador.",
  },
  {
    question: "¿Puedo descargar un informe del partido?",
    answer: "Sí. Al finalizar el partido puedes generar un PDF con el resumen por set y por jugador para analizarlo y compartirlo con el equipo.",
  },
  {
    question: "¿Necesito conexión a internet?",
    answer: "Sí, las estadísticas se sincronizan en tiempo real, por lo que necesitas conexión para registrar acciones y para que los demás vean el directo.",
  },
  {
    question: "¿Cuánto cuesta?",
    answer: "Puedes empezar a usar Voley Stats Live de forma gratuita. Descarga la app e introduce el código de tu equipo para comenzar a registrar y consultar estadísticas.",
  },
];

const qSelection = ref<number[]>([0]);
const toggleQuestion = (index: number) => {
  if (qSelection.value.includes(index)) {
    qSelection.value = qSelection.value.filter((i) => i !== index);
  } else {
    qSelection.value.push(index);
  }
};
</script>
