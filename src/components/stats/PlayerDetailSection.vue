<template>
    <EmptyState
        v-if="rosterPlayers.length === 0"
        :title="$t('players.emptyTitle')"
        :message="$t('players.emptyMessage')"
    />

    <template v-else>
        <!-- ============ SELECTOR GLOBAL (gobierna todo lo de abajo) ============ -->
        <article class="card w-full p-4">
            <p class="text-sm font-semibold mb-3">{{ $t('players.rosterTitle') }}</p>
            <div class="flex items-center gap-2 overflow-x-auto pb-1">
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
        </article>

        <!-- ============ DE UN VISTAZO ============ -->
        <article class="card w-full p-4">
            <p class="text-sm font-semibold mb-3">{{ $t('players.overviewTitle') }}</p>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div class="rounded-lg bg-white/[0.04] border border-white/10 py-3 text-center">
                    <p class="text-lg font-display font-bold text-brand-300">{{ kpiPoints }}</p>
                    <p class="text-[11px] text-slate-400 mt-1">{{ $t('players.kpiPoints') }}</p>
                </div>
                <div class="rounded-lg bg-white/[0.04] border border-white/10 py-3 text-center">
                    <p class="text-lg font-display font-bold" :class="kpiAttack.attempts ? effColor(kpiAttackEff) : 'text-slate-500'">
                        {{ kpiAttack.attempts ? kpiAttackKillPct : '—' }}
                    </p>
                    <p class="text-[11px] text-slate-400 leading-4 mt-1">
                        {{ $t('players.kpiAttack') }}<br v-if="kpiAttack.attempts" />{{ kpiAttack.attempts ? $t('stats.effShort', { eff: kpiAttackEff }) : '' }}
                    </p>
                </div>
                <div class="rounded-lg bg-white/[0.04] border border-white/10 py-3 text-center">
                    <p class="text-lg font-display font-bold text-slate-200">{{ kpiReception.total ? kpiReceptionMark : '—' }}</p>
                    <p class="text-[11px] text-slate-400 mt-1">{{ $t('players.kpiReception') }}</p>
                </div>
                <div class="rounded-lg bg-white/[0.04] border border-white/10 py-3 text-center">
                    <p class="text-lg font-display font-bold" :class="kpiServeTotal ? markColor(kpiServeMark) : 'text-slate-500'">
                        {{ kpiServeTotal ? kpiServeMark : '—' }}
                    </p>
                    <p class="text-[11px] text-slate-400 mt-1">{{ $t('players.kpiServe') }}</p>
                </div>
                <div class="rounded-lg bg-white/[0.04] border border-white/10 py-3 text-center">
                    <p class="text-lg font-display font-bold" :class="kpiUnforced > 0 ? 'text-red-400' : 'text-slate-200'">{{ kpiUnforced }}</p>
                    <p class="text-[11px] text-slate-400 mt-1">{{ $t('players.kpiUnforced') }}</p>
                </div>
            </div>
        </article>

        <!-- ============ RADAR 0-100 ============ -->
        <article class="card w-full p-4">
            <p class="text-sm font-semibold mb-3">{{ $t('players.radarTitle', { name: currentPlayer?.name ?? '' }) }}</p>
            <VueApexCharts type="radar" height="280" :options="radarChart.chartOptions" :series="radarChart.series" />
        </article>

        <!-- ============ ATAQUE ============ -->
        <article v-if="attackPhases.some((p) => p.attempts > 0) || techniqueRows.length || receptionGradeRows.length" class="card w-full p-4">
            <p class="text-sm font-semibold mb-3">{{ $t('players.attackTitle') }}</p>
            <div v-if="attackPhases.some((p) => p.attempts > 0)" class="grid grid-cols-2 gap-2 mb-4">
                <div v-for="ph in attackPhases" :key="ph.label" class="text-center rounded-xl bg-white/[0.04] border border-white/10 py-3">
                    <p class="text-2xl font-display font-bold" :class="ph.color">{{ ph.killPct }}</p>
                    <p class="text-xs text-slate-400 leading-4 mt-1">
                        {{ ph.label }}<br />{{ ph.kills }}/{{ ph.attempts }} · {{ $t('stats.effShort', { eff: ph.eff }) }}
                    </p>
                </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div v-if="techniqueRows.length">
                    <p class="text-xs text-slate-400 mb-1 text-center">{{ $t('team.technique') }}</p>
                    <VueApexCharts type="donut" height="220" :options="techniqueChart.chartOptions" :series="techniqueChart.series" />
                </div>
                <div v-if="receptionGradeRows.length">
                    <p class="text-xs text-slate-400 mb-1 text-center">{{ $t('stats.attackByReception') }}</p>
                    <VueApexCharts type="donut" height="220" :options="receptionGradeChart.chartOptions" :series="receptionGradeChart.series" />
                </div>
            </div>
        </article>

        <!-- ============ SAQUE ============ -->
        <article v-if="kpiServeTotal" class="card w-full p-4">
            <p class="text-sm font-semibold mb-3">{{ $t('stats.areas.serve') }}</p>
            <VueApexCharts type="donut" height="220" :options="serveDistChart.chartOptions" :series="serveDistChart.series" />
            <p class="text-xs text-slate-400 text-center mt-2">
                {{ $t('team.colWonServing') }}: <span class="font-semibold text-slate-200">{{ wonServing }}</span>
            </p>
        </article>

        <!-- ============ RECEPCIÓN ============ -->
        <article v-if="kpiReception.total" class="card w-full p-4">
            <p class="text-sm font-semibold mb-3">{{ $t('stats.areas.reception') }}</p>
            <VueApexCharts type="donut" height="220" :options="receptionDistChart.chartOptions" :series="receptionDistChart.series" />
        </article>

        <!-- ============ OTRAS ÁREAS ============ -->
        <article v-if="otherAreaRows.length" class="card w-full p-4">
            <p class="text-sm font-semibold mb-3">{{ $t('players.otherAreasTitle') }}</p>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div v-for="row in otherAreaRows" :key="row.area" class="rounded-lg bg-white/[0.04] border border-white/10 p-3 text-center">
                    <p class="text-xs text-slate-400 mb-1">{{ row.label }}</p>
                    <p class="text-sm font-display font-bold text-slate-200">{{ row.total }}</p>
                    <p class="text-[11px] text-slate-500 mt-1">
                        {{ row.won }} {{ $t('team.colWon') }} · <span class="text-red-400">{{ row.errors }} {{ $t('team.colErrors') }}</span>
                    </p>
                </div>
            </div>
        </article>

        <!-- ============ DIRECCIONES ============ -->
        <article v-if="hasAnyDirectionData" class="card w-full p-4">
            <p class="text-sm font-semibold mb-3">{{ $t('players.directionsTitle') }}</p>
            <div class="flex items-center gap-1.5 mb-3">
                <button
                    v-for="f in DIRECTION_FAMILIES"
                    :key="f.key"
                    class="shrink-0 rounded-full px-3 py-1.5 text-xs border transition-colors"
                    :class="directionsFamily === f.key
                        ? 'bg-white text-slate-900 border-white font-semibold'
                        : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/30'"
                    @click="directionsFamily = f.key"
                >
                    {{ $t(f.labelKey) }}
                </button>
            </div>
            <CourtMap :stats="playerStats" :rival="false" :action-ids="directionsIds" />
        </article>

        <!-- ============ PUNTOS POR SET ============ -->
        <article v-if="showPointsBySet && pointsBySet.some((x) => x > 0)" class="card w-full p-4">
            <p class="text-sm font-semibold mb-2">{{ $t('players.pointsPerSet') }}</p>
            <div class="flex gap-2">
                <div v-for="(pts, i) in pointsBySet" :key="i" class="flex-1 text-center rounded-md bg-white/[0.04] py-1.5">
                    <p class="font-display font-bold text-sm" :class="pts > 0 ? 'text-brand-300' : 'text-slate-500'">{{ pts }}</p>
                    <p class="text-[10px] text-slate-500">S{{ i + 1 }}</p>
                </div>
            </div>
        </article>
    </template>
