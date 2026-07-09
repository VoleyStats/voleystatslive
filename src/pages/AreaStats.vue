<template>
    <section class="min-h-screen px-4 pb-24 flex flex-col gap-4 items-center max-w-3xl mx-auto">
        <!-- Selector de sets -->
        <div class="w-full flex items-center gap-2 overflow-x-auto pt-2">
            <button
                v-for="n in nSets"
                :key="n"
                class="shrink-0 rounded-full px-3 py-1.5 text-sm border transition-colors"
                :class="set === n
                    ? 'bg-white text-slate-900 border-white font-semibold'
                    : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/30'"
                @click="manualSet = n"
            >
                Set {{ n }}
            </button>
            <button
                v-if="manualSet !== null && manualSet !== currentSet"
                class="shrink-0 rounded-full px-3 py-1.5 text-xs border border-volt-500/40 text-volt-400"
                @click="manualSet = null"
            >
                <i class="bi bi-broadcast"></i> Volver al directo
            </button>
        </div>

        <EmptyState
            v-if="receivers.length === 0"
            title="Sin recepciones en este set"
            message="Cuando haya recepciones registradas, aquí verás el desglose por jugadora."
        />

        <article
            v-for="p in receivers"
            :key="p.name"
            class="card w-full p-4"
        >
            <div class="flex items-center justify-between mb-3">
                <p class="font-semibold">{{ p.name }}</p>
                <p class="text-sm text-slate-400">
                    nota <span class="font-display font-bold text-brand-300">{{ p.mark }}</span>
                    · {{ p.total }} recepciones
                </p>
            </div>
            <div class="grid grid-cols-4 gap-2 text-center">
                <div v-for="cell in p.cells" :key="cell.label" class="rounded-lg bg-white/[0.04] border border-white/10 py-2">
                    <p class="text-lg font-display font-bold" :class="cell.color">{{ cell.value }}</p>
                    <p class="text-xs text-slate-400">{{ cell.label }}</p>
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

// La app envía los ids de acción como String: normalizar antes de comparar.
const aid = (s: any): string => String(s?.action?.id ?? "");
const RECEPTION_IDS = ["1", "2", "3", "4", "22"];

const match = useDocument(doc(db, "live_matches", matchId));
const baseStats = reactive({ data: [] as any[] });

onSnapshot(
    query(collection(db, "live_matches", matchId, "stats"), orderBy("order")),
    (q) => { baseStats.data = q.docs.map((d) => d.data()); }
);

const nSets = computed(() => match.value?.n_sets ?? 5);
const currentSet = computed(() => match.value?.current_set ?? 1);
const manualSet = ref<number | null>(null);
const set = computed(() => manualSet.value ?? currentSet.value);

const receivers = computed(() => {
    const bySet = baseStats.data.filter(
        (s) => s.set?.number == set.value && RECEPTION_IDS.includes(aid(s)) && String(s.player?.id) !== "0"
    );
    const grouped = new Map<string, any[]>();
    for (const s of bySet) {
        const name = s.player?.name ?? "";
        if (!grouped.has(name)) grouped.set(name, []);
        grouped.get(name)!.push(s);
    }
    return [...grouped.entries()].map(([name, list]) => {
        const count = (id: string) => list.filter((s) => aid(s) === id).length;
        const perfect = count("4");
        const good = count("3");
        const bad = count("2");
        const errors = count("22") + count("1");
        const mark = list.length > 0
            ? ((perfect * 3 + good * 2 + bad) / list.length).toFixed(1)
            : "0.0";
        return {
            name,
            total: list.length,
            mark,
            cells: [
                { label: "++", value: perfect, color: "text-volt-400" },
                { label: "+", value: good, color: "text-brand-300" },
                { label: "-", value: bad, color: "text-slate-300" },
                { label: "error", value: errors, color: "text-red-400" },
            ],
        };
    }).sort((a, b) => b.total - a.total);
});
</script>
