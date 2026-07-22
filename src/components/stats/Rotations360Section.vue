<template>
    <article v-if="rotationCells.length" class="card w-full p-4">
        <p class="text-sm font-semibold mb-3">{{ $t('team.rotationsTitle') }}</p>
        <div class="overflow-x-auto">
            <div class="grid grid-cols-[auto_auto_auto_auto_auto_auto_auto_auto] gap-x-1 gap-y-1.5 text-xs items-center min-w-[560px]">
                <span></span>
                <span class="text-center text-slate-400 px-1">{{ $t('team.colSO') }}</span>
                <span class="text-center text-slate-400 px-1">{{ $t('team.colBR') }}</span>
                <span class="text-center text-slate-400 px-1">{{ $t('team.colRec') }}</span>
                <span class="text-center text-slate-400 px-1">{{ $t('team.colKill') }}</span>
                <span class="text-center text-slate-400 px-1">{{ $t('team.colErr') }}</span>
                <span class="text-center text-slate-400 px-1">{{ $t('team.colPts') }}</span>
                <span class="text-center text-slate-400 px-1">{{ $t('team.colDiff') }}</span>
                <template v-for="row in rotationCells" :key="row.n">
                    <span class="font-semibold text-slate-300 px-1">R{{ row.n }}</span>
                    <span class="text-center rounded-md py-1.5" :style="row.so.style">{{ row.so.text }}</span>
                    <span class="text-center rounded-md py-1.5" :style="row.br.style">{{ row.br.text }}</span>
                    <span class="text-center rounded-md py-1.5" :style="row.rec.style">{{ row.rec.text }}</span>
                    <span class="text-center rounded-md py-1.5" :style="row.kill.style">{{ row.kill.text }}</span>
                    <span class="text-center rounded-md py-1.5" :style="row.err.style">{{ row.err.text }}</span>
                    <span class="text-center py-1.5 text-slate-300">{{ row.pts }}</span>
                    <span class="text-center rounded-md py-1.5" :style="row.diff.style">{{ row.diff.text }}</span>
                </template>
                <span class="font-semibold text-slate-400 px-1 pt-2 border-t border-white/10">{{ $t('team.rotationsAverages') }}</span>
                <span class="text-center pt-2 border-t border-white/10 text-slate-300">{{ pct(kpiSideOut.won, kpiSideOut.total) }}</span>
                <span class="text-center pt-2 border-t border-white/10 text-slate-300">{{ pct(kpiBreak.won, kpiBreak.total) }}</span>
                <span class="text-center pt-2 border-t border-white/10 text-slate-300">{{ rotationAverages.rec.toFixed(1) }}</span>
                <span class="text-center pt-2 border-t border-white/10 text-slate-300">{{ Math.round(rotationAverages.kill * 100) }}%</span>
                <span class="text-center pt-2 border-t border-white/10 text-slate-300">{{ Math.round(rotationAverages.err * 100) }}%</span>
                <span class="text-center pt-2 border-t border-white/10 text-slate-300">{{ rotationAverages.rallies }}</span>
                <span class="text-center pt-2 border-t border-white/10 text-slate-500">—</span>
            </div>
        </div>
    </article>

    <article v-if="attackPhases.some((p) => p.attempts > 0)" class="card w-full p-4">
        <p class="text-sm font-semibold mb-3">{{ $t('stats.attackByPhase') }}</p>
        <div class="grid grid-cols-2 gap-2">
            <div v-for="ph in attackPhases" :key="ph.label" class="text-center rounded-xl bg-white/[0.04] border border-white/10 py-3">
                <p class="text-2xl font-display font-bold" :class="ph.color">{{ ph.killPct }}</p>
                <p class="text-xs text-slate-400 leading-4 mt-1">
                    {{ ph.label }}<br />{{ ph.kills }}/{{ ph.attempts }} · {{ $t('stats.effShort', { eff: ph.eff }) }}
                </p>
            </div>
        </div>
    </article>

    <article v-if="receptionGradeRows.length" class="card w-full p-4">
        <p class="text-sm font-semibold mb-3">{{ $t('stats.attackByReception') }}</p>
        <VueApexCharts type="donut" height="240" :options="receptionGradeChart.chartOptions" :series="receptionGradeChart.series" />
    </article>

    <article v-if="techniqueRows.length" class="card w-full p-4">
        <p class="text-sm font-semibold mb-3">{{ $t('team.technique') }}</p>
        <VueApexCharts type="donut" height="240" :options="techniqueChart.chartOptions" :series="techniqueChart.series" />
    </article>

    <article v-if="setterRows.length" class="card w-full p-4">
        <p class="text-sm font-semibold mb-3">{{ $t('stats.setterConnections') }}</p>
        <div class="grid grid-cols-[1fr_auto_auto] gap-y-1.5 text-sm items-center">
            <span></span>
            <span class="w-16 text-center text-xs text-slate-400">{{ $t('team.colRaw') }}</span>
            <span class="w-14 text-center text-xs text-slate-400">{{ $t('stats.colKillPct') }}</span>
            <template v-for="row in setterRows" :key="row.key">
                <span class="text-slate-300 py-1 truncate">{{ row.setter }} → {{ row.attacker }}</span>
                <span class="w-16 text-center py-1">{{ row.kills }}/{{ row.attempts }}</span>
                <span class="w-14 text-center py-1 font-semibold" :class="row.color">{{ row.pct }}</span>
            </template>
        </div>
    </article>
