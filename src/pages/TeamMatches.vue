<template>
    <EmptyState
        v-if="notFound"
        :title="$t('team.notFoundTitle')"
        :message="$t('team.notFoundMessage')"
    />

    <section v-else class="min-h-screen px-4 pb-16 flex flex-col gap-4 items-center max-w-3xl mx-auto">
        <!-- Cabecera del equipo: skeleton mientras `teams/{id}` está cargando
             (undefined, distinto de null = no existe, ya cubierto por `notFound`). -->
        <article v-if="teamLoading" class="card w-full p-5 flex flex-col gap-4 animate-pulse">
            <div class="flex items-center gap-4">
                <div class="h-12 w-12 shrink-0 rounded-2xl bg-white/[0.06]"></div>
                <div class="flex-1 min-w-0 space-y-2">
                    <div class="h-4 w-1/2 rounded bg-white/[0.06]"></div>
                    <div class="h-3 w-1/3 rounded bg-white/[0.06]"></div>
                </div>
            </div>
        </article>

        <article v-else class="card w-full p-5 flex flex-col gap-4">
            <div class="flex items-center gap-4">
                <span
                    class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 font-display font-bold text-lg"
                    :style="{ background: teamColor + '33', color: teamColor }"
                >
                    {{ initials }}
                </span>
                <span class="flex-1 min-w-0">
                    <span class="block text-lg font-bold truncate">{{ teamName }}</span>
                    <span class="block text-xs text-slate-400">{{ $t('team.sharedMatches', matchRows.length) }}</span>
                </span>
            </div>

            <!-- Selector de temporada (global: afecta a Partidos y Estadísticas) -->
            <!-- solo si el equipo ya publica current_season -->
            <div v-if="hasSeasons" class="w-full flex items-center gap-2 overflow-x-auto">
                <button
                    class="shrink-0 rounded-full px-3 py-1.5 text-xs border transition-colors"
                    :class="selectedSeason === 'all'
                        ? 'bg-white text-slate-900 border-white font-semibold'
                        : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/30'"
                    @click="selectedSeason = 'all'"
                >
                    {{ $t('team.allSeasons') }}
                </button>
                <button
                    v-for="sid in seasonIds"
                    :key="sid"
                    class="shrink-0 rounded-full px-3 py-1.5 text-xs border transition-colors"
                    :class="selectedSeason === sid
                        ? 'bg-white text-slate-900 border-white font-semibold'
                        : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/30'"
                    @click="selectedSeason = sid"
                >
                    {{ seasonsMap?.[sid] ?? sid }}
                </button>
                <button
                    v-if="hasUnseasonedMatches"
                    class="shrink-0 rounded-full px-3 py-1.5 text-xs border transition-colors"
                    :class="selectedSeason === '__none__'
                        ? 'bg-white text-slate-900 border-white font-semibold'
                        : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/30'"
                    @click="selectedSeason = '__none__'"
                >
                    {{ $t('team.noSeason') }}
                </button>
            </div>
        </article>

        <!-- Pestañas: partidos / estadísticas agregadas -->
        <div class="w-full flex items-center gap-2">
            <button
                class="flex-1 rounded-full px-3 py-2 text-sm border transition-colors"
                :class="view === 'matches'
                    ? 'bg-white text-slate-900 border-white font-semibold'
                    : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/30'"
                @click="view = 'matches'"
            >
                {{ $t('team.tabMatches') }}
            </button>
            <button
                class="flex-1 rounded-full px-3 py-2 text-sm border transition-colors"
                :class="view === 'stats'
                    ? 'bg-white text-slate-900 border-white font-semibold'
                    : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/30'"
                @click="view = 'stats'"
            >
                {{ $t('team.tabStats') }}
            </button>
        </div>

        <!-- Progreso de carga de partidos (pestaña Partidos; en Estadísticas
             el mismo contador se muestra bajo su propio skeleton, más abajo). -->
        <p v-if="progress.loading && view === 'matches'" class="text-xs text-slate-500">
            {{ $t('team.loadingProgress', { done: progress.done, total: progress.total }) }}
        </p>

        <EmptyState
            v-if="!progress.loading && matchRows.length === 0"
            :title="$t('team.emptyTitle')"
            :message="$t('team.emptyMessage')"
        />

        <!-- ============ PARTIDOS ============ -->
        <template v-if="view === 'matches'">
            <template v-if="progress.loading">
                <article v-for="n in 4" :key="n" class="card w-full p-4">
                    <SkeletonRow trailing />
                </article>
            </template>
            <template v-else>
                <RouterLink
                    v-for="m in matchRows"
                    :key="m.code"
                    :to="{ name: 'stats', params: { id: m.code } }"
                    class="card w-full p-4 flex items-center gap-3 hover:border-brand-500/40 transition-colors"
                >
                    <span class="flex-1 min-w-0">
                        <span class="block font-semibold truncate">{{ $t('team.vs', { opponent: m.opponent }) }}</span>
                        <span class="block text-xs text-slate-400">{{ m.dateLabel }}</span>
                    </span>
                    <span
                        v-if="m.live"
                        class="inline-flex items-center gap-1.5 rounded-full bg-volt-400 px-2.5 py-1 text-xs font-bold text-ink-950"
                    >
                        <span class="h-1.5 w-1.5 rounded-full bg-ink-950 animate-pulse"></span>
                        {{ $t('team.live') }}
                    </span>
                    <span
                        v-else-if="m.result"
                        class="rounded-full border px-2.5 py-1 font-display text-sm font-bold"
                        :class="m.won ? 'border-brand-500/40 bg-brand-500/15 text-brand-300' : 'border-red-500/40 bg-red-500/15 text-red-400'"
                    >
                        {{ m.result }}
                    </span>
                    <i class="bi bi-chevron-right text-slate-500"></i>
                </RouterLink>
            </template>
        </template>

        <!-- ============ ESTADÍSTICAS AGREGADAS ============ -->
        <!-- `progress.loading` cubre el caso (raro con la fase de docs ya
             rápida) de abrir esta pestaña antes de que lleguen los docs de la
             temporada seleccionada: sin él, `matchRows` seguiría a 0 y no
             habría ni skeleton que mostrar. -->
        <template v-else-if="matchRows.length > 0 || progress.loading">
            <template v-if="progress.loading || statsProgress.loading">
                <!-- Sub-pestañas reales (ya se pueden pulsar mientras carga: cada
                     una tiene su propio skeleton, a la altura del gráfico real). -->
                <div class="w-full flex items-center gap-1.5 overflow-x-auto pb-1">
                    <button
                        v-for="tab in STATS_TABS"
                        :key="tab.key"
                        class="shrink-0 rounded-full px-3 py-1.5 text-xs border transition-colors"
                        :class="statsTab === tab.key
                            ? 'bg-white text-slate-900 border-white font-semibold'
                            : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/30'"
                        @click="statsTab = tab.key"
                    >
                        {{ $t(tab.labelKey) }}
                    </button>
                </div>

                <template v-if="statsTab === 'general'">
                    <SkeletonCard :lines="3" />
                    <SkeletonCard :lines="5" />
                    <SkeletonChart :height="280" />
                </template>
                <template v-else-if="statsTab === 'rotations'">
                    <SkeletonCard height="h-48" />
                    <SkeletonCard :lines="3" />
                    <SkeletonChart :height="240" />
                    <SkeletonChart :height="240" />
                </template>
                <template v-else-if="statsTab === 'absolute'">
                    <SkeletonChart :height="220" />
                    <SkeletonChart :height="220" />
                </template>
                <template v-else-if="statsTab === 'historic'">
                    <SkeletonChart :height="200" />
                    <SkeletonChart :height="200" />
                    <SkeletonChart :height="200" />
                </template>
                <template v-else-if="statsTab === 'directions'">
                    <SkeletonCard height="h-72" />
                </template>
                <template v-else-if="statsTab === 'byPlayer'">
                    <SkeletonChart :height="280" />
                </template>
                <template v-else-if="statsTab === 'tables'">
                    <SkeletonCard :lines="6" />
                </template>

                <!-- Progreso de carga: de la fase de stats si ya arrancó, si
                     no de la fase de docs (ver `statsAreaProgress`). -->
                <p class="text-xs text-slate-500 text-center">
                    {{ $t('team.loadingProgress', { done: statsAreaProgress.done, total: statsAreaProgress.total }) }}
                </p>
            </template>

            <template v-else>
                <EmptyState
                    v-if="loadedMatches.length === 0"
                    :title="$t('team.statsEmptyTitle')"
                    :message="$t('team.statsEmptyMessage')"
                />

                <template v-else>
                    <!-- Sub-pestañas de "Estadísticas" (mismo orden que la app) -->
                    <div class="w-full flex items-center gap-1.5 overflow-x-auto pb-1">
                        <button
                            v-for="tab in STATS_TABS"
                            :key="tab.key"
                            class="shrink-0 rounded-full px-3 py-1.5 text-xs border transition-colors"
                            :class="statsTab === tab.key
                                ? 'bg-white text-slate-900 border-white font-semibold'
                                : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/30'"
                            @click="statsTab = tab.key"
                        >
                            {{ $t(tab.labelKey) }}
                        </button>
                    </div>

                    <!-- ============ 1. GENERAL ============ -->
                <template v-if="statsTab === 'general'">
                    <!-- Resumen -->
                    <article class="card w-full p-4">
                        <p class="text-sm font-semibold mb-3">{{ $t('team.summary') }}</p>
                        <div class="grid grid-cols-3 gap-2">
                            <div class="text-center rounded-xl bg-white/[0.04] border border-white/10 py-3">
                                <p class="text-lg font-display font-bold text-brand-300">{{ matchesRecord.won }}-{{ matchesRecord.lost }}</p>
                                <p class="text-[11px] text-slate-400 mt-1">{{ $t('team.matchesRecord') }}</p>
                            </div>
                            <div class="text-center rounded-xl bg-white/[0.04] border border-white/10 py-3">
                                <p class="text-lg font-display font-bold text-brand-300">{{ setsRecord.won }}-{{ setsRecord.lost }}</p>
                                <p class="text-[11px] text-slate-400 mt-1">{{ $t('team.setsRecord') }}</p>
                            </div>
                            <div class="text-center rounded-xl bg-white/[0.04] border border-white/10 py-3">
                                <p class="text-lg font-display font-bold" :class="currentStreak.count ? (currentStreak.won ? 'text-brand-300' : 'text-red-400') : 'text-slate-300'">
                                    {{ currentStreak.count || "—" }}
                                </p>
                                <p class="text-[11px] text-slate-400 mt-1">{{ currentStreak.won ? $t('team.streakWon') : $t('team.streakLost') }}</p>
                            </div>
                        </div>
                        <div v-if="recentForm.length" class="mt-3 flex items-center gap-1.5">
                            <span
                                v-for="(w, i) in recentForm"
                                :key="i"
                                class="h-2.5 w-2.5 rounded-full"
                                :class="w ? 'bg-brand-400' : 'bg-red-400'"
                            ></span>
                            <span class="text-[11px] text-slate-500 ml-1">{{ $t('team.recentForm') }}</span>
                        </div>
                    </article>

                    <!-- KPIs de equipo -->
                    <article class="card w-full p-4">
                        <p class="text-sm font-semibold mb-3">{{ $t('team.kpis') }}</p>
                        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            <div class="rounded-lg bg-white/[0.04] border border-white/10 py-3 text-center">
                                <p class="text-lg font-display font-bold text-brand-300">{{ pct(kpiSideOut.won, kpiSideOut.total) }}</p>
                                <p class="text-[11px] text-slate-400 leading-4 mt-1">{{ $t('stats.sideOut') }}<br />{{ kpiSideOut.won }}/{{ kpiSideOut.total }}</p>
                            </div>
                            <div class="rounded-lg bg-white/[0.04] border border-white/10 py-3 text-center">
                                <p class="text-lg font-display font-bold text-brand-300">{{ pct(kpiBreak.won, kpiBreak.total) }}</p>
                                <p class="text-[11px] text-slate-400 leading-4 mt-1">{{ $t('stats.break') }}<br />{{ kpiBreak.won }}/{{ kpiBreak.total }}</p>
                            </div>
                            <div class="rounded-lg bg-white/[0.04] border border-white/10 py-3 text-center">
                                <p class="text-lg font-display font-bold text-slate-200">{{ kpiReceptionMark }}</p>
                                <p class="text-[11px] text-slate-400 leading-4 mt-1">{{ $t('team.receptionMark') }}<br />{{ kpiReception.total }}</p>
                            </div>
                            <div class="rounded-lg bg-white/[0.04] border border-white/10 py-3 text-center">
                                <p class="text-lg font-display font-bold" :class="kpiAttackEff >= 40 ? 'text-volt-400' : kpiAttackEff >= 25 ? 'text-brand-300' : 'text-slate-200'">{{ kpiAttackEff }}%</p>
                                <p class="text-[11px] text-slate-400 leading-4 mt-1">{{ $t('team.attackEff') }}<br />{{ kpiAttack.kills }}/{{ kpiAttack.attempts }}</p>
                            </div>
                            <div class="rounded-lg bg-white/[0.04] border border-white/10 py-3 text-center">
                                <p class="text-lg font-display font-bold" :class="kpiUnforced.share >= 0.3 ? 'text-red-400' : kpiUnforced.share >= 0.2 ? 'text-yellow-400' : 'text-volt-400'">
                                    {{ pct(kpiUnforced.count, kpiUnforced.total) }}
                                </p>
                                <p class="text-[11px] text-slate-400 leading-4 mt-1">{{ $t('team.unforced') }}<br />{{ kpiUnforced.count }}/{{ kpiUnforced.total }}</p>
                            </div>
                        </div>
                    </article>

                    <!-- Radar de equipo (vive en General, como en la app) -->
                    <article class="card w-full p-4">
                        <p class="text-sm font-semibold mb-3">{{ $t('team.radarTitle') }}</p>
                        <VueApexCharts type="radar" height="280" :options="radarTeamChart.chartOptions" :series="radarTeamChart.series" />
                    </article>
                </template>

                <!-- ============ 2. ROTACIONES ============ -->
                <template v-else-if="statsTab === 'rotations'">
                    <Rotations360Section
                        :stats="gameStats"
                        :derived-kills="derivedKills"
                        :reception-grade-buckets="receptionGradeBuckets"
                    />
                </template>

                <!-- ============ 3. DATOS ABSOLUTOS (6 pies serve/receive/block/dig/set/attack) ============ -->
                <template v-else-if="statsTab === 'absolute'">
                    <article v-if="areaDonuts.length" class="card w-full p-4">
                        <p class="text-sm font-semibold mb-3">{{ $t('team.byArea') }}</p>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div v-for="d in areaDonuts" :key="d.area">
                                <p class="text-xs text-slate-400 mb-1 text-center">{{ d.label }} · {{ d.total }}</p>
                                <VueApexCharts type="donut" height="220" :options="d.chartOptions" :series="d.series" />
                            </div>
                        </div>
                    </article>

                    <!-- Áreas extra (7-9), solo si el partido tiene datos en ellas -->
                    <article v-if="extraAreaDonuts.length" class="card w-full p-4">
                        <p class="text-sm font-semibold mb-3">{{ $t('team.byAreaExtra') }}</p>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div v-for="d in extraAreaDonuts" :key="d.area">
                                <p class="text-xs text-slate-400 mb-1 text-center">{{ d.label }} · {{ d.total }}</p>
                                <VueApexCharts type="donut" height="220" :options="d.chartOptions" :series="d.series" />
                            </div>
                        </div>
                    </article>
                </template>

                <!-- ============ 4. HISTÓRICO ============ -->
                <template v-else-if="statsTab === 'historic'">
                    <article v-if="matchLabels.length > 1" class="card w-full p-4">
                        <p class="text-sm font-semibold mb-1">{{ $t('team.serveHistory') }}</p>
                        <VueApexCharts type="line" height="200" :options="serveChart.chartOptions" :series="serveChart.series" />
                    </article>
                    <article v-if="matchLabels.length > 1" class="card w-full p-4">
                        <p class="text-sm font-semibold mb-1">{{ $t('team.receptionHistory') }}</p>
                        <VueApexCharts type="line" height="200" :options="receptionChart.chartOptions" :series="receptionChart.series" />
                    </article>
                    <article v-if="matchLabels.length > 1" class="card w-full p-4">
                        <p class="text-sm font-semibold mb-1">{{ $t('team.attackHistory') }}</p>
                        <VueApexCharts type="line" height="200" :options="attackChart.chartOptions" :series="attackChart.series" />
                    </article>
                </template>

                <!-- ============ 5. DIRECCIONES ============ -->
                <template v-else-if="statsTab === 'directions'">
                    <DirectionsSection :stats="gameStats" />
                </template>

                <!-- ============ 6. POR JUGADORA ============ -->
                <template v-else-if="statsTab === 'byPlayer'">
                    <article v-if="rosterPlayers.length" class="card w-full p-4">
                        <p class="text-sm font-semibold mb-3">{{ $t('team.radarByPlayer') }}</p>
                        <div class="flex items-center gap-2 overflow-x-auto pb-1 mb-2">
                            <button
                                v-for="p in rosterPlayers"
                                :key="p.id"
                                class="shrink-0 rounded-full px-3 py-1.5 text-xs border transition-colors"
                                :class="currentPlayerId === p.id
                                    ? 'bg-white text-slate-900 border-white font-semibold'
                                    : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/30'"
                                @click="selectedPlayerId = p.id"
                            >
                                {{ p.name }}
                            </button>
                        </div>
                        <VueApexCharts type="radar" height="280" :options="radarPlayerChart.chartOptions" :series="radarPlayerChart.series" />
                    </article>
                    <EmptyState
                        v-else
                        :title="$t('team.statsEmptyTitle')"
                        :message="$t('team.statsEmptyMessage')"
                    />
                </template>

                <!-- ============ 7. TABLAS POR DESTREZA ============ -->
                <template v-else-if="statsTab === 'tables'">
                    <SkillTablesSection :stats="gameStats" :all-stats="allStats" />
                </template>
                </template>
            </template>
        </template>
    </section>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