</template>

<script lang="ts" setup>
// Tab "Por jugadora", análoga a la vista de jugadora de las apps (PlayerView):
// selector global de jugadora por chips que gobierna TODOS los bloques de
// abajo (radar, ataque, saque/recepción, otras áreas, direcciones, puntos por
// set) — ningún bloque tiene su propio selector. Compartido entre el partido
// (GeneralStats.vue) y el equipo (TeamMatches.vue), mismo patrón de props
// scope-agnósticas que Rotations360Section/DirectionsSection/SkillTablesSection.
//
// `stats` es la secuencia de stats de JUEGO (ya filtrada con `isGameStat`) del
// ámbito seleccionado (set/partido completo, o partidos de equipo
// concatenados). `allStats` es la secuencia CRUDA del mismo ámbito (solo se
// usa para "puntos ganados sacando", universo `to === 1` sin restringir a
// juego, como en `serveSkillTable`) — si no se pasa, cae a `stats`.
// `derivedKills`/`derivedAces`/`creditedBy` son el resultado de
// `deriveCredits`/`mergeCredits` calculado una sola vez en el padre (el motor
// de captura en cancha, ver volleyStats.ts). `creditedBy` es necesaria para
// atribuir a la jugadora real los puntos que quedaron registrados como error
// del sentinel rival (mismo patrón que `topScorers` en GeneralStats.vue).
//
// El bloque "ataque según nota de recepción" necesita recorrer la secuencia
// COMPLETA del equipo en orden (el puntero de última recepción avanza con
// CUALQUIER compañera) filtrando solo las SWINGS de la atacante seleccionada
// — para un único partido/set basta pasar `stats` tal cual (ya es una
// secuencia ordenada de un solo partido); el scope de equipo (varios
// partidos) debe pasar `matchGroups`, un array con la secuencia ordenada de
// CADA partido por separado, para no romper el reinicio del puntero entre
// partidos (ver `attackByReceptionGradeForMatch`/`mergeGradeBuckets`).
//
// `nSets`/`set` solo gobiernan el panel "puntos por set" (con sentido en
// scope partido, ámbito partido completo `set === 0`); se omiten en scope
// equipo.
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import VueApexCharts from "vue3-apexcharts";
import type { ApexOptions } from "apexcharts";
import CourtMap from "../CourtMap.vue";
import EmptyState from "../EmptyState.vue";
import { SERVE_TABLE_IDS } from "../../utils/teamTables";
import {
    ATTACK_IDS,
    SERVE_ERR_IDS,
    SERVE_IDS,
    SERVE_WEIGHTS,
    aid,
    areaTotals,
    attackByReceptionGradeForMatch,
    attackByTechnique,
    attackEfficiency,
    attackPhaseTotals,
    attackTotals,
    isRival,
    isUnforced,
    mergeGradeBuckets,
    pct,
    playerRadarFilters,
    radarAxes,
    receptionMark,
    receptionTotals,
    type AttackTotals,
    type StatDoc,
} from "../../utils/volleyStats";