</template>

<script lang="ts" setup>
// Bloque "Rotaciones 360" (heatmap por rotación, K1/K2, donut de recepción,
// donut de técnica y tabla colocadora→atacante) extraído de TeamMatches.vue
// para poder reusarlo también en la vista de un partido/set (GeneralStats.vue,
// tanda 2). Sin cambios de fórmula respecto al original: es un recorte 1:1.
//
// `stats` debe ser la secuencia de stats de JUEGO (ya filtrada con
// `isGameStat`) del ámbito a mostrar — un partido/set o la concatenación de
// varios partidos de un equipo. `derivedKills` es el `Set` de kills/aces
// derivados (`deriveCredits(...).kills` para un solo partido, o
// `mergeCredits([...]).kills` para varios) válido para esa misma `stats`.
//
// `receptionGradeBuckets` (ataque por nota de recepción) NO se calcula aquí:
// `attackByReceptionGradeForMatch` opera sobre la secuencia de UN partido (el
// puntero de "última recepción" se reinicia por partido/set), así que fusionar
// varios partidos es responsabilidad del consumidor (`mergeGradeBuckets` en
// TeamMatches.vue); para un único partido basta pasar el resultado directo de
// `attackByReceptionGradeForMatch(stats, derivedKills)`.
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import VueApexCharts from "vue3-apexcharts";
import type { ApexOptions } from "apexcharts";
import {
    activePlayerIds,
    attackByTechnique,
    attackEfficiency,
    attackPhaseTotals,
    attackTotals,
    breakStats,
    isPointEnder,
    pct,
    receptionTotals,
    rotationBreakdown,
    setterConnections,
    shrinkRate,
    sideOutStats,
    type AttackTotals,
    type GradeBucket,
    type StatDoc,
} from "../../utils/volleyStats";

const props = defineProps<{
    stats: StatDoc[];
    derivedKills: Set<StatDoc>;
    receptionGradeBuckets: Map<number, GradeBucket>;
}>();

const { t } = useI18n();

// --- KPIs base (mismas fórmulas que el tab "General"; se recalculan aquí
// porque las medias de rotación necesitan side-out/break/recepción/ataque
// del mismo ámbito que `stats`). ---
const pointEnders = computed(() => props.stats.filter(isPointEnder));
const kpiSideOut = computed(() => sideOutStats(pointEnders.value));
const kpiBreak = computed(() => breakStats(pointEnders.value));
const kpiReception = computed(() => receptionTotals(props.stats));
const kpiAttack = computed(() => attackTotals(props.stats, props.derivedKills));

// Color compartido de % de remate (mismo criterio que GeneralStats.vue).
const killColor = (kills: number, attempts: number): string => {
    if (!attempts) return "text-slate-500";
    const p = kills / attempts;
    return p >= 0.4 ? "text-volt-400" : p >= 0.25 ? "text-yellow-400" : "text-red-400";
};

// --- D: rotaciones 360 (heatmap) -------------------------------------------
const rotationRows = computed(() => rotationBreakdown(props.stats, props.derivedKills));
const rotationAverages = computed(() => {
    const errSum = rotationRows.value.reduce((a, r) => a + r.ourErrors, 0);
    const ralliesSum = rotationRows.value.reduce((a, r) => a + r.rallies, 0);
    return {
        so: kpiSideOut.value.total ? kpiSideOut.value.won / kpiSideOut.value.total : 0,
        br: kpiBreak.value.total ? kpiBreak.value.won / kpiBreak.value.total : 0,
        rec: kpiReception.value.total ? kpiReception.value.sum / kpiReception.value.total : 0,
        kill: kpiAttack.value.attempts ? kpiAttack.value.kills / kpiAttack.value.attempts : 0,
        err: ralliesSum ? errSum / ralliesSum : 0,
        rallies: ralliesSum,
    };
});

// Desviación de `value` respecto a `mean` normalizada por `spread`, acotada
// a [-1,1]. `invert` voltea el signo (usado en "errores": más = peor).
function heatStyle(value: number, mean: number, spread: number, invert: boolean, hasSample: boolean): Record<string, string> {
    if (!hasSample) return { background: "rgba(148,163,184,0.05)", color: "#64748b" };
    let d = spread > 0 ? (value - mean) / spread : 0;
    if (invert) d = -d;
    d = Math.max(-1, Math.min(1, d));
    const good = d >= 0;
    const intensity = Math.abs(d);
    const rgb = good ? "203,251,69" : "248,113,113";
    return {
        background: `rgba(${rgb},${(0.08 + intensity * 0.32).toFixed(3)})`,
        color: intensity > 0.35 ? (good ? "#CBFB45" : "#F87171") : "#e2e8f0",
    };
}