// Registro local (no global en main.ts): solo esta página paga por ApexCharts.
import VueApexCharts from "vue3-apexcharts";
import type { ApexOptions } from "apexcharts";
import EmptyState from "../components/EmptyState.vue";
import SkeletonCard from "../components/SkeletonCard.vue";
import SkeletonChart from "../components/SkeletonChart.vue";
import SkeletonRow from "../components/SkeletonRow.vue";
import Rotations360Section from "../components/stats/Rotations360Section.vue";
import SkillTablesSection from "../components/stats/SkillTablesSection.vue";
import DirectionsSection from "../components/stats/DirectionsSection.vue";
import { useTeamStats } from "../composables/useTeamStats";
import {
    SERVE_ERR_IDS,
    TEAM_RADAR_FILTERS,
    aid,
    areaTotals,
    attackByReceptionGradeForMatch,
    attackEfficiency,
    attackTotals,
    breakStats,
    currentSetsWon,
    deriveCredits,
    isGameStat,
    isPointEnder,
    isRival,
    mergeCredits,
    mergeGradeBuckets,
    pct,
    playerRadarFilters,
    radarAxes,
    receptionTotals,
    sideOutStats,
    unforcedShare,
    type StatDoc,
} from "../utils/volleyStats";

const teamId = useRoute().params.id as string;
const { t, locale } = useI18n();

