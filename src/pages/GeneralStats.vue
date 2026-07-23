<template>
    <!-- Partido no encontrado -->
    <EmptyState
        v-if="notFound"
        :title="$t('stats.notFoundTitle')"
        :message="$t('stats.notFoundMessage')"
    />

    <section v-else class="min-h-screen px-4 pb-24 flex flex-col gap-4 items-center max-w-3xl mx-auto">
        <!-- ============ CARGANDO: SKELETON ============ -->
        <template v-if="!baseStats.loaded">
            <!-- Skeleton de marcador: evita el flash de "0-0" con nombres fallback. -->
            <article class="card w-full p-5 animate-pulse">
                <div class="flex items-center justify-between mb-3">
                    <div class="h-3.5 w-24 rounded bg-white/[0.06]"></div>
                    <div class="h-3 w-16 rounded bg-white/[0.06]"></div>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <div class="flex flex-col items-center gap-2 rounded-xl bg-white/[0.04] border border-white/10 py-4">
                        <div class="h-12 w-14 rounded bg-white/[0.06]"></div>
                        <div class="h-2.5 w-16 rounded bg-white/[0.06]"></div>
                    </div>
                    <div class="flex flex-col items-center gap-2 rounded-xl bg-white/[0.04] border border-white/10 py-4">
                        <div class="h-12 w-14 rounded bg-white/[0.06]"></div>
                        <div class="h-2.5 w-16 rounded bg-white/[0.06]"></div>
                    </div>
                </div>
                <div class="mt-4 flex items-center gap-2">
                    <div v-for="n in 4" :key="n" class="h-7 w-14 shrink-0 rounded-full bg-white/[0.06]"></div>
                </div>
            </article>

            <!-- Pestañas (ya se pueden pulsar mientras carga; cada una tiene su
                 propio skeleton, a la altura del contenido real). -->
            <div class="w-full flex items-center gap-1.5 overflow-x-auto pb-1">
                <button
                    v-for="tab in visibleTabs"
                    :key="tab.key"
                    class="shrink-0 rounded-full px-3 py-1.5 text-xs border transition-colors"
                    :class="activeTab === tab.key
                        ? 'bg-white text-slate-900 border-white font-semibold'
                        : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/30'"
                    @click="activeTab = tab.key"
                >
                    {{ $t(tab.labelKey) }}
                </button>
            </div>

            <template v-if="activeTab === 'general'">
                <SkeletonCard :lines="2" />
                <SkeletonCard :lines="4" />
                <SkeletonCard :lines="3" />
                <SkeletonChart :height="220" />
            </template>
            <template v-else-if="activeTab === 'rotations'">
                <SkeletonCard height="h-48" />
                <SkeletonCard :lines="3" />
                <SkeletonChart :height="240" />
                <SkeletonChart :height="240" />
            </template>
            <template v-else-if="activeTab === 'players'">
                <SkeletonCard :lines="1" />
                <SkeletonCard height="h-14" />
                <SkeletonChart :height="280" />
                <SkeletonCard :lines="3" />
                <SkeletonCard :lines="3" />
            </template>
            <template v-else-if="activeTab === 'tables'">
                <SkeletonCard :lines="6" />
            </template>
            <template v-else-if="activeTab === 'directions'">
                <SkeletonCard height="h-72" />
            </template>
            <template v-else-if="activeTab === 'pointByPoint'">
                <SkeletonCard :lines="5" />
                <SkeletonChart :height="220" />
            </template>
        </template>

        <template v-else>
            <!-- ============ MARCADOR ============ -->
            <article class="card w-full p-5">
                <div class="flex items-center justify-between mb-3">
                    <span v-if="matchOver" class="inline-flex items-center gap-2 text-xs font-semibold text-slate-300">
                        <i class="bi bi-flag-fill"></i>
                        {{ $t('stats.final') }}
                    </span>
                    <span v-else class="inline-flex items-center gap-2 text-xs font-semibold text-volt-400">
                        <span class="h-2 w-2 rounded-full bg-volt-400 animate-pulse"></span>
                        {{ $t('stats.liveSet', { n: currentSet }) }}
                    </span>
                    <span class="text-xs text-slate-500">{{ $t('stats.inSets', { us: setsWon[0], them: setsWon[1] }) }}</span>
                </div>

                <div class="grid grid-cols-2 gap-2">
                    <div class="text-center rounded-xl bg-brand-500/10 border border-brand-500/20 py-4">
                        <p class="text-5xl md:text-6xl font-display font-bold text-brand-300">{{ score[0] }}</p>
                        <p class="text-xs text-slate-400 mt-2 truncate px-2">{{ usName }}</p>
                        <RouterLink
                            v-if="teamId"
                            :to="{ name: 'team', params: { id: teamId } }"
                            class="mt-1.5 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] text-slate-300 hover:text-white hover:border-brand-500/40 transition-colors"
                        >
                            <i class="bi bi-people-fill text-brand-300"></i>
                            {{ $t('stats.viewTeam') }}
                        </RouterLink>
                    </div>
                    <div class="text-center rounded-xl bg-white/[0.04] border border-white/10 py-4">
                        <p class="text-5xl md:text-6xl font-display font-bold text-slate-300">{{ score[1] }}</p>
                        <p class="text-xs text-slate-400 mt-2 truncate px-2">{{ themName }}</p>
                    </div>
                </div>

                <!-- Selector de sets (con "Partido" completo en el informe) -->
                <div class="mt-4 flex items-center gap-2 overflow-x-auto">
                    <button
                        v-if="matchOver"
                        class="shrink-0 rounded-full px-3 py-1.5 text-sm border transition-colors"
                        :class="set === 0
                            ? 'bg-white text-slate-900 border-white font-semibold'
                            : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/30'"
                        @click="pickSet(0)"
                    >
                        {{ $t('stats.fullMatch') }}
                    </button>
                    <button
                        v-for="n in nSets"
                        :key="n"
                        class="shrink-0 rounded-full px-3 py-1.5 text-sm border transition-colors"
                        :class="set === n
                            ? 'bg-white text-slate-900 border-white font-semibold'
                            : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/30'"
                        @click="pickSet(n)"
                    >
                        {{ $t('stats.setN', { n }) }}
                        <span v-if="setResult(n)" class="ml-1 text-xs opacity-70">{{ setResult(n) }}</span>
                    </button>
                    <button
                        v-if="!matchOver && manualSet !== null && manualSet !== currentSet"
                        class="shrink-0 rounded-full px-3 py-1.5 text-xs border border-volt-500/40 text-volt-400"
                        @click="manualSet = null"
                    >
                        <i class="bi bi-broadcast"></i> {{ $t('stats.backToLive') }}
                    </button>
                </div>
            </article>

            <EmptyState
                v-if="setStats.length === 0"
                :title="$t('stats.emptySetTitle')"
                :message="$t('stats.emptySetMessage')"
            />

            <template v-else>
            <!-- ============ PESTAÑAS (espejo de la app) ============ -->
            <div class="w-full flex items-center gap-1.5 overflow-x-auto pb-1">
                <button
                    v-for="tab in visibleTabs"
                    :key="tab.key"
                    class="shrink-0 rounded-full px-3 py-1.5 text-xs border transition-colors"
                    :class="activeTab === tab.key
                        ? 'bg-white text-slate-900 border-white font-semibold'
                        : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/30'"
                    @click="activeTab = tab.key"
                >
                    {{ $t(tab.labelKey) }}
                </button>
            </div>

            <!-- ============ 1. GENERAL ============ -->
            <template v-if="activeTab === 'general'">
                <!-- KPIs: side-out / break -->
                <section class="w-full grid grid-cols-2 gap-2">
                    <article class="card p-3 text-center">
                        <p class="text-2xl font-display font-bold text-brand-300">{{ pct(sideOut.won, sideOut.total) }}</p>
                        <p class="text-xs text-slate-400 leading-4 mt-1">{{ $t('stats.sideOut') }}<br />{{ sideOut.won }}/{{ sideOut.total }}</p>
                    </article>
                    <article class="card p-3 text-center">
                        <p class="text-2xl font-display font-bold text-brand-300">{{ pct(breakPts.won, breakPts.total) }}</p>
                        <p class="text-xs text-slate-400 leading-4 mt-1">{{ $t('stats.break') }}<br />{{ breakPts.won }}/{{ breakPts.total }}</p>
                    </article>
                </section>

                <!-- Racha: solo en vivo -->
                <article v-if="!matchOver" class="card w-full p-3 flex items-center justify-center gap-3">
                    <p class="text-2xl font-display font-bold" :class="streak.ours ? 'text-volt-400' : 'text-red-400'">
                        {{ streak.count }}
                    </p>
                    <p class="text-sm text-slate-400">
                        {{ $t('stats.streak', { team: streak.ours ? usName : themName }) }}
                    </p>
                </article>

                <!-- Claves del partido -->
                <article v-if="insights.length" class="card w-full p-4">
                    <p class="text-sm font-semibold mb-3">{{ $t('stats.keys') }}</p>
                    <ul class="space-y-2">
                        <li v-for="(ins, i) in insights" :key="i" class="flex items-start gap-3 rounded-lg bg-white/[0.03] px-3 py-2 text-sm">
                            <i :class="['bi', ins.icon, 'mt-0.5', ins.color]"></i>
                            <span class="text-slate-300">{{ ins.text }}</span>
                        </li>
                    </ul>
                </article>

                <!-- Origen de los puntos -->
                <article class="card w-full p-4">
                    <p class="text-sm font-semibold mb-3">{{ $t('stats.pointsOrigin') }}</p>
                    <div class="grid grid-cols-[1fr_auto_auto] gap-y-1.5 text-sm">
                        <span></span>
                        <span class="w-16 text-center text-xs text-slate-400">{{ usName }}</span>
                        <span class="w-16 text-center text-xs text-slate-400">{{ themName }}</span>
                        <template v-for="row in sourceRows" :key="row.label">
                            <span class="text-slate-300 py-1">{{ row.label }}</span>
                            <span class="w-16 text-center py-1 font-semibold" :class="row.us >= row.them ? 'text-brand-300' : ''">{{ row.us }}</span>
                            <span class="w-16 text-center py-1" :class="row.them > row.us ? 'text-red-300 font-semibold' : ''">{{ row.them }}</span>
                        </template>
                    </div>
                </article>

                <!-- Puntos por jugadora -->
                <article v-if="topScorers.length" class="card w-full p-4">
                    <p class="text-sm font-semibold mb-3">{{ $t('stats.pointsByPlayer') }}</p>
                    <ul class="space-y-1.5">
                        <li v-for="p in topScorers" :key="p.name" class="flex items-center gap-3 text-sm">
                            <span class="w-6 text-right font-display font-bold text-brand-300">{{ p.points }}</span>
                            <div class="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                                <div class="h-full rounded-full bg-brand-500/70" :style="{ width: p.barWidth }"></div>
                            </div>
                            <span class="w-28 truncate text-slate-300">{{ p.name }}</span>
                        </li>
                    </ul>
                </article>

                <!-- Comparativa entre sets -->
                <article v-if="setsComparison.length > 1" class="card w-full p-4">
                    <p class="text-sm font-semibold mb-3">{{ $t('stats.setBySet') }}</p>
                    <div class="grid grid-cols-[auto_1fr_1fr_1fr_1fr] gap-y-1.5 text-sm items-center">
                        <span></span>
                        <span class="text-center text-xs text-slate-400">{{ $t('stats.colResult') }}</span>
                        <span class="text-center text-xs text-slate-400">{{ $t('stats.colSideOut') }}</span>
                        <span class="text-center text-xs text-slate-400">{{ $t('stats.colBreak') }}</span>
                        <span class="text-center text-xs text-slate-400">{{ $t('stats.colUnforced') }}</span>
                        <template v-for="row in setsComparison" :key="row.n">
                            <span class="pr-3 font-semibold text-slate-300">S{{ row.n }}</span>
                            <span class="text-center font-display font-bold" :class="row.won ? 'text-volt-400' : 'text-red-400'">{{ row.result }}</span>
                            <span class="text-center">{{ row.sideOut }}</span>
                            <span class="text-center">{{ row.breakPts }}</span>
                            <span class="text-center" :class="row.unforcedColor">{{ row.unforced }}</span>
                        </template>
                    </div>
                </article>

                <!-- Errores por área -->
                <article class="card w-full p-4">
                    <p class="text-sm font-semibold">{{ $t('stats.errorsByArea') }}</p>
                    <VueApexCharts type="bar" height="220" :options="errors.chartOptions" :series="errors.series" />
                </article>
            </template>

            <!-- ============ 2. ROTACIONES ============ -->
            <template v-else-if="activeTab === 'rotations'">
                <Rotations360Section
                    :stats="gameStats"
                    :derived-kills="derived.kills"
                    :reception-grade-buckets="receptionGradeBuckets"
                />
            </template>

            <!-- ============ 3. POR JUGADORA ============ -->
            <template v-else-if="activeTab === 'players'">
                <PlayerDetailSection
                    v-model:player-id="selectedPlayerId"
                    :stats="gameStats"
                    :all-stats="setStats"
                    :derived-kills="derived.kills"
                    :derived-aces="derived.aces"
                    :credited-by="derived.creditedBy"
                    :n-sets="nSets"
                    :set="set"
                />
            </template>

            <!-- ============ 4. TABLAS ============ -->
            <template v-else-if="activeTab === 'tables'">
                <SkillTablesSection :stats="gameStats" :all-stats="setStats" />
            </template>

            <!-- ============ 5. DIRECCIONES ============ -->
            <template v-else-if="activeTab === 'directions'">
                <DirectionsSection :stats="gameStats" />
            </template>

            <!-- ============ 6. PUNTO A PUNTO ============ -->
            <template v-else-if="activeTab === 'pointByPoint'">
                <article class="card w-full p-4">
                    <p class="text-sm font-semibold mb-3">{{ $t('stats.pointByPoint') }}</p>
                    <ul class="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                        <li
                            v-for="p in timeline"
                            :key="p.key"
                            class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm"
                            :class="p.ours ? 'bg-brand-500/10' : 'bg-white/[0.03]'"
                        >
                            <span class="shrink-0 font-display font-semibold tabular-nums w-14">{{ p.score }}</span>
                            <span class="h-2 w-2 shrink-0 rounded-full" :class="p.ours ? 'bg-brand-400' : 'bg-red-400'"></span>
                            <span class="text-slate-300 truncate">{{ p.label }}</span>
                        </li>
                    </ul>
                </article>

                <article class="card w-full p-4">
                    <p class="text-sm font-semibold mb-1">{{ $t('stats.momentum') }}</p>
                    <p class="text-xs text-slate-500 mb-2">{{ $t('stats.momentumSubtitle') }}</p>
                    <VueApexCharts type="bar" height="220" :options="momentum.chartOptions" :series="momentum.series" />
                </article>
            </template>
        </template>
        </template>
    </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { useDocument } from "vuefire";
