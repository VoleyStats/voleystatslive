<template>
    <section class="min-h-screen px-4 pb-16 flex flex-col gap-4 items-center max-w-3xl mx-auto">
        <!-- Filtro: partido completo o set concreto -->
        <div class="w-full flex items-center gap-2 overflow-x-auto pt-2">
            <button
                class="shrink-0 rounded-full px-3 py-1.5 text-sm border transition-colors"
                :class="set === 0
                    ? 'bg-white text-slate-900 border-white font-semibold'
                    : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/30'"
                @click="set = 0"
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
                @click="set = n"
            >
                Set {{ n }}
            </button>
        </div>

        <EmptyState
            v-if="players.length === 0"
            title="Sin datos de jugadoras"
            message="Cuando haya acciones registradas, aquí aparecerán las estadísticas individuales."
        />

        <article v-for="p in players" :key="p.name" class="card w-full p-4">
            <!-- Cabecera jugadora -->
            <button class="w-full flex items-center gap-3 text-left" @click="toggle(p.name)">
                <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500/15 font-display font-bold text-brand-300">
                    {{ p.number ?? "·" }}
                </span>
                <span class="flex-1 min-w-0">
                    <span class="block font-semibold truncate">{{ p.name }}</span>
                    <span class="block text-xs text-slate-400">{{ p.actions }} acciones</span>
                </span>
                <span class="text-right">
                    <span class="block text-2xl font-display font-bold text-brand-300">{{ p.points }}</span>
                    <span class="block text-xs text-slate-400">puntos</span>
                </span>
                <i class="bi text-slate-500 ml-1" :class="expanded === p.name ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
            </button>

            <!-- Resumen compacto siempre visible -->
            <div class="mt-3 grid grid-cols-3 gap-2 text-center">
                <div class="rounded-lg bg-white/[0.04] border border-white/10 py-2">
                    <p class="text-sm font-display font-bold" :class="effColor(p.attack.eff)">
                        {{ p.attack.total ? p.attack.kills + "/" + p.attack.total : "—" }}
                    </p>
                    <p class="text-[11px] text-slate-400">ataque</p>
                </div>
                <div class="rounded-lg bg-white/[0.04] border border-white/10 py-2">
                    <p class="text-sm font-display font-bold text-slate-200">
                        {{ p.reception.total ? p.reception.mark : "—" }}
                    </p>
                    <p class="text-[11px] text-slate-400">recepción</p>
                </div>
                <div class="rounded-lg bg-white/[0.04] border border-white/10 py-2">
                    <p class="text-sm font-display font-bold text-slate-200">
                        {{ p.serve.total ? p.serve.aces + "A / " + p.serve.errors + "E" : "—" }}
                    </p>
                    <p class="text-[11px] text-slate-400">saque</p>
                </div>
            </div>

            <!-- Detalle expandido -->
            <div v-if="expanded === p.name" class="mt-4 space-y-3">
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div v-for="block in p.blocks" :key="block.title" class="rounded-lg bg-white/[0.04] border border-white/10 p-3">
                        <p class="text-xs text-slate-400 mb-1">{{ block.title }}</p>
                        <p class="text-sm text-slate-200 leading-6" v-html="block.html"></p>
                    </div>
                </div>

                <!-- Recepción con desglose de notas -->
                <div v-if="p.reception.total" class="rounded-lg bg-white/[0.04] border border-white/10 p-3">
                    <p class="text-xs text-slate-400 mb-2">Recepción · nota {{ p.reception.mark }} sobre 3</p>
                    <div class="grid grid-cols-4 gap-2 text-center">
                        <div>
                            <p class="font-display font-bold text-volt-400">{{ p.reception.perfect }}</p>
                            <p class="text-[11px] text-slate-400">++</p>
                        </div>
                        <div>
                            <p class="font-display font-bold text-brand-300">{{ p.reception.good }}</p>
                            <p class="text-[11px] text-slate-400">+</p>
                        </div>
                        <div>
                            <p class="font-display font-bold text-slate-300">{{ p.reception.bad }}</p>
                            <p class="text-[11px] text-slate-400">-</p>
                        </div>
                        <div>
                            <p class="font-display font-bold text-red-400">{{ p.reception.errors }}</p>
                            <p class="text-[11px] text-slate-400">error</p>
                        </div>
                    </div>
                </div>

                <!-- Puntos por set -->
                <div v-if="set === 0 && p.pointsBySet.some(x => x > 0)" class="rounded-lg bg-white/[0.04] border border-white/10 p-3">
                    <p class="text-xs text-slate-400 mb-2">Puntos por set</p>
                    <div class="flex gap-2">
                        <div v-for="(pts, i) in p.pointsBySet" :key="i" class="flex-1 text-center rounded-md bg-white/[0.04] py-1.5">
                            <p class="font-display font-bold text-sm" :class="pts > 0 ? 'text-brand-300' : 'text-slate-500'">{{ pts }}</p>
                            <p class="text-[10px] text-slate-500">S{{ i + 1 }}</p>
                        </div>
                    </div>
                </div>
            </div>
        </article>
    </section>
</template>