const {
    team,
    filteredMatches,
    progress,
    statsProgress,
    ensureStatsLoaded,
    hasSeasons,
    seasonsMap,
    seasonIds,
    selectedSeason,
    hasUnseasonedMatches,
} = useTeamStats(teamId);

const view = ref<"matches" | "stats">("matches");
// La subcolección `stats` de cada partido no se pide hasta que el usuario
// abre la pestaña "Estadísticas" — si nunca la abre, no se descarga ni una
// stat (ver useTeamStats.ts, fase 2). `watch` en vez de en el propio botón:
// cubre también un futuro cambio de `view` que no venga de un click directo.
watch(
    view,
    (v) => {
        if (v === "stats") ensureStatsLoaded();
    },
    { immediate: true }
);

// Progreso a mostrar en el skeleton de "Estadísticas": mientras la fase de
// stats esté en curso se usa la suya; si aún no ha arrancado (p.ej. los docs
// de la temporada seleccionada siguen llegando) se cae al progreso de docs,
// para no dejar el contador a 0/0.
const statsAreaProgress = computed(() => (statsProgress.loading ? statsProgress : progress));

// Sub-pestañas de "Estadísticas", mismo orden/agrupación que la app
// iOS/Android. `v-if` en la plantilla (no `v-show`): solo la pestaña activa
// monta sus gráficas ApexCharts y lee sus computeds — cambiar de pestaña no
// debe recomputar/renderizar las demás.
const STATS_TABS = [
    { key: "general", labelKey: "team.statsTabGeneral" },
    { key: "rotations", labelKey: "team.statsTabRotations" },
    { key: "absolute", labelKey: "team.statsTabAbsolute" },
    { key: "historic", labelKey: "team.statsTabHistoric" },
    { key: "directions", labelKey: "team.statsTabDirections" },
    { key: "byPlayer", labelKey: "team.statsTabByPlayer" },
    { key: "tables", labelKey: "team.statsTabTables" },
] as const;
type StatsTabKey = (typeof STATS_TABS)[number]["key"];
const statsTab = ref<StatsTabKey>("general");