const props = defineProps<{
    stats: StatDoc[];
    allStats?: StatDoc[];
    derivedKills: Set<StatDoc>;
    derivedAces: Set<StatDoc>;
    creditedBy?: Map<StatDoc, StatDoc>;
    matchGroups?: StatDoc[][];
    nSets?: number;
    set?: number;
}>();

const { t } = useI18n();

// Selección global de jugadora — expuesta como `v-model:player-id` para que
// el padre pueda mantenerla viva entre cambios de pestaña (las pestañas se
// montan con `v-if`, así que un `ref` interno se perdería al volver a esta).
const selectedPlayerId = defineModel<string>("playerId", { default: "" });

const rawStats = computed(() => props.allStats ?? props.stats);
const credited = computed(() => props.creditedBy ?? new Map<StatDoc, StatDoc>());

// Puntos ganados por `playerId` en `list`: propios directos (`to===1`,
// `player.id` propio) más los derivados de captura en cancha (sentinel de
// error rival reatribuido vía `creditedBy` a quien realmente cerró el punto
// — mismo criterio que `topScorers` en GeneralStats.vue).
function pointsForPlayer(list: StatDoc[], playerId: string): number {
    let n = 0;
    for (const s of list) {
        if (s.to !== 1) continue;
        if (!isRival(s)) {
            if (String(s.player?.id ?? "") === playerId) n++;
            continue;
        }
        const credit = credited.value.get(s);
        if (!credit) continue;
        const creditPlayerId = props.derivedAces.has(credit) ? String(credit.server?.id ?? "") : String(credit.player?.id ?? "");
        if (creditPlayerId === playerId) n++;
    }
    return n;
}