const rotationCells = computed(() => {
    const avg = rotationAverages.value;
    return rotationRows.value.map((r) => {
        const soRate = r.soTotal ? r.soWon / r.soTotal : 0;
        const brRate = r.brTotal ? r.brWon / r.brTotal : 0;
        const recRate = r.recTotal ? r.recSum / r.recTotal : 0;
        const killRate = r.atkTotal ? r.atkKills / r.atkTotal : 0;
        const errRate = r.rallies ? r.ourErrors / r.rallies : 0;
        return {
            n: r.n,
            so: { text: r.soTotal ? pct(r.soWon, r.soTotal) : "—", style: heatStyle(soRate, avg.so, 0.15, false, r.soTotal > 0) },
            br: { text: r.brTotal ? pct(r.brWon, r.brTotal) : "—", style: heatStyle(brRate, avg.br, 0.15, false, r.brTotal > 0) },
            rec: { text: r.recTotal ? recRate.toFixed(1) : "—", style: heatStyle(recRate, avg.rec, 0.6, false, r.recTotal > 0) },
            kill: { text: r.atkTotal ? pct(r.atkKills, r.atkTotal) : "—", style: heatStyle(killRate, avg.kill, 0.15, false, r.atkTotal > 0) },
            err: {
                text: r.rallies ? `${r.ourErrors} · ${Math.round(errRate * 100)}%` : "—",
                style: heatStyle(errRate, avg.err, 0.1, true, r.rallies > 0),
            },
            pts: r.rallies,
            diff: { text: (r.netDiff > 0 ? "+" : "") + r.netDiff, style: heatStyle(r.netDiff, 0, 6, false, true) },
        };
    });
});

// --- E: ataque por fase K1/K2, por grado de recepción y por técnica --------
const attackPhases = computed(() => {
    const { k1, k2 } = attackPhaseTotals(props.stats, props.derivedKills);
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

const GRADE_COLORS: Record<number, string> = { 3: "#CBFB45", 2: "#6E93FF", 1: "#94a3b8", 0: "#F87171" };
const receptionGradeRows = computed(() =>
    [3, 2, 1, 0]
        .filter((g) => (props.receptionGradeBuckets.get(g)?.attempts ?? 0) > 0)
        .map((g) => {
            const b = props.receptionGradeBuckets.get(g)!;
            return {
                grade: g,
                label: t(`stats.recGrade${g}`),
                attempts: b.attempts,
                kills: b.kills,
                killPct: pct(b.kills, b.attempts),
                eff: attackEfficiency(b),
            };
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
            y: {
                formatter: (val: number, opts: { seriesIndex: number }) =>
                    `${val} · ${receptionGradeRows.value[opts.seriesIndex]?.killPct ?? ""} kill`,
            },
        },
    },
}));

const TECHNIQUE_LABEL_KEYS: Record<string, string> = {
    spike: "team.techniqueSpike",
    tip: "team.techniqueTip",
    blockout: "team.techniqueBlockout",
    downhit: "team.techniqueDownhit",
};
const TECHNIQUE_COLORS: Record<string, string> = { spike: "#6E93FF", tip: "#CBFB45", blockout: "#F59E0B", downhit: "#94a3b8" };
const techniqueRows = computed(() =>
    attackByTechnique(props.stats, props.derivedKills).map((b) => ({
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
            y: {
                formatter: (val: number, opts: { seriesIndex: number }) =>
                    `${val} · ${techniqueRows.value[opts.seriesIndex]?.killPct ?? ""} kill`,
            },
        },
    },
}));

// --- F: colocadora → atacante -----------------------------------------------
const setterRows = computed(() => {
    const activeIds = activePlayerIds(props.stats);
    const qualified = setterConnections(props.stats, props.derivedKills, activeIds).filter((c) => c.attempts >= 6);
    if (!qualified.length) return [];
    const totalKills = qualified.reduce((a, c) => a + c.kills, 0);
    const totalAttempts = qualified.reduce((a, c) => a + c.attempts, 0);
    const base = totalAttempts ? totalKills / totalAttempts : 0;
    const killAvg = kpiAttack.value.attempts ? kpiAttack.value.kills / kpiAttack.value.attempts : 0;
    return [...qualified]
        .sort((a, b) => b.attempts - a.attempts)
        .map((c) => {
            const shrunk = shrinkRate(c.kills, c.attempts, base, 12);
            return {
                key: c.key,
                setter: c.setterName,
                attacker: c.attackerName,
                attempts: c.attempts,
                kills: c.kills,
                pct: Math.round(shrunk * 100) + "%",
                color: shrunk > killAvg + 0.05 ? "text-volt-400" : shrunk < killAvg - 0.05 ? "text-red-400" : "text-slate-200",
            };
        });
});
</script>