<script lang="ts" setup>
import { computed, reactive, ref } from "vue";
import { collection, doc, onSnapshot, orderBy, query } from "firebase/firestore";
import { useRoute } from "vue-router";
import { useDocument } from "vuefire";
import EmptyState from "../components/EmptyState.vue";
import { db } from "../firebase";

const matchId = useRoute().params.id as string;

// Contrato con la app: ids de acción como String.
const aid = (s: any): string => String(s?.action?.id ?? "");
const ADMIN_IDS = ["0", "98", "99"];
const ATTACK_IDS = ["6", "9", "10", "11", "16", "17"];
const KILL_IDS = ["9", "10", "11"];
const ATTACK_ERR = ["16", "17"];
const RECEPTION_IDS = ["1", "2", "3", "4", "22"];
const SERVE_IDS = ["8", "15", "32", "39", "40", "41"];
const SERVE_ERR = ["15", "32"];
const DIG_IDS = ["5", "43", "44", "45", "46"];
const FREE_IDS = ["35", "36", "37"];

const match = useDocument(doc(db, "live_matches", matchId));
const baseStats = reactive({ data: [] as any[] });

onSnapshot(
    query(collection(db, "live_matches", matchId, "stats"), orderBy("order")),
    (q) => { baseStats.data = q.docs.map((d) => d.data()); }
);

const nSets = computed(() => match.value?.n_sets ?? 5);
// 0 = partido completo (el caso principal post-partido).
const set = ref(0);
const expanded = ref<string | null>(null);
const toggle = (name: string) => { expanded.value = expanded.value === name ? null : name; };

const players = computed(() => {
    const pool = baseStats.data.filter(
        (s) =>
            !ADMIN_IDS.includes(aid(s)) &&
            String(s.player?.id) !== "0" &&
            (set.value === 0 || s.set?.number == set.value)
    );
    const grouped = new Map<string, any[]>();
    for (const s of pool) {
        const name = s.player?.name ?? "";
        if (!name) continue;
        if (!grouped.has(name)) grouped.set(name, []);
        grouped.get(name)!.push(s);
    }

    return [...grouped.entries()].map(([name, list]) => {
        const count = (ids: string[]) => list.filter((s) => ids.includes(aid(s))).length;
        const points = list.filter((s) => s.to === 1).length;

        const attackTotal = count(ATTACK_IDS);
        const kills = count(KILL_IDS);
        const attackErrors = count(ATTACK_ERR);
        const eff = attackTotal > 0 ? Math.round((kills / attackTotal) * 100) : 0;

        const recTotal = count(RECEPTION_IDS);
        const perfect = count(["4"]);
        const good = count(["3"]);
        const bad = count(["2"]);
        const recErrors = count(["22", "1"]);
        const mark = recTotal > 0 ? ((perfect * 3 + good * 2 + bad) / recTotal).toFixed(1) : "0.0";

        const serveTotal = count(SERVE_IDS);
        const aces = count(["8"]);
        const serveErrors = count(SERVE_ERR);

        const blockPoints = count(["13"]);
        const blockTouches = count(["7"]);
        const blockErrors = count(["20"]);
        const digs = count(DIG_IDS);
        const digErrors = count(["23"]);
        const frees = count(FREE_IDS);
        const freeErrors = count(["25"]);
        const assists = count(["42"]);
        const setErrors = count(["24"]);

        const pointsBySet = Array.from({ length: nSets.value }, (_, i) =>
            baseStats.data.filter(
                (s) =>
                    s.set?.number == i + 1 &&
                    s.to === 1 &&
                    s.player?.name === name &&
                    !ADMIN_IDS.includes(aid(s))
            ).length
        );

        const blocks = [
            {
                title: "Ataque",
                html: `${kills} pts · ${attackErrors} err · ${attackTotal} int<br><b>${eff}%</b> de eficacia`,
            },
            {
                title: "Saque",
                html: `${aces} aces · ${serveErrors} err<br>${serveTotal} saques`,
            },
            {
                title: "Bloqueo",
                html: `${blockPoints} pts · ${blockTouches} toques<br>${blockErrors} err`,
            },
            {
                title: "Defensa",
                html: `${digs} defensas<br>${digErrors} err`,
            },
            {
                title: "Free",
                html: `${frees} frees<br>${freeErrors} err`,
            },
            {
                title: "Colocación",
                html: `${assists} colocaciones<br>${setErrors} err`,
            },
        ].filter((b) => !/^0 [a-z]+ · 0 |^0 [a-z]+<br>0 /.test(b.html));

        return {
            name,
            number: list[0]?.player?.number,
            actions: list.length,
            points,
            attack: { total: attackTotal, kills, errors: attackErrors, eff },
            reception: { total: recTotal, perfect, good, bad, errors: recErrors, mark },
            serve: { total: serveTotal, aces, errors: serveErrors },
            pointsBySet,
            blocks,
        };
    }).sort((a, b) => b.points - a.points);
});

const effColor = (eff: number): string =>
    eff >= 40 ? "text-volt-400" : eff >= 25 ? "text-brand-300" : "text-slate-200";
</script>