const notFound = computed(() => team.value === null);
// `useDocument` deja el ref en `undefined` mientras resuelve el primer
// snapshot; `null` significa que el doc no existe (ver `notFound` arriba).
const teamLoading = computed(() => team.value === undefined);
const teamName = computed(() => team.value?.name ?? t("team.teamFallback"));
const teamColor = computed(() => {
    const hex = String(team.value?.color ?? "").replace("#", "");
    return hex.length === 6 || hex.length === 8 ? `#${hex}` : "#6E93FF";
});
const initials = computed(() =>
    teamName.value.split(/\s+/).map((w: string) => w[0]).join("").slice(0, 3).toUpperCase()
);

// ------------------------------------------------------------------ lista
const df = computed(() => new Intl.DateTimeFormat(locale.value, { dateStyle: "medium" }));
const matchRows = computed(() =>
    filteredMatches.value.map((m) => {
        let result = "";
        let won = false;
        let live = false;
        if (m.match) {
            const { us, them } = currentSetsWon(m.match);
            live = !m.finished && (us > 0 || them > 0 || m.match.live === true);
            if (m.finished || us > 0 || them > 0) {
                result = `${us}-${them}`;
                won = us > them;
            }
        }
        return {
            code: m.code,
            opponent: m.opponent,
            dateLabel: df.value.format(new Date(m.date * 1000)),
            live,
            result,
            won,
        };
    })
);