// ------------------------------------------------------------------ selector
const rosterNames = computed(() => {
    const names = new Map<string, string>();
    for (const s of props.stats) {
        if (isRival(s)) continue;
        const id = String(s.player?.id ?? "");
        if (id && !names.has(id)) names.set(id, s.player?.name || id);
    }
    return names;
});
const rosterPlayers = computed(() =>
    [...rosterNames.value.entries()]
        .map(([id, name]) => ({ id, name, points: pointsForPlayer(props.stats, id) }))
        .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
);
// Si la jugadora seleccionada deja de existir en este ámbito (p.ej. cambio de
// set/equipo), cae a la de más puntos.
const currentPlayerId = computed(() =>
    rosterPlayers.value.some((p) => p.id === selectedPlayerId.value) ? selectedPlayerId.value : (rosterPlayers.value[0]?.id ?? "")
);
const currentPlayer = computed(() => rosterPlayers.value.find((p) => p.id === currentPlayerId.value));

const playerStats = computed(() => props.stats.filter((s) => String(s.player?.id ?? "") === currentPlayerId.value));
// Saque: filtra por `server.id` (más fiable que `player.id` para esa acción
// concreta, mismo criterio que el radar — ver `playerRadarFilters`).
const playerServeStats = computed(() =>
    props.stats.filter((s) => String(s.server?.id ?? "") === currentPlayerId.value && SERVE_IDS.includes(aid(s)))
);

// ------------------------------------------------------------------ de un vistazo
const kpiPoints = computed(() => pointsForPlayer(props.stats, currentPlayerId.value));
const kpiAttack = computed(() =>
    attackTotals(props.stats, props.derivedKills, (s) => String(s.player?.id ?? "") === currentPlayerId.value)
);
const kpiAttackEff = computed(() => attackEfficiency(kpiAttack.value));
const kpiAttackKillPct = computed(() => pct(kpiAttack.value.kills, kpiAttack.value.attempts));
const kpiReception = computed(() => receptionTotals(playerStats.value));
const kpiReceptionMark = computed(() => receptionMark(kpiReception.value));
const kpiServeTotal = computed(() => playerServeStats.value.length);
const kpiServeMark = computed(() => {
    if (!kpiServeTotal.value) return "0.0";
    let sum = 0;
    for (const s of playerServeStats.value) sum += SERVE_WEIGHTS[aid(s)] ?? 0;
    return (sum / kpiServeTotal.value).toFixed(1);
});
const kpiUnforced = computed(() => playerStats.value.filter(isUnforced).length);

const effColor = (eff: number): string => (eff >= 40 ? "text-volt-400" : eff >= 25 ? "text-brand-300" : "text-slate-200");
const markColor = (mark: string): string => {
    const v = parseFloat(mark);
    return v >= 2 ? "text-green-400" : v >= 1.5 ? "text-yellow-400" : "text-red-400";
};
const killColor = (kills: number, attempts: number): string => {
    if (!attempts) return "text-slate-500";
    const p = kills / attempts;
    return p >= 0.4 ? "text-volt-400" : p >= 0.25 ? "text-yellow-400" : "text-red-400";
};

// "Puntos ganados sacando": universo crudo (`allStats`, sin excluir admin),
// `to === 1`, agrupado por `server.id` — mismo criterio que la columna
// `wonServing` de `serveSkillTable` (teamTables.ts).
const wonServing = computed(() => {
    let n = 0;
    for (const s of rawStats.value) {
        if (s.to === 1 && String(s.server?.id ?? "") === currentPlayerId.value) n++;
    }
    return n;
});

// ------------------------------------------------------------------ radar
const RADAR_AXIS_ORDER = ["attack", "serve", "block", "dig", "receive"] as const;
const radarAxisLabels = computed(() => RADAR_AXIS_ORDER.map((k) => t(`team.radar${k.charAt(0).toUpperCase()}${k.slice(1)}`)));
const radarValues = computed(() =>
    currentPlayerId.value
        ? radarAxes(props.stats, playerRadarFilters(currentPlayerId.value))
        : { attack: 0, serve: 0, block: 0, dig: 0, receive: 0 }
);
const radarChart = computed(() => ({
    series: [{ name: currentPlayer.value?.name ?? "", data: RADAR_AXIS_ORDER.map((k) => radarValues.value[k]) }],
    chartOptions: <ApexOptions>{
        chart: { type: "radar", toolbar: { show: false }, background: "transparent" },
        xaxis: { categories: radarAxisLabels.value, labels: { style: { colors: Array(5).fill("#94a3b8"), fontSize: "11px" } } },
        yaxis: { show: false, min: 0, max: 100 },
        plotOptions: { radar: { polygons: { strokeColors: "rgba(255,255,255,0.08)", connectorColors: "rgba(255,255,255,0.08)" } } },
        colors: ["#CBFB45"],
        markers: { size: 3, colors: ["#CBFB45"], strokeColors: "#CBFB45" },
        stroke: { width: 2, colors: ["#CBFB45"] },
        fill: { opacity: 0.25 },
        tooltip: { theme: "dark" },
    },
}));

