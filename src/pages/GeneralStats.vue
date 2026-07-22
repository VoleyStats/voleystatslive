<template>
    <!-- Partido no encontrado -->
    <EmptyState
        v-if="notFound"
        :title="$t('stats.notFoundTitle')"
        :message="$t('stats.notFoundMessage')"
    />

    <section v-else class="min-h-screen px-4 pb-24 flex flex-col gap-4 items-center max-w-3xl mx-auto">
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
            <!-- ============ EN VIVO: RACHA ============ -->
            <article v-if="!matchOver" class="card w-full p-3 flex items-center justify-center gap-3">
                <p class="text-2xl font-display font-bold" :class="streak.ours ? 'text-volt-400' : 'text-red-400'">
                    {{ streak.count }}
                </p>
                <p class="text-sm text-slate-400">
                    {{ $t('stats.streak', { team: streak.ours ? usName : themName }) }}
                </p>
            </article>

            <!-- ============ POST-PARTIDO: FASES + JUGADORAS ============ -->
            <section v-if="matchOver" class="w-full grid grid-cols-2 gap-2">
                <article class="card p-3 text-center">
                    <p class="text-2xl font-display font-bold text-brand-300">{{ pct(sideOut.won, sideOut.total) }}</p>
                    <p class="text-xs text-slate-400 leading-4 mt-1">{{ $t('stats.sideOut') }}<br />{{ sideOut.won }}/{{ sideOut.total }}</p>
                </article>
                <article class="card p-3 text-center">
                    <p class="text-2xl font-display font-bold text-brand-300">{{ pct(breakPts.won, breakPts.total) }}</p>
                    <p class="text-xs text-slate-400 leading-4 mt-1">{{ $t('stats.break') }}<br />{{ breakPts.won }}/{{ breakPts.total }}</p>
                </article>
            </section>
            <RouterLink
                v-if="matchOver"
                :to="{ name: 'players', params: { id: props.id } }"
                class="card w-full p-4 flex items-center gap-3 hover:border-brand-500/40 transition-colors"
            >
                <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300">
                    <i class="bi bi-people-fill"></i>
                </span>
                <span class="flex-1">
                    <span class="block font-semibold">{{ $t('stats.playersLinkTitle') }}</span>
                    <span class="block text-xs text-slate-400">{{ $t('stats.playersLinkSubtitle') }}</span>
                </span>
                <i class="bi bi-chevron-right text-slate-500"></i>
            </RouterLink>

            <!-- ============ PUNTO A PUNTO ============ -->
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

            <!-- ============ MOMENTUM ============ -->
            <article class="card w-full p-4">
                <p class="text-sm font-semibold mb-1">{{ $t('stats.momentum') }}</p>
                <p class="text-xs text-slate-500 mb-2">{{ $t('stats.momentumSubtitle') }}</p>
                <VueApexCharts type="bar" height="220" :options="momentum.chartOptions" :series="momentum.series" />
            </article>

            <!-- ============ ORIGEN DE LOS PUNTOS (post-partido) ============ -->
            <article v-if="matchOver" class="card w-full p-4">
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

            <!-- ============ ATAQUE POR FASE Y POR RECEPCIÓN (post-partido) ============ -->
            <article v-if="matchOver && (attackPhases[0].attempts > 0 || attackPhases[1].attempts > 0)" class="card w-full p-4">
                <p class="text-sm font-semibold mb-3">{{ $t('stats.attackByPhase') }}</p>
                <div class="grid grid-cols-2 gap-2">
                    <div v-for="ph in attackPhases" :key="ph.label" class="text-center rounded-xl bg-white/[0.04] border border-white/10 py-3">
                        <p class="text-2xl font-display font-bold" :class="ph.color">{{ ph.killPct }}</p>
                        <p class="text-xs text-slate-400 leading-4 mt-1">
                            {{ ph.label }}<br />{{ ph.kills }}/{{ ph.attempts }} · {{ $t('stats.effShort', { eff: ph.eff }) }}
                        </p>
                    </div>
                </div>
                <div v-if="attackByReception.length" class="mt-4 border-t border-white/10 pt-3">
                    <p class="text-xs text-slate-500 mb-2">{{ $t('stats.attackByReception') }}</p>
                    <div class="grid grid-cols-[1fr_auto_auto_auto] gap-y-1.5 text-sm items-center">
                        <span></span>
                        <span class="w-16 text-center text-xs text-slate-400">{{ $t('stats.colKillsAtt') }}</span>
                        <span class="w-14 text-center text-xs text-slate-400">{{ $t('stats.colKillPct') }}</span>
                        <span class="w-14 text-center text-xs text-slate-400">{{ $t('stats.colEff') }}</span>
                        <template v-for="row in attackByReception" :key="row.grade">
                            <span class="text-slate-300 py-1">{{ row.label }}</span>
                            <span class="w-16 text-center py-1">{{ row.kills }}/{{ row.attempts }}</span>
                            <span class="w-14 text-center py-1 font-semibold" :class="row.color">{{ row.killPct }}</span>
                            <span class="w-14 text-center py-1">{{ row.eff }}%</span>
                        </template>
                    </div>
                </div>
            </article>

            <!-- ============ PUNTOS POR JUGADORA ============ -->
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

            <!-- ============ CONEXIONES COLOCADORA → ATACANTE (post-partido) ============ -->
            <article v-if="matchOver && setterConnections.length" class="card w-full p-4">
                <p class="text-sm font-semibold mb-3">{{ $t('stats.setterConnections') }}</p>
                <div class="grid grid-cols-[1fr_auto_auto] gap-y-1.5 text-sm items-center">
                    <span></span>
                    <span class="w-16 text-center text-xs text-slate-400">{{ $t('stats.colKillsAtt') }}</span>
                    <span class="w-14 text-center text-xs text-slate-400">{{ $t('stats.colKillPct') }}</span>
                    <template v-for="c in setterConnections" :key="c.key">
                        <span class="text-slate-300 py-1 truncate">{{ c.setter }} → {{ c.attacker }}</span>
                        <span class="w-16 text-center py-1">{{ c.kills }}/{{ c.attempts }}</span>
                        <span class="w-14 text-center py-1 font-semibold" :class="c.color">{{ c.killPct }}</span>
                    </template>
                </div>
            </article>

            <!-- ============ COMPARATIVA ENTRE SETS (post-partido) ============ -->
            <article v-if="matchOver && setsComparison.length > 1" class="card w-full p-4">
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

            <!-- ============ RENDIMIENTO POR ROTACIÓN (post-partido) ============ -->
            <article v-if="matchOver && rotationRows.length" class="card w-full p-4">
                <p class="text-sm font-semibold mb-3">{{ $t('stats.rotations') }}</p>
                <div class="grid grid-cols-[auto_1fr_1fr] gap-y-1.5 text-sm items-center">
                    <span></span>
                    <span class="text-center text-xs text-slate-400">{{ $t('stats.colSideOut') }}</span>
                    <span class="text-center text-xs text-slate-400">{{ $t('stats.colBreak') }}</span>
                    <template v-for="row in rotationRows" :key="row.n">
                        <span class="pr-3 font-semibold text-slate-300">R{{ row.n }}</span>
                        <span class="text-center" :class="row.sideOut.color">{{ row.sideOut.text }}</span>
                        <span class="text-center" :class="row.breakPts.color">{{ row.breakPts.text }}</span>
                    </template>
                </div>
            </article>

            <!-- ============ CLAVES DEL PARTIDO (post-partido) ============ -->
            <article v-if="matchOver && insights.length" class="card w-full p-4">
                <p class="text-sm font-semibold mb-3">{{ $t('stats.keys') }}</p>
                <ul class="space-y-2">
                    <li v-for="(ins, i) in insights" :key="i" class="flex items-start gap-3 rounded-lg bg-white/[0.03] px-3 py-2 text-sm">
                        <i :class="['bi', ins.icon, 'mt-0.5', ins.color]"></i>
                        <span class="text-slate-300">{{ ins.text }}</span>
                    </li>
                </ul>
            </article>

            <!-- ============ MAPA DE ATAQUE (post-partido, modos C/D) ============ -->
            <article v-if="matchOver && hasDirections" class="card w-full p-4">
                <div class="flex items-center justify-between mb-3">
                    <p class="text-sm font-semibold">{{ $t('stats.attackMap') }}</p>
                    <div class="flex rounded-full border border-white/10 bg-white/[0.04] p-0.5 text-xs">
                        <button
                            class="rounded-full px-3 py-1 transition-colors"
                            :class="!mapRival ? 'bg-white text-slate-900 font-semibold' : 'text-slate-300'"
                            @click="mapRival = false"
                        >{{ usName }}</button>
                        <button
                            class="rounded-full px-3 py-1 transition-colors"
                            :class="mapRival ? 'bg-white text-slate-900 font-semibold' : 'text-slate-300'"
                            @click="mapRival = true"
                        >{{ themName }}</button>
                    </div>
                </div>
                <CourtMap :stats="gameStats" :rival="mapRival" />
            </article>

            <!-- ============ ERRORES POR ÁREA (post-partido) ============ -->
            <article v-if="matchOver" class="card w-full p-4">
                <p class="text-sm font-semibold">{{ $t('stats.errorsByArea') }}</p>
                <VueApexCharts type="bar" height="220" :options="errors.chartOptions" :series="errors.series" />
            </article>
        </template>
    </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import { useDocument } from "vuefire";