// ------------------------------------------------------------------ agregación
// Solo los partidos cuyo doc se ha podido leer (finalizados o en directo);
// los códigos rotos/purgados quedan fuera de las estadísticas.
const loadedMatches = computed(() => filteredMatches.value.filter((m) => m.found));
const finishedMatches = computed(() => loadedMatches.value.filter((m) => m.finished && m.match));
const allStats = computed(() => loadedMatches.value.flatMap((m) => m.stats));
const gameStats = computed(() => allStats.value.filter(isGameStat));
const pointEnders = computed(() => gameStats.value.filter(isPointEnder));

// --- resumen ---
const matchesRecord = computed(() => {
    let won = 0;
    let lost = 0;
    for (const m of finishedMatches.value) {
        const { us, them } = currentSetsWon(m.match);
        if (us > them) won++;
        else if (them > us) lost++;
    }
    return { won, lost };
});
const setsRecord = computed(() => {
    let won = 0;
    let lost = 0;
    for (const m of finishedMatches.value) {
        const { us, them } = currentSetsWon(m.match);
        won += us;
        lost += them;
    }
    return { won, lost };
});
const chronologicalFinished = computed(() => [...finishedMatches.value].sort((a, b) => a.date - b.date));
const recentForm = computed(() =>
    chronologicalFinished.value.slice(-8).map((m) => {
        const { us, them } = currentSetsWon(m.match);
        return us > them;
    })
);
const currentStreak = computed(() => {
    const list = chronologicalFinished.value;
    let count = 0;
    let won: boolean | null = null;
    for (let i = list.length - 1; i >= 0; i--) {
        const { us, them } = currentSetsWon(list[i].match);
        if (us === them) break;
        const w = us > them;
        if (won === null) {
            won = w;
            count = 1;
        } else if (w === won) {
            count++;
        } else {
            break;
        }
    }
    return { count, won: won ?? true };
});