// ------------------------------------------------------------------ ataque
const attackPhases = computed(() => {
    const { k1, k2 } = attackPhaseTotals(playerStats.value, props.derivedKills);
    const mk = (label: string, tt: AttackTotals) => ({
        label,
        attempts: tt.attempts,
        kills: tt.kills,
        killPct: pct(tt.kills, tt.attempts),
        eff: attackEfficiency(tt),
        color: killColor(tt.kills, tt.attempts),
    });
    return [mk(t("stats.attackK1"), k1), mk(t("stats.attackK2"), k2)];
});

const TECHNIQUE_LABEL_KEYS: Record<string, string> = {
    spike: "team.techniqueSpike",
    tip: "team.techniqueTip",
    blockout: "team.techniqueBlockout",
    downhit: "team.techniqueDownhit",
};
const TECHNIQUE_COLORS: Record<string, string> = { spike: "#6E93FF", tip: "#CBFB45", blockout: "#F59E0B", downhit: "#94a3b8" };
const techniqueRows = computed(() =>
    attackByTechnique(playerStats.value, props.derivedKills).map((b) => ({
        ...b,
        label: t(TECHNIQUE_LABEL_KEYS[b.key] ?? b.key),
        killPct: pct(b.kills, b.attempts),
    }))
);
const techniqueChart = computed(() => ({
    series: techniqueRows.value.map((r) => r.attempts),
    chartOptions: <ApexOptions>{
        chart: { type: "donut", background: "transparent" },
        labels: techniqueRows.value.map((r) => r.label),
        colors: techniqueRows.value.map((r) => TECHNIQUE_COLORS[r.key] ?? "#94a3b8"),
        legend: { labels: { colors: "#cbd5e1" }, position: "bottom" },
        dataLabels: { enabled: true, formatter: (val: number) => Math.round(val) + "%" },
        tooltip: {
            theme: "dark",
            y: { formatter: (val: number, opts: { seriesIndex: number }) => `${val} · ${techniqueRows.value[opts.seriesIndex]?.killPct ?? ""} kill` },
        },
    },
}));

// Ataque según la nota de la recepción previa: puntero sobre la secuencia
// COMPLETA del equipo, filtrando solo las swings de la jugadora seleccionada
// (ver comentario de cabecera).
const attackByGradeBuckets = computed(() => {
    const filter = (s: StatDoc) => String(s.player?.id ?? "") === currentPlayerId.value;
    if (props.matchGroups) {
        return mergeGradeBuckets(props.matchGroups.map((g) => attackByReceptionGradeForMatch(g, props.derivedKills, filter)));
    }
    return attackByReceptionGradeForMatch(props.stats, props.derivedKills, filter);
});
const GRADE_COLORS: Record<number, string> = { 3: "#CBFB45", 2: "#6E93FF", 1: "#94a3b8", 0: "#F87171" };
const receptionGradeRows = computed(() =>
    [3, 2, 1, 0]
        .filter((g) => (attackByGradeBuckets.value.get(g)?.attempts ?? 0) > 0)
        .map((g) => {
            const b = attackByGradeBuckets.value.get(g)!;
            return { grade: g, label: t(`stats.recGrade${g}`), attempts: b.attempts, kills: b.kills, killPct: pct(b.kills, b.attempts) };
        })
);
const receptionGradeChart = computed(() => ({
    series: receptionGradeRows.value.map((r) => r.attempts),
    chartOptions: <ApexOptions>{
        chart: { type: "donut", background: "transparent" },
        labels: receptionGradeRows.value.map((r) => r.label),
        colors: receptionGradeRows.value.map((r) => GRADE_COLORS[r.grade]),
        legend: { labels: { colors: "#cbd5e1" }, position: "bottom" },
        dataLabels: { enabled: true, formatter: (val: number) => Math.round(val) + "%" },
        tooltip: {
            theme: "dark",
            y: { formatter: (val: number, opts: { seriesIndex: number }) => `${val} · ${receptionGradeRows.value[opts.seriesIndex]?.killPct ?? ""} kill` },
        },
    },
}));