// Registro local (no global en main.ts): solo esta página paga por ApexCharts.
import VueApexCharts from "vue3-apexcharts";
import type { ApexOptions } from "apexcharts";

const { t, te } = useI18n();
import CourtMap from "../components/CourtMap.vue";
import EmptyState from "../components/EmptyState.vue";
import { collection, doc, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
import {
    ADMIN_IDS,
    AREA_LABEL_KEYS,
    ATTACK_IDS,
    KILL_IDS,
    aid,
    attackByReceptionGradeForMatch,
    attackEfficiency,
    attackPhaseTotals,
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

// Colores compartidos del informe: % de remate y cuota de errores no forzados.
const killColor = (kills: number, attempts: number): string => {
    if (!attempts) return "text-slate-500";
    const p = kills / attempts;
    return p >= 0.4 ? "text-volt-400" : p >= 0.25 ? "text-yellow-400" : "text-red-400";
};
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
const hasDirections = computed(() => gameStats.value.some((s) => typeof s.direction === "string" && s.direction.includes("#")));
const mapRival = ref(false);
const pointEnders = computed(() => gameStats.value.filter((s) => s.to !== 0));
const lastPoint = computed(() => pointEnders.value.at(-1));

// Motor de kills/aces derivados (captura en cancha) sobre el ámbito
// seleccionado (set o partido completo) — se recalcula si cambia `set`.
const derived = computed(() => deriveCredits(gameStats.value));

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

// ------------------------------------------------------------------ informe: ataque por fase y por recepción
// K1 (side-out): ataques propios con el rival al saque; K2 (break/transición): el resto.
const attackPhases = computed(() => {
    const { k1, k2 } = attackPhaseTotals(gameStats.value, derived.value.kills);
    return [
        { label: t("stats.attackK1"), ...k1 },
        { label: t("stats.attackK2"), ...k2 },
    ].map((ph) => ({
        ...ph,
        killPct: pct(ph.kills, ph.attempts),
        eff: attackEfficiency(ph),
        color: killColor(ph.kills, ph.attempts),
    }));
});

// Ataque según la nota de la recepción previa (helper compartido: recorre el
// ámbito en orden, reiniciando entre sets y al cerrarse cada punto, y cuenta
// kills con `isKill` — incluye los derivados de captura en cancha).
const attackByReception = computed(() => {
    const buckets = attackByReceptionGradeForMatch(gameStats.value, derived.value.kills);
    return [3, 2, 1, 0]
        .filter((g) => (buckets.get(g)?.attempts ?? 0) > 0)
        .map((g) => {
            const b = buckets.get(g)!;
            return {
                grade: g,
                label: t(`stats.recGrade${g}`),
                kills: b.kills,
                attempts: b.attempts,
                killPct: pct(b.kills, b.attempts),
                eff: attackEfficiency(b),
                color: killColor(b.kills, b.attempts),
            };
        });
});

// ------------------------------------------------------------------ informe: rotaciones
// Side-out y break por rotación (rotationCount). Si todas las jugadas caen en
// la misma rotación (o la app no la envió), la tarjeta no aporta nada y se oculta.
const rotationRows = computed(() => {
    const map = new Map<number, { soWon: number; soTotal: number; brWon: number; brTotal: number }>();
    for (const s of pointEnders.value) {
        const r = s.rotationCount;
        if (typeof r !== "number") continue;
        const e = map.get(r) ?? { soWon: 0, soTotal: 0, brWon: 0, brTotal: 0 };
        if (rivalServing(s)) {
            e.soTotal++;
            if (s.to === 1) e.soWon++;
        } else {
            e.brTotal++;
            if (s.to === 1) e.brWon++;
        }
        map.set(r, e);
    }
    if (map.size <= 1) return [];
    const cell = (won: number, total: number) =>
        total > 0
            ? {
                  text: `${won}/${total} · ${Math.round((won / total) * 100)}%`,
                  color: won / total >= 0.5 ? "text-volt-400" : won / total >= 0.35 ? "text-yellow-400" : "text-red-400",
              }
            : { text: "—", color: "text-slate-500" };
    return [...map.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([n, e]) => ({ n, sideOut: cell(e.soWon, e.soTotal), breakPts: cell(e.brWon, e.brTotal) }));
});

// ------------------------------------------------------------------ informe: conexiones colocadora → atacante
const setterConnections = computed(() => {
    const map = new Map<string, { key: string; setter: string; attacker: string; attempts: number; kills: number }>();
    for (const s of gameStats.value) {
        if (isRival(s) || !ATTACK_IDS.includes(aid(s)) || !s.setter) continue;
        const setterId = String(s.setter?.id ?? "");
        if (setterId === "0" || setterId === String(s.player?.id ?? "")) continue;
        const key = `${setterId}→${String(s.player?.id ?? "")}`;
        const e = map.get(key) ?? {
            key,
            setter: s.setter?.name ?? "",
            attacker: s.player?.name ?? "",
            attempts: 0,
            kills: 0,
        };
        e.attempts++;
        if (KILL_IDS.includes(aid(s))) e.kills++;
        map.set(key, e);
    }
    return [...map.values()]
        .filter((e) => e.attempts >= 3)
        .sort((a, b) => b.attempts - a.attempts)
        .slice(0, 6)
        .map((e) => ({ ...e, killPct: pct(e.kills, e.attempts), color: killColor(e.kills, e.attempts) }));
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
