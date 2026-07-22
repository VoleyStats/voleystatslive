<template>
    <article class="card w-full p-4">
        <p class="text-sm font-semibold mb-3">{{ $t('team.directionsTitle') }}</p>
        <div class="flex flex-wrap items-center gap-2 mb-3">
            <div class="flex items-center gap-1.5">
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
            <div class="flex items-center gap-1.5 ml-auto">
                <button
                    class="shrink-0 rounded-full px-3 py-1.5 text-xs border transition-colors"
                    :class="directionsSide === 'us'
                        ? 'bg-white text-slate-900 border-white font-semibold'
                        : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/30'"
                    @click="directionsSide = 'us'"
                >
                    {{ $t('team.directionsUs') }}
                </button>
                <button
                    class="shrink-0 rounded-full px-3 py-1.5 text-xs border transition-colors"
                    :class="directionsSide === 'rival'
                        ? 'bg-white text-slate-900 border-white font-semibold'
                        : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/30'"
                    @click="directionsSide = 'rival'"
                >
                    {{ $t('team.directionsRival') }}
                </button>
            </div>
        </div>
        <div v-if="directionsSide === 'us' && rosterPlayers.length" class="flex items-center gap-2 overflow-x-auto pb-1 mb-3">
            <button
                class="shrink-0 rounded-full px-3 py-1.5 text-xs border transition-colors"
                :class="directionsPlayerId === 'all'
                    ? 'bg-white text-slate-900 border-white font-semibold'
                    : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/30'"
                @click="directionsPlayerId = 'all'"
            >
                {{ $t('team.allPlayers') }}
            </button>
            <button
                v-for="p in rosterPlayers"
                :key="p.id"
                class="shrink-0 rounded-full px-3 py-1.5 text-xs border transition-colors"
                :class="directionsPlayerId === p.id
                    ? 'bg-white text-slate-900 border-white font-semibold'
                    : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/30'"
                @click="directionsPlayerId = p.id"
            >
                {{ p.name }}
            </button>
        </div>
        <CourtMap :stats="directionsStats" :rival="directionsSide === 'rival'" :action-ids="directionsIds" />
    </article>
</template>

<script lang="ts" setup>
// Tab "Direcciones" (mapa de pista agregado con toggles de familia/lado/
// jugadora) extraído de TeamMatches.vue para reusarlo también en la vista de
// un partido/set (GeneralStats.vue, tanda 2). Sin cambios de fórmula:
// recorte 1:1.
//
// `stats` es la secuencia de stats de JUEGO (ya filtrada con `isGameStat`)
// del ámbito a mostrar (un partido/set, o varios partidos concatenados). El
// roster de jugadoras propias para el filtro se deriva de la misma prop, no
// hace falta pasarlo aparte.
import { computed, ref } from "vue";
import CourtMap from "../CourtMap.vue";
import { ATTACK_IDS, isRival, type StatDoc } from "../../utils/volleyStats";
import { SERVE_TABLE_IDS } from "../../utils/teamTables";

const props = defineProps<{
    stats: StatDoc[];
}>();

const DIRECTION_FAMILIES = [
    { key: "attack", labelKey: "stats.areas.attack" },
    { key: "serve", labelKey: "stats.areas.serve" },
] as const;
type DirectionFamily = (typeof DIRECTION_FAMILIES)[number]["key"];

const directionsFamily = ref<DirectionFamily>("attack");
const directionsSide = ref<"us" | "rival">("us");
const directionsPlayerId = ref<string>("all");

const rosterPlayers = computed(() => {
    const names = new Map<string, string>();
    for (const s of props.stats) {
        if (isRival(s)) continue;
        const id = String(s.player?.id ?? "");
        if (id && !names.has(id)) names.set(id, s.player?.name || id);
    }
    return [...names.entries()]
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name));
});

const directionsIds = computed(() => (directionsFamily.value === "serve" ? SERVE_TABLE_IDS : ATTACK_IDS));
const directionsStats = computed(() => {
    if (directionsSide.value === "us" && directionsPlayerId.value !== "all") {
        return props.stats.filter((s) => String(s.player?.id ?? "") === directionsPlayerId.value);
    }
    return props.stats;
});
</script>