// ------------------------------------------------------------------ saque / recepción
const serveDistribution = computed(() =>
    [
        { label: t("stats.actions.a8"), n: playerServeStats.value.filter((s) => aid(s) === "8").length, color: "#4ade80" },
        { label: t("team.col3"), n: playerServeStats.value.filter((s) => aid(s) === "41").length, color: "#CBFB45" },
        { label: t("team.col2"), n: playerServeStats.value.filter((s) => aid(s) === "40").length, color: "#6E93FF" },
        { label: t("team.col1"), n: playerServeStats.value.filter((s) => aid(s) === "39").length, color: "#94a3b8" },
        { label: t("team.colErrors"), n: playerServeStats.value.filter((s) => SERVE_ERR_IDS.includes(aid(s))).length, color: "#F87171" },
    ].filter((r) => r.n > 0)
);
const serveDistChart = computed(() => ({
    series: serveDistribution.value.map((r) => r.n),
    chartOptions: <ApexOptions>{
        chart: { type: "donut", background: "transparent" },
        labels: serveDistribution.value.map((r) => r.label),
        colors: serveDistribution.value.map((r) => r.color),
        legend: { labels: { colors: "#cbd5e1" }, position: "bottom" },
        dataLabels: { enabled: true, formatter: (val: number) => Math.round(val) + "%" },
        tooltip: { theme: "dark" },
    },
}));

const receptionDistribution = computed(() =>
    [
        { label: t("stats.recGrade3"), n: kpiReception.value.perfect, color: "#CBFB45" },
        { label: t("stats.recGrade2"), n: kpiReception.value.good, color: "#6E93FF" },
        { label: t("stats.recGrade1"), n: kpiReception.value.bad, color: "#94a3b8" },
        { label: t("stats.recGrade0"), n: kpiReception.value.errors, color: "#F87171" },
    ].filter((r) => r.n > 0)
);
const receptionDistChart = computed(() => ({
    series: receptionDistribution.value.map((r) => r.n),
    chartOptions: <ApexOptions>{
        chart: { type: "donut", background: "transparent" },
        labels: receptionDistribution.value.map((r) => r.label),
        colors: receptionDistribution.value.map((r) => r.color),
        legend: { labels: { colors: "#cbd5e1" }, position: "bottom" },
        dataLabels: { enabled: true, formatter: (val: number) => Math.round(val) + "%" },
        tooltip: { theme: "dark" },
    },
}));

// ------------------------------------------------------------------ otras áreas
const OTHER_AREA_DEFS = [
    { area: 1, labelKey: "stats.areas.block" },
    { area: 2, labelKey: "stats.areas.defense" },
    { area: 3, labelKey: "stats.areas.setting" },
    { area: 8, labelKey: "stats.areas.freeball" },
] as const;
const otherAreaRows = computed(() => {
    const rows = areaTotals(playerStats.value);
    return OTHER_AREA_DEFS.map((def) => {
        const row = rows.find((r) => r.area === def.area);
        return { area: def.area, label: t(def.labelKey), total: row?.total ?? 0, won: row?.won ?? 0, errors: row?.errors ?? 0 };
    }).filter((r) => r.total > 0);
});

// ------------------------------------------------------------------ direcciones
const DIRECTION_FAMILIES = [
    { key: "attack", labelKey: "stats.areas.attack" },
    { key: "serve", labelKey: "stats.areas.serve" },
] as const;
type DirectionFamily = (typeof DIRECTION_FAMILIES)[number]["key"];
const directionsFamily = ref<DirectionFamily>("attack");
const directionsIds = computed(() => (directionsFamily.value === "serve" ? SERVE_TABLE_IDS : ATTACK_IDS));
const hasAnyDirectionData = computed(() =>
    playerStats.value.some(
        (s) => (ATTACK_IDS.includes(aid(s)) || SERVE_TABLE_IDS.includes(aid(s))) && typeof s.direction === "string" && s.direction.includes("#")
    )
);

// ------------------------------------------------------------------ puntos por set
const showPointsBySet = computed(() => !!props.nSets && props.nSets > 1 && props.set === 0);
const pointsBySet = computed(() =>
    Array.from({ length: props.nSets ?? 0 }, (_, i) => pointsForPlayer(props.stats.filter((s) => s.set?.number == i + 1), currentPlayerId.value))
);
</script>
