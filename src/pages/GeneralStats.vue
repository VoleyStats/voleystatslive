<template>
    <!-- Partido no encontrado -->
    <EmptyState
        v-if="notFound"
        title="Partido no encontrado"
        message="Revisa el código del partido: debe ser exactamente el que aparece en la app al activar el directo."
    />

    <section v-else class="min-h-screen px-4 pb-24 flex flex-col gap-4 items-center max-w-3xl mx-auto">
        <!-- ============ MARCADOR ============ -->
        <article class="card w-full p-5">
            <div class="flex items-center justify-between mb-3">
                <span v-if="matchOver" class="inline-flex items-center gap-2 text-xs font-semibold text-slate-300">
                    <i class="bi bi-flag-fill"></i>
                    FINAL
                </span>
                <span v-else class="inline-flex items-center gap-2 text-xs font-semibold text-volt-400">
                    <span class="h-2 w-2 rounded-full bg-volt-400 animate-pulse"></span>
                    EN VIVO · Set {{ currentSet }}
                </span>
                <span class="text-xs text-slate-500">{{ setsWon[0] }} - {{ setsWon[1] }} en sets</span>
            </div>

            <div class="grid grid-cols-2 gap-2">
                <div class="text-center rounded-xl bg-brand-500/10 border border-brand-500/20 py-4">
                    <p class="text-5xl md:text-6xl font-display font-bold text-brand-300">{{ score[0] }}</p>
                    <p class="text-xs text-slate-400 mt-2 truncate px-2">{{ usName }}</p>
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
                    Partido
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
                    Set {{ n }}
                    <span v-if="setResult(n)" class="ml-1 text-xs opacity-70">{{ setResult(n) }}</span>
                </button>
                <button
                    v-if="!matchOver && manualSet !== null && manualSet !== currentSet"
                    class="shrink-0 rounded-full px-3 py-1.5 text-xs border border-volt-500/40 text-volt-400"
                    @click="manualSet = null"
                >
                    <i class="bi bi-broadcast"></i> Volver al directo
                </button>
            </div>
        </article>

        <EmptyState
            v-if="setStats.length === 0"
            title="Sin datos en este set"
            message="Cuando empiece el set, aquí aparecerá el punto a punto y las estadísticas en tiempo real."
        />

        <template v-else>
            <!-- ============ EN VIVO: RACHA ============ -->
            <article v-if="!matchOver" class="card w-full p-3 flex items-center justify-center gap-3">
                <p class="text-2xl font-display font-bold" :class="streak.ours ? 'text-volt-400' : 'text-red-400'">
                    {{ streak.count }}
                </p>
                <p class="text-sm text-slate-400">
                    {{ streak.ours ? "puntos seguidos de " + usName : "puntos seguidos de " + themName }}
                </p>
            </article>

            <!-- ============ POST-PARTIDO: FASES + JUGADORAS ============ -->
            <section v-if="matchOver" class="w-full grid grid-cols-2 gap-2">
                <article class="card p-3 text-center">
                    <p class="text-2xl font-display font-bold text-brand-300">{{ pct(sideOut.won, sideOut.total) }}</p>
                    <p class="text-xs text-slate-400 leading-4 mt-1">side-out<br />{{ sideOut.won }}/{{ sideOut.total }}</p>
                </article>
                <article class="card p-3 text-center">
                    <p class="text-2xl font-display font-bold text-brand-300">{{ pct(breakPts.won, breakPts.total) }}</p>
                    <p class="text-xs text-slate-400 leading-4 mt-1">break<br />{{ breakPts.won }}/{{ breakPts.total }}</p>
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
                    <span class="block font-semibold">Estadísticas de las jugadoras</span>
                    <span class="block text-xs text-slate-400">Ataque, recepción, saque y más, jugadora a jugadora</span>
                </span>
                <i class="bi bi-chevron-right text-slate-500"></i>
            </RouterLink>

            <!-- ============ PUNTO A PUNTO ============ -->
            <article class="card w-full p-4">
                <p class="text-sm font-semibold mb-3">Punto a punto</p>
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
                <p class="text-sm font-semibold mb-1">Momentum</p>
                <p class="text-xs text-slate-500 mb-2">Diferencia de puntos a lo largo del set</p>
                <apexchart type="bar" height="220" :options="momentum.chartOptions" :series="momentum.series" />
            </article>

            <!-- ============ ORIGEN DE LOS PUNTOS (post-partido) ============ -->
            <article v-if="matchOver" class="card w-full p-4">
                <p class="text-sm font-semibold mb-3">Origen de los puntos</p>
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

            <!-- ============ PUNTOS POR JUGADORA ============ -->
            <article v-if="topScorers.length" class="card w-full p-4">
                <p class="text-sm font-semibold mb-3">Puntos por jugadora</p>
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

            <!-- ============ COMPARATIVA ENTRE SETS (post-partido) ============ -->
            <article v-if="matchOver && setsComparison.length > 1" class="card w-full p-4">
                <p class="text-sm font-semibold mb-3">Set a set</p>
                <div class="grid grid-cols-[auto_1fr_1fr_1fr_1fr] gap-y-1.5 text-sm items-center">
                    <span></span>
                    <span class="text-center text-xs text-slate-400">Resultado</span>
                    <span class="text-center text-xs text-slate-400">Side-out</span>
                    <span class="text-center text-xs text-slate-400">Break</span>
                    <span class="text-center text-xs text-slate-400">Regalados</span>
                    <template v-for="row in setsComparison" :key="row.n">
                        <span class="pr-3 font-semibold text-slate-300">S{{ row.n }}</span>
                        <span class="text-center font-display font-bold" :class="row.won ? 'text-volt-400' : 'text-red-400'">{{ row.result }}</span>
                        <span class="text-center">{{ row.sideOut }}</span>
                        <span class="text-center">{{ row.breakPts }}</span>
                        <span class="text-center" :class="row.gifted >= 8 ? 'text-red-300' : ''">{{ row.gifted }}</span>
                    </template>
                </div>
            </article>

            <!-- ============ CLAVES DEL PARTIDO (post-partido) ============ -->
            <article v-if="matchOver && insights.length" class="card w-full p-4">
                <p class="text-sm font-semibold mb-3">Claves</p>
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
                    <p class="text-sm font-semibold">Mapa de ataque</p>
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
                <p class="text-sm font-semibold">Errores por área</p>
                <apexchart type="bar" height="220" :options="errors.chartOptions" :series="errors.series" />
            </article>
        </template>
    </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { RouterLink } from "vue-router";