// --- A: motor de kills/aces derivados (captura en cancha) -----------------
// Por partido (los ids de stat y las secuencias de `to` no son comparables
// entre partidos), sobre la secuencia sin acciones admin. `mergeCredits`
// combina los `Set` de identidades de objeto en uno solo, válido para todo
// el ámbito filtrado (varios partidos).
const creditsByCode = computed(() => {
    const map = new Map<string, ReturnType<typeof deriveCredits>>();
    for (const m of loadedMatches.value) {
        map.set(m.code, deriveCredits((m.stats as StatDoc[]).filter(isGameStat)));
    }
    return map;
});
const derivedKills = computed(() => mergeCredits([...creditsByCode.value.values()]).kills);

// --- KPIs ---
const kpiSideOut = computed(() => sideOutStats(pointEnders.value));
const kpiBreak = computed(() => breakStats(pointEnders.value));
const kpiReception = computed(() => receptionTotals(gameStats.value));
const kpiReceptionMark = computed(() =>
    kpiReception.value.total > 0 ? (kpiReception.value.sum / kpiReception.value.total).toFixed(1) : "—"
);
// Retrofit fase 2a: la eficiencia FIVB pasa a contar kills con `isKill`
// (incluye los derivados de la captura en cancha, ver A).
const kpiAttack = computed(() => attackTotals(gameStats.value, derivedKills.value));
const kpiAttackEff = computed(() => attackEfficiency(kpiAttack.value));
const kpiUnforced = computed(() => unforcedShare(pointEnders.value));

// --- por área ---
const areaRows = computed(() => areaTotals(gameStats.value));