// Registro local (no global en main.ts): solo esta página paga por ApexCharts.
import VueApexCharts from "vue3-apexcharts";
import type { ApexOptions } from "apexcharts";

const { t, te } = useI18n();
import EmptyState from "../components/EmptyState.vue";
import SkeletonCard from "../components/SkeletonCard.vue";
import SkeletonChart from "../components/SkeletonChart.vue";
import Rotations360Section from "../components/stats/Rotations360Section.vue";
import PlayerDetailSection from "../components/stats/PlayerDetailSection.vue";
import SkillTablesSection from "../components/stats/SkillTablesSection.vue";
import DirectionsSection from "../components/stats/DirectionsSection.vue";
import { collection, doc, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
import {
    ADMIN_IDS,
    AREA_LABEL_KEYS,
    ATTACK_IDS,
    KILL_IDS,
    aid,
    attackByReceptionGradeForMatch,
    currentSetsWon,
    deriveCredits,
    isMatchFinished,
    isRival,
    isUnforced,
    rivalServing,
} from "../utils/volleyStats";

const props = defineProps({
    id: String,
});

const route = useRoute();

// Pestañas de la página, espejo de la app: General / Rotaciones / Por
// jugadora / Tablas / Direcciones / Punto a punto. El selector de set
// (arriba) es global a todas.
const TABS = [
    { key: "general", labelKey: "stats.tabGeneral" },
    { key: "rotations", labelKey: "stats.tabRotations" },
    { key: "players", labelKey: "stats.tabPlayers" },
    { key: "tables", labelKey: "stats.tabTables" },
    { key: "directions", labelKey: "stats.tabDirections" },
    { key: "pointByPoint", labelKey: "stats.pointByPoint" },
] as const;
type TabKey = (typeof TABS)[number]["key"];
const isValidTab = (k: unknown): k is TabKey => typeof k === "string" && TABS.some((t) => t.key === k);

// Mientras el partido está en directo solo tienen sentido General y Punto a
// punto (rachas/momentum en vivo); el resto de pestañas (informe post-set)
// se ocultan hasta que el partido termina.
const LIVE_VISIBLE_KEYS: TabKey[] = ["general", "pointByPoint"];
const visibleTabs = computed(() => (matchOver.value ? TABS : TABS.filter((tab) => LIVE_VISIBLE_KEYS.includes(tab.key))));

// Tab preseleccionado por query (enlaces antiguos a /stats/:id/players o
// /stats/:id/areas, ver router.ts) — se respeta si es válido, si no cae al
// default resuelto más abajo (junto a `matchOver`, del que depende).
const requestedTab = route.query.tab;
const activeTab = ref<TabKey>(isValidTab(requestedTab) ? requestedTab : "general");
let defaultTabResolved = isValidTab(requestedTab);

// Colores compartidos del informe: cuota de errores no forzados.
const unforcedColor = (share: number): string =>
    share >= 0.3 ? "text-red-400" : share >= 0.2 ? "text-yellow-400" : "text-volt-400";
// Nombres de acciones y áreas en i18n (stats.actions.a<id> / stats.areas.*),
// resueltos en el idioma activo. Los ids de acción siguen siendo Strings.
const actionLabel = (s: any): string => {
    const key = `stats.actions.a${aid(s)}`;
    return te(key) ? t(key) : s?.action?.name ?? "";
};
const AREA_LABELS = computed(() => AREA_LABEL_KEYS.map((key) => t(`stats.areas.${key}`)));

// ------------------------------------------------------------------ datos
const match = useDocument(doc(db, "live_matches", props?.id ?? "x"));
const baseStats = reactive({ data: [] as any[], loaded: false });

onSnapshot(
    query(collection(db, "live_matches", props?.id ?? "x", "stats"), orderBy("order")),
    (q) => {
        baseStats.data = q.docs.map((d) => d.data());
        baseStats.loaded = true;
    }
);

const notFound = computed(() => match.value === null && baseStats.loaded && baseStats.data.length === 0);
const nSets = computed(() => match.value?.n_sets ?? 5);
const usName = computed(() => match.value?.team?.name || t("stats.usFallback"));
// Enlace a la página pública del equipo: la app serializa el equipo completo
// (Team.toJSON incluye `id`), pero se protege por si docs antiguos no lo traen.
const teamId = computed(() => {
    const id = String(match.value?.team?.id ?? "").trim();
    return id && id !== "0" ? id : "";
});
const themName = computed(() => match.value?.opponent || t("stats.themFallback"));
const currentSet = computed(() => match.value?.current_set ?? 1);

// Set seleccionado: sigue el set en curso durante el directo; en el informe
// arranca en la vista de partido completo (0). Elección manual con las píldoras.
const manualSet = ref<number | null>(null);
const set = computed(() => manualSet.value ?? (matchOver.value ? 0 : currentSet.value));
const pickSet = (n: number) => { manualSet.value = n; };

const setStats = computed(() =>
    set.value === 0 ? baseStats.data : baseStats.data.filter((s) => s.set?.number == set.value)
);
const gameStats = computed(() => setStats.value.filter((s) => !ADMIN_IDS.includes(aid(s))));
const pointEnders = computed(() => gameStats.value.filter((s) => s.to !== 0));
const lastPoint = computed(() => pointEnders.value.at(-1));

// Motor de kills/aces derivados (captura en cancha) sobre el ámbito
// seleccionado (set o partido completo) — se recalcula si cambia `set`.
const derived = computed(() => deriveCredits(gameStats.value));

// Selector global de jugadora del tab "Por jugadora" (PlayerDetailSection):
// vive aquí, no dentro del componente, para sobrevivir al cambio de pestaña
// (las pestañas se montan con `v-if`, ver `activeTab`).
const selectedPlayerId = ref<string>("");

// Ataque según la nota de la recepción previa, para el tab "Rotaciones"
// (recorre el ámbito en orden, reiniciando entre sets y al cerrarse cada
// punto — helper compartido, un solo scope aquí así que no hace falta merge).
const receptionGradeBuckets = computed(() => attackByReceptionGradeForMatch(gameStats.value, derived.value.kills));

// ------------------------------------------------------------------ marcador
const score = computed(() => [lastPoint.value?.score_us ?? 0, lastPoint.value?.score_them ?? 0]);

const scoreboard = computed(() => (match.value?.sets_scoreboard ?? []) as any[]);
const setResult = (n: number): string => {
    const s = scoreboard.value.find((x) => x.number === n);
    return s && (s.score_us > 0 || s.score_them > 0) && n !== currentSet.value
        ? `${s.score_us}-${s.score_them}`
        : "";
};
const setsWon = computed(() => {
    const { us, them } = currentSetsWon(match.value);
    return [us, them];
});

// El mismo enlace vive durante y después del partido: mientras el directo está
// activo se muestra el seguimiento (punto a punto, racha, momentum) y cuando
// deja de estarlo (la app publica live=false al cerrarse el set decisivo o al
// apagar el toggle) la página se convierte en el informe. Fallback para docs
// de versiones antiguas de la app que nunca actualizan `live`: último set
// cerrado con mayoría de sets alcanzada.
const matchOver = computed(() => isMatchFinished(match.value));

// Tab activo por defecto/gating de directo: General si el partido ya estaba
// terminado al abrir la página, Punto a punto si sigue en directo — se
// resuelve en cuanto se conoce el estado real del partido (a la vez que se
// revela el contenido, con `baseStats.loaded`). Además, mientras el partido
// sigue en directo, si el tab activo (preseleccionado por query o resuelto
// aquí) queda oculto por el gating de `visibleTabs`, cae a Punto a punto. Al
// terminar el partido (reactivo, con la página abierta) reaparecen todas las
// pestañas sin forzar un salto del tab activo.
watch(
    () => [baseStats.loaded, matchOver.value] as const,
    ([loaded, isOver]) => {
        if (!loaded) return;
        if (!defaultTabResolved) {
            defaultTabResolved = true;
            if (!isValidTab(requestedTab)) activeTab.value = isOver ? "general" : "pointByPoint";
        }
        if (!isOver && !LIVE_VISIBLE_KEYS.includes(activeTab.value)) activeTab.value = "pointByPoint";
    },
    { immediate: true }
);

// ------------------------------------------------------------------ racha y fases
const streak = computed(() => {
    const pts = pointEnders.value;
    const last = pts.at(-1);
    if (!last) return { count: 0, ours: true };
    let count = 0;
    for (let i = pts.length - 1; i >= 0; i--) {
        if (pts[i].to === last.to) count++;
        else break;
    }
    return { count, ours: last.to === 1 };
});

const sideOut = computed(() => {
    const rec = pointEnders.value.filter((s) => rivalServing(s));
    return { total: rec.length, won: rec.filter((s) => s.to === 1).length };
});
const breakPts = computed(() => {
    const srv = pointEnders.value.filter((s) => !rivalServing(s));
    return { total: srv.length, won: srv.filter((s) => s.to === 1).length };
});
const pct = (won: number, total: number): string =>
    total > 0 ? Math.round((won / total) * 100) + "%" : "—";

// ------------------------------------------------------------------ punto a punto
const timeline = computed(() =>
    [...pointEnders.value].reverse().map((s, i) => {
        const label = actionLabel(s);
        const who = isRival(s) ? themName.value : s.player?.name ?? "";
        return {
            key: s.id ?? i,
            score: `${s.score_us}-${s.score_them}`,
            ours: s.to === 1,
            label: who ? `${label} · ${who}` : label,
        };
    })
);

// ------------------------------------------------------------------ origen de puntos
const sourceRows = computed(() => {
    const credits = derived.value;
    const rows = [
        { label: t("stats.originAttack"), us: 0, them: 0 },
        { label: t("stats.originBlock"), us: 0, them: 0 },
        { label: t("stats.originAce"), us: 0, them: 0 },
        { label: t("stats.originErrors"), us: 0, them: 0 },
    ];
    for (const s of pointEnders.value) {
        const rival = isRival(s);
        const id = aid(s);
        // Punto derivado (captura en cancha): el sentinel rival de error de
        // recepción/defensa en realidad lo cerró nuestro saque o ataque
        // anterior — se reatribuye al bucket real en vez de "Errores".
        if (rival && s.to === 1) {
            const credit = credits.creditedBy.get(s);
            if (credit) {
                rows[credits.aces.has(credit) ? 2 : 0].us++;
                continue;
            }
        }
        const bucket = KILL_IDS.includes(id) ? 0 : id === "13" ? 1 : id === "8" ? 2 : 3;
        if (s.to === 1) {
            // Punto nuestro: si lo cerró el rival, es error suyo.
            rows[rival ? 3 : bucket].us++;
        } else if (s.to === 2) {
            rows[!rival ? 3 : bucket].them++;
        }
    }
    return rows;
});

// ------------------------------------------------------------------ jugadoras
const topScorers = computed(() => {
    const credits = derived.value;
    const byPlayer = new Map<string, number>();
    for (const s of pointEnders.value) {
        if (s.to !== 1) continue;
        if (!isRival(s)) {
            const name = s.player?.name ?? "";
            if (name) byPlayer.set(name, (byPlayer.get(name) ?? 0) + 1);
            continue;
        }
        // Punto derivado: se atribuye a quien generó el crédito real (la
        // sacadora del ace o la atacante del kill), nunca al sentinel rival.
        const credit = credits.creditedBy.get(s);
        if (!credit) continue;
        const name = (credits.aces.has(credit) ? credit.server?.name : credit.player?.name) ?? "";
        if (name) byPlayer.set(name, (byPlayer.get(name) ?? 0) + 1);
    }
    const sorted = [...byPlayer.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    const max = sorted[0]?.[1] ?? 1;
    return sorted.map(([name, points]) => ({
        name,
        points,
        barWidth: Math.round((points / max) * 100) + "%",
    }));
});

// ------------------------------------------------------------------ informe: set a set y claves
const setsComparison = computed(() => {
    const rows = [];
    for (let n = 1; n <= nSets.value; n++) {
        const pts = baseStats.data.filter(
            (s) => s.set?.number == n && !ADMIN_IDS.includes(aid(s)) && s.to !== 0
        );
        if (!pts.length) continue;
        const sb = scoreboard.value.find((x) => x.number === n);
        const rec = pts.filter((s) => rivalServing(s));
        const srv = pts.filter((s) => !rivalServing(s));
        const theirPts = pts.filter((s) => s.to === 2);
        const unforced = theirPts.filter(isUnforced).length;
        const share = theirPts.length ? unforced / theirPts.length : 0;
        rows.push({
            n,
            result: sb ? `${sb.score_us}-${sb.score_them}` : "",
            won: (sb?.score_us ?? 0) > (sb?.score_them ?? 0),
            sideOut: pct(rec.filter((s) => s.to === 1).length, rec.length),
            breakPts: pct(srv.filter((s) => s.to === 1).length, srv.length),
            unforced: theirPts.length ? `${unforced} · ${Math.round(share * 100)}%` : "—",
            unforcedColor: theirPts.length ? unforcedColor(share) : "text-slate-500",
        });
    }
    return rows;
});

// Claves automáticas: las mismas reglas "duraderas" del motor de avisos de la
// app, evaluadas sobre el ámbito seleccionado (set o partido completo).
const insights = computed(() => {
    const out: { icon: string; color: string; text: string }[] = [];
    const game = gameStats.value;
    const points = pointEnders.value;
    if (!points.length) return out;

    // Errores no forzados en lugar del antiguo "regalados": con la captura en
    // cuadrícula, todo punto rival figura como acción propia y el bruto no servía.
    const theirPts = points.filter((s) => s.to === 2);
    const unforced = theirPts.filter(isUnforced).length;
    if (theirPts.length >= 8 && unforced / theirPts.length >= 0.35) {
        out.push({ icon: "bi-gift-fill", color: "text-red-400", text: t("stats.insights.unforced", { n: unforced, total: theirPts.length }) });
    }

    const k3 = points.filter((s) => Number(s.stage) === 3);
    const k3lost = k3.filter((s) => s.to === 2).length;
    if (k3.length >= 8 && k3lost / k3.length >= 0.7) {
        out.push({ icon: "bi-stopwatch", color: "text-orange-400", text: t("stats.insights.longRallies", { lost: k3lost, total: k3.length }) });
    }

    const serves = game.filter((s) => !isRival(s) && ["8", "15", "32", "39", "40", "41"].includes(aid(s)));
    const serveErr = serves.filter((s) => ["15", "32"].includes(aid(s))).length;
    if (serves.length >= 8 && serveErr >= 3 && serveErr / serves.length >= 0.25) {
        out.push({ icon: "bi-bullseye", color: "text-yellow-400", text: t("stats.insights.serveErrors", { errors: serveErr, total: serves.length }) });
    }

    const ourAttacks = game.filter((s) => !isRival(s) && ATTACK_IDS.includes(aid(s)));
    if (ourAttacks.length >= 12) {
        const byPlayer = new Map<string, number>();
        for (const s of ourAttacks) byPlayer.set(s.player?.name ?? "", (byPlayer.get(s.player?.name ?? "") ?? 0) + 1);
        const top = [...byPlayer.entries()].sort((a, b) => b[1] - a[1])[0];
        if (byPlayer.size > 1 && top && top[1] / ourAttacks.length >= 0.5) {
            out.push({ icon: "bi-diagram-3-fill", color: "text-orange-400", text: t("stats.insights.attackConcentration", { player: top[0], pct: Math.round((top[1] / ourAttacks.length) * 100) }) });
        }
    }

    const blockouts = game.filter((s) => isRival(s) && aid(s) === "11").length;
    if (blockouts >= 3) {
        out.push({ icon: "bi-hand-index-thumb-fill", color: "text-red-400", text: t("stats.insights.blockouts", { n: blockouts }) });
    }

    const rivalDir = game.filter((s) => isRival(s) && ATTACK_IDS.includes(aid(s)) && String(s.direction ?? "").includes("#"));
    if (rivalDir.length >= 6) {
        const corridors = new Map<string, number>();
        for (const s of rivalDir) {
            const parts = String(s.direction).split("#");
            const from = parts[0]?.[0];
            const to = parts[parts.length - 1]?.[0];
            if (from && to && /\d/.test(from) && /\d/.test(to)) {
                corridors.set(`${from} → ${to}`, (corridors.get(`${from} → ${to}`) ?? 0) + 1);
            }
        }
        const top = [...corridors.entries()].sort((a, b) => b[1] - a[1])[0];
        if (top && top[1] >= 4 && top[1] / rivalDir.length >= 0.5) {
            out.push({ icon: "bi-eye-fill", color: "text-purple-400", text: t("stats.insights.corridor", { pct: Math.round((top[1] / rivalDir.length) * 100), corridor: top[0] }) });
        }
    }

    return out;
});

// ------------------------------------------------------------------ charts
const momentum = computed(() => {
    const pts = pointEnders.value;
    return {
        series: [{ data: pts.map((s) => s.score_us - s.score_them) }],
        chartOptions: <ApexOptions>{
            chart: { type: "bar", toolbar: { show: false }, sparkline: { enabled: false } },
            grid: { show: false, padding: { left: 0, right: 0 } },
            plotOptions: {
                bar: {
                    borderRadius: 2,
                    columnWidth: "80%",
                    colors: {
                        ranges: [
                            { from: 0, to: Infinity, color: "#6E93FF" },
                            { from: -Infinity, to: -0.5, color: "#F87171" },
                        ],
                    },
                },
            },
            dataLabels: { enabled: false },
            xaxis: {
                labels: { show: false },
                axisBorder: { show: false },
                axisTicks: { show: false },
                categories: pts.map((s) => `${s.score_us}-${s.score_them}`),
            },
            yaxis: { show: false },
            tooltip: {
                theme: "dark",
                x: { show: true },
                y: { title: { formatter: () => t("stats.momentumTooltip") } },
            },
        },
    };
});

const errors = computed(() => {
    const grouped = new Map<number, number>();
    for (const s of gameStats.value) {
        if (s.to === 2 && !isRival(s) && s.action?.type === "error") {
            const area = Number(s.action?.area ?? -1);
            grouped.set(area, (grouped.get(area) ?? 0) + 1);
        }
    }
    const entries = [...grouped.entries()].sort((a, b) => a[0] - b[0]);
    return {
        series: [{ name: t("stats.errorsSeries"), data: entries.map(([, v]) => v) }],
        chartOptions: <ApexOptions>{
            chart: { type: "bar", toolbar: { show: false } },
            fill: { colors: ["#6E93FF"] },
            grid: { show: false, padding: { left: 0, right: 0 } },
            plotOptions: { bar: { borderRadius: 6, columnWidth: 30, borderRadiusApplication: "end" } },
            dataLabels: { enabled: false },
            xaxis: {
                categories: entries.map(([k]) => AREA_LABELS.value[k] ?? t("stats.otherArea")),
                labels: { style: { colors: "#94a3b8" } },
                axisBorder: { show: false },
                axisTicks: { show: false },
            },
            yaxis: { show: false },
            tooltip: { theme: "dark" },
        },
    };
});
</script>