import { useDocument } from "vuefire";
import CourtMap from "../components/CourtMap.vue";
import EmptyState from "../components/EmptyState.vue";
import { collection, doc, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";

const props = defineProps({
    id: String,
});

// ------------------------------------------------------------------ contrato
// La app envía los ids de acción como String ("9") y los stages como
// K1=1 / K2=2 / K3=3. Los stats administrativos (tiempo muerto "0",
// ajuste "98", cambio "99") llevan `to` != 0 pero NO son puntos.
const ADMIN_IDS = ["0", "98", "99"];
const aid = (s: any): string => String(s?.action?.id ?? "");
const isRival = (s: any): boolean => String(s?.player?.id ?? "") === "0";
const rivalServing = (s: any): boolean => String(s?.server?.id ?? "") === "0";

const KILL_IDS = ["9", "10", "11"];
const ACTION_LABELS: Record<string, string> = {
    "8": "Ace",
    "9": "Remate",
    "10": "Finta",
    "11": "Block-out",
    "13": "Punto de bloqueo",
    "12": "Saque ganador",
    "15": "Error de saque",
    "32": "Error de saque",
    "16": "Error de ataque",
    "17": "Error de ataque",
    "18": "Error de ataque",
    "19": "Falta",
    "20": "Error de bloqueo",
    "22": "Error de recepción",
    "23": "Error de defensa",
    "24": "Error de colocación",
    "25": "Error de free",
};
const AREA_LABELS = ["Recepción", "Bloqueo", "Defensa", "Colocación", "Saque", "Ataque", "Falta"];

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
const usName = computed(() => match.value?.team?.name || "Tu equipo");
const themName = computed(() => match.value?.opponent || "Rival");
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
    let us = match.value?.sets_us ?? 0;
    let them = match.value?.sets_them ?? 0;
    if (match.value?.set_closed) {
        const cur = scoreboard.value.find((x) => x.number === currentSet.value);
        if (cur) {
            if (cur.score_us > cur.score_them) us++;
            else if (cur.score_them > cur.score_us) them++;
        }
    }
    return [us, them];
});