// "Datos absolutos" en la app son 6 pies (serve/receive/block/dig/set/attack)
// con total/ganados/errores, no una tabla — reutiliza `areaRows` (misma
// fórmula, sin tocarla) y solo cambia cómo se presenta. Áreas extra 7-9
// (ajuste/free/downhit) se muestran como pies adicionales solo si el equipo
// tiene datos ahí (la tabla original de faltas/ajuste no era parte del
// formato de la app).
const AREA_DONUT_COLORS = ["#CBFB45", "#F87171", "rgba(148,163,184,0.35)"];
const AREA_DONUT_DEFS = [
    { area: 4, labelKey: "stats.areas.serve" },
    { area: 0, labelKey: "stats.areas.reception" },
    { area: 1, labelKey: "stats.areas.block" },
    { area: 2, labelKey: "stats.areas.defense" },
    { area: 3, labelKey: "stats.areas.setting" },
    { area: 5, labelKey: "stats.areas.attack" },
] as const;
const EXTRA_AREA_DONUT_DEFS = [
    { area: 7, labelKey: "stats.areas.adjust" },
    { area: 8, labelKey: "stats.areas.freeball" },
    { area: 9, labelKey: "stats.areas.downhit" },
] as const;

function areaDonut(def: { area: number; labelKey: string }) {
    const row = areaRows.value.find((r) => r.area === def.area);
    const total = row?.total ?? 0;
    const won = row?.won ?? 0;
    const errors = row?.errors ?? 0;
    const other = Math.max(total - won - errors, 0);
    return {
        area: def.area,
        label: t(def.labelKey),
        total,
        series: [won, errors, other],
        chartOptions: <ApexOptions>{
            chart: { type: "donut", background: "transparent" },
            labels: [t("team.colWon"), t("team.colErrors"), t("team.colOther")],
            colors: AREA_DONUT_COLORS,
            legend: { labels: { colors: "#cbd5e1" }, position: "bottom", fontSize: "11px" },
            dataLabels: { enabled: total > 0, formatter: (val: number) => Math.round(val) + "%" },
            tooltip: { theme: "dark" },
        },
    };
}
const areaDonuts = computed(() => AREA_DONUT_DEFS.map(areaDonut).filter((d) => d.total > 0));
const extraAreaDonuts = computed(() => EXTRA_AREA_DONUT_DEFS.map(areaDonut).filter((d) => d.total > 0));

// --- B/C: radar de equipo y por jugadora -----------------------------------
const RADAR_AXIS_ORDER = ["attack", "serve", "block", "dig", "receive"] as const;
const radarAxisLabels = computed(() =>
    RADAR_AXIS_ORDER.map((k) => t(`team.radar${k.charAt(0).toUpperCase()}${k.slice(1)}`))
);
const radarChartOptions = (color: string): ApexOptions => ({
    chart: { type: "radar", toolbar: { show: false }, background: "transparent" },
    xaxis: { categories: radarAxisLabels.value, labels: { style: { colors: Array(5).fill("#94a3b8"), fontSize: "11px" } } },
    yaxis: { show: false, min: 0, max: 100 },
    plotOptions: { radar: { polygons: { strokeColors: "rgba(255,255,255,0.08)", connectorColors: "rgba(255,255,255,0.08)" } } },
    colors: [color],
    markers: { size: 3, colors: [color], strokeColors: color },
    stroke: { width: 2, colors: [color] },
    fill: { opacity: 0.25 },
    tooltip: { theme: "dark" },
});

const radarTeam = computed(() => radarAxes(gameStats.value, TEAM_RADAR_FILTERS));
const radarTeamChart = computed(() => ({
    series: [{ name: t("team.radarTitle"), data: RADAR_AXIS_ORDER.map((k) => radarTeam.value[k]) }],
    chartOptions: radarChartOptions("#6E93FF"),
}));

const rosterPlayers = computed(() => {
    const names = new Map<string, string>();
    for (const s of gameStats.value) {
        if (isRival(s)) continue;
        const id = String(s.player?.id ?? "");
        if (id && !names.has(id)) names.set(id, s.player?.name || id);
    }
    return [...names.entries()]
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name));
});
const selectedPlayerId = ref<string | null>(null);
const currentPlayerId = computed(() => selectedPlayerId.value ?? rosterPlayers.value[0]?.id ?? "");
const radarPlayer = computed(() =>
    currentPlayerId.value ? radarAxes(gameStats.value, playerRadarFilters(currentPlayerId.value)) : { attack: 0, serve: 0, block: 0, dig: 0, receive: 0 }
);
const radarPlayerChart = computed(() => ({
    series: [
        {
            name: rosterPlayers.value.find((p) => p.id === currentPlayerId.value)?.name ?? "",
            data: RADAR_AXIS_ORDER.map((k) => radarPlayer.value[k]),
        },
    ],
    chartOptions: radarChartOptions("#CBFB45"),
}));