// El mismo enlace vive durante y después del partido: mientras el directo está
// activo se muestra el seguimiento (punto a punto, racha, momentum) y cuando
// deja de estarlo (la app publica live=false al cerrarse el set decisivo o al
// apagar el toggle) la página se convierte en el informe. Fallback para docs
// de versiones antiguas de la app que nunca actualizan `live`: último set
// cerrado con mayoría de sets alcanzada.
const matchOver = computed(() => {
    if (match.value?.live === false) return true;
    if (match.value?.set_closed !== true) return false;
    const majority = Math.floor(nSets.value / 2) + 1;
    return setsWon.value[0] >= majority || setsWon.value[1] >= majority;
});

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
        const label = ACTION_LABELS[aid(s)] ?? s.action?.name ?? "";
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
    const rows = [
        { label: "Ataque", us: 0, them: 0 },
        { label: "Bloqueo", us: 0, them: 0 },
        { label: "Saque directo", us: 0, them: 0 },
        { label: "Errores del rival", us: 0, them: 0 },
    ];
    for (const s of pointEnders.value) {
        const rival = isRival(s);
        const id = aid(s);
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
    const byPlayer = new Map<string, number>();
    for (const s of pointEnders.value) {
        if (s.to === 1 && !isRival(s)) {
            const name = s.player?.name ?? "";
            if (name) byPlayer.set(name, (byPlayer.get(name) ?? 0) + 1);
        }
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
        rows.push({
            n,
            result: sb ? `${sb.score_us}-${sb.score_them}` : "",
            won: (sb?.score_us ?? 0) > (sb?.score_them ?? 0),
            sideOut: pct(rec.filter((s) => s.to === 1).length, rec.length),
            breakPts: pct(srv.filter((s) => s.to === 1).length, srv.length),
            gifted: pts.filter((s) => s.to === 2 && !isRival(s)).length,
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

    const theirPts = points.filter((s) => s.to === 2);
    const gifted = theirPts.filter((s) => !isRival(s)).length;
    if (theirPts.length >= 8 && gifted / theirPts.length >= 0.5) {
        out.push({ icon: "bi-gift-fill", color: "text-red-400", text: `${gifted} de sus ${theirPts.length} puntos fueron errores propios.` });
    }

    const k3 = points.filter((s) => Number(s.stage) === 3);
    const k3lost = k3.filter((s) => s.to === 2).length;
    if (k3.length >= 8 && k3lost / k3.length >= 0.7) {
        out.push({ icon: "bi-stopwatch", color: "text-orange-400", text: `Puntos largos: se perdieron ${k3lost} de ${k3.length}.` });
    }

    const serves = game.filter((s) => !isRival(s) && ["8", "15", "32", "39", "40", "41"].includes(aid(s)));
    const serveErr = serves.filter((s) => ["15", "32"].includes(aid(s))).length;
    if (serves.length >= 8 && serveErr >= 3 && serveErr / serves.length >= 0.25) {
        out.push({ icon: "bi-bullseye", color: "text-yellow-400", text: `${serveErr} errores de saque de ${serves.length}: demasiado riesgo.` });
    }

    const ourAttacks = game.filter((s) => !isRival(s) && ["6", "9", "10", "11", "16", "17"].includes(aid(s)));
    if (ourAttacks.length >= 12) {
        const byPlayer = new Map<string, number>();
        for (const s of ourAttacks) byPlayer.set(s.player?.name ?? "", (byPlayer.get(s.player?.name ?? "") ?? 0) + 1);
        const top = [...byPlayer.entries()].sort((a, b) => b[1] - a[1])[0];
        if (byPlayer.size > 1 && top && top[1] / ourAttacks.length >= 0.5) {
            out.push({ icon: "bi-diagram-3-fill", color: "text-orange-400", text: `${top[0]} concentró el ${Math.round((top[1] / ourAttacks.length) * 100)}% del ataque.` });
        }
    }

    const blockouts = game.filter((s) => isRival(s) && aid(s) === "11").length;
    if (blockouts >= 3) {
        out.push({ icon: "bi-hand-index-thumb-fill", color: "text-red-400", text: `${blockouts} block-outs del rival usando el bloqueo propio.` });
    }

    const rivalDir = game.filter((s) => isRival(s) && ["6", "9", "10", "11", "16", "17"].includes(aid(s)) && String(s.direction ?? "").includes("#"));
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
            out.push({ icon: "bi-eye-fill", color: "text-purple-400", text: `El rival atacó el ${Math.round((top[1] / rivalDir.length) * 100)}% por el corredor ${top[0]}.` });
        }
    }

    return out;
});

// ------------------------------------------------------------------ charts
const momentum = computed(() => {
    const pts = pointEnders.value;
    return {
        series: [{ data: pts.map((s) => s.score_us - s.score_them) }],
        chartOptions: {
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
                y: { title: { formatter: () => "Diferencia" } },
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
        series: [{ name: "Errores", data: entries.map(([, v]) => v) }],
        chartOptions: {
            chart: { type: "bar", toolbar: { show: false } },
            fill: { colors: ["#6E93FF"] },
            grid: { show: false, padding: { left: 0, right: 0 } },
            plotOptions: { bar: { borderRadius: 6, columnWidth: 30, borderRadiusApplication: "end" } },
            dataLabels: { enabled: false },
            xaxis: {
                categories: entries.map(([k]) => AREA_LABELS[k] ?? "Otra"),
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