// --- D/E/F: rotaciones 360, ataque por fase/nota/técnica y colocadora →
// atacante viven en <Rotations360Section> (src/components/stats/). Solo se
// calcula aquí lo que es específico del ámbito "equipo" (fusión entre
// partidos de las notas de recepción, ver comentario de la función): el
// resto de datos que necesita el componente (rotationCount, derivedKills)
// ya están disponibles como `gameStats`/`derivedKills` más arriba.
const receptionGradeBuckets = computed(() => {
    const perMatch = loadedMatches.value.map((m) =>
        attackByReceptionGradeForMatch((m.stats as StatDoc[]).filter(isGameStat), creditsByCode.value.get(m.code)?.kills ?? new Set())
    );
    return mergeGradeBuckets(perMatch);
});

// --- G/H: tablas por destreza y direcciones de equipo viven en
// <SkillTablesSection>/<DirectionsSection> (src/components/stats/) — ambas
// solo necesitan `gameStats`/`allStats`, ya calculados arriba.

// --- histórico por partido ---
const chronologicalLoaded = computed(() => [...loadedMatches.value].sort((a, b) => a.date - b.date));
const matchLabels = computed(() => chronologicalLoaded.value.map((m) => m.opponent || "?"));

const serveHistory = computed(() => {
    const aces: number[] = [];
    const errors: number[] = [];
    for (const m of chronologicalLoaded.value) {
        const own = m.stats.filter((s) => !isRival(s));
        aces.push(own.filter((s) => aid(s) === "8").length);
        errors.push(own.filter((s) => SERVE_ERR_IDS.includes(aid(s))).length);
    }
    return { aces, errors };
});
const receptionHistory = computed(() => {
    const perfect: number[] = [];
    const good: number[] = [];
    const bad: number[] = [];
    const errors: number[] = [];
    for (const m of chronologicalLoaded.value) {
        const r = receptionTotals(m.stats);
        perfect.push(r.perfect);
        good.push(r.good);
        bad.push(r.bad);
        errors.push(r.errors);
    }
    return { perfect, good, bad, errors };
});
const attackHistory = computed(() => {
    const kills: number[] = [];
    const errors: number[] = [];
    for (const m of chronologicalLoaded.value) {
        const t = attackTotals(m.stats, creditsByCode.value.get(m.code)?.kills ?? new Set());
        kills.push(t.kills);
        errors.push(t.errors);
    }
    return { kills, errors };
});

const lineChartBase = (): ApexOptions => ({
    chart: { type: "line", toolbar: { show: false }, zoom: { enabled: false } },
    grid: { borderColor: "rgba(255,255,255,0.06)", padding: { left: 8, right: 8 } },
    stroke: { curve: "smooth", width: 2 },
    dataLabels: { enabled: false },
    xaxis: {
        categories: matchLabels.value,
        labels: { style: { colors: "#94a3b8", fontSize: "10px" } },
        axisBorder: { show: false },
        axisTicks: { show: false },
    },
    yaxis: { labels: { style: { colors: "#94a3b8" } } },
    legend: { labels: { colors: "#cbd5e1" } },
    tooltip: { theme: "dark" },
});

const serveChart = computed(() => ({
    series: [
        { name: t("team.serveAces"), data: serveHistory.value.aces },
        { name: t("team.serveErrors"), data: serveHistory.value.errors },
    ],
    chartOptions: <ApexOptions>{ ...lineChartBase(), colors: ["#CBFB45", "#F87171"] },
}));

const receptionChart = computed(() => ({
    series: [
        { name: t("stats.recGrade3"), data: receptionHistory.value.perfect },
        { name: t("stats.recGrade2"), data: receptionHistory.value.good },
        { name: t("stats.recGrade1"), data: receptionHistory.value.bad },
        { name: t("stats.recGrade0"), data: receptionHistory.value.errors },
    ],
    chartOptions: <ApexOptions>{ ...lineChartBase(), colors: ["#CBFB45", "#6E93FF", "#94a3b8", "#F87171"] },
}));

const attackChart = computed(() => ({
    series: [
        { name: t("team.attackKills"), data: attackHistory.value.kills },
        { name: t("team.attackErrors"), data: attackHistory.value.errors },
    ],
    chartOptions: <ApexOptions>{ ...lineChartBase(), colors: ["#6E93FF", "#F87171"] },
}));
</script>
