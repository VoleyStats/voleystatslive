<template>
    <article class="card w-full p-4">
        <p class="text-sm font-semibold mb-3">{{ $t('team.tablesTitle') }}</p>
        <div class="flex items-center gap-2 overflow-x-auto pb-1 mb-3">
            <button
                v-for="sk in SKILL_DEFS"
                :key="sk.key"
                class="shrink-0 rounded-full px-3 py-1.5 text-xs border transition-colors"
                :class="selectedSkill === sk.key
                    ? 'bg-white text-slate-900 border-white font-semibold'
                    : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/30'"
                @click="selectedSkill = sk.key"
            >
                {{ $t(sk.labelKey) }}
            </button>
        </div>

        <div v-if="selectedSkill === 'downhit'" class="grid grid-cols-3 gap-2">
            <div class="text-center rounded-xl bg-white/[0.04] border border-white/10 py-3">
                <p class="text-lg font-display font-bold text-brand-300">{{ downhitCard.total }}</p>
                <p class="text-[11px] text-slate-400 mt-1">{{ $t('team.colTotal') }}</p>
            </div>
            <div class="text-center rounded-xl bg-white/[0.04] border border-white/10 py-3">
                <p class="text-lg font-display font-bold text-volt-400">{{ downhitCard.won }}</p>
                <p class="text-[11px] text-slate-400 mt-1">{{ $t('team.colWon') }}</p>
            </div>
            <div class="text-center rounded-xl bg-white/[0.04] border border-white/10 py-3">
                <p class="text-lg font-display font-bold text-red-400">{{ downhitCard.errors }}</p>
                <p class="text-[11px] text-slate-400 mt-1">{{ $t('team.colErrors') }}</p>
            </div>
        </div>

        <div v-else-if="currentSkillTable" class="overflow-x-auto">
            <table class="w-full text-sm border-collapse min-w-[420px]">
                <thead>
                    <tr class="text-xs text-slate-400">
                        <th class="text-left font-normal pb-2 pr-2">{{ $t('team.colPlayer') }}</th>
                        <th v-for="c in currentSkillTable.columns" :key="c.key" class="text-center font-normal pb-2 px-1 w-12">
                            {{ $t(c.labelKey) }}
                        </th>
                        <th v-if="currentSkillTable.markLabelKey" class="text-center font-normal pb-2 px-1 w-14">
                            {{ $t(currentSkillTable.markLabelKey) }}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="row in currentSkillTable.rows" :key="row.id" class="border-t border-white/5">
                        <td class="py-1.5 pr-2 truncate max-w-[140px]">{{ row.name }}</td>
                        <td v-for="c in currentSkillTable.columns" :key="c.key" class="text-center py-1.5 px-1">
                            {{ row.values[c.key] }}
                        </td>
                        <td v-if="currentSkillTable.markLabelKey" class="text-center py-1.5 px-1 font-semibold text-brand-300">
                            {{ row.mark }}
                        </td>
                    </tr>
                    <tr class="border-t border-white/10 font-semibold text-slate-200">
                        <td class="py-1.5 pr-2">{{ $t('team.rowTotal') }}</td>
                        <td v-for="c in currentSkillTable.columns" :key="c.key" class="text-center py-1.5 px-1">
                            {{ currentSkillTable.total.values[c.key] }}
                        </td>
                        <td v-if="currentSkillTable.markLabelKey" class="text-center py-1.5 px-1 text-brand-300">
                            {{ currentSkillTable.total.mark }}
                        </td>
                    </tr>
                </tbody>
            </table>
            <p v-if="currentSkillTable.rows.length === 0" class="text-xs text-slate-500 mt-2">{{ $t('team.tableEmpty') }}</p>
        </div>
    </article>
</template>

<script lang="ts" setup>
// Tab "Tablas por destreza" extraído de TeamMatches.vue para reusarlo también
// en la vista de un partido/set (GeneralStats.vue, tanda 2). Sin cambios de
// fórmula: recorte 1:1 sobre `teamTables.ts`.
//
// `stats` es la secuencia de stats de JUEGO (ya filtrada con `isGameStat`)
// del ámbito a mostrar (un partido/set, o varios partidos concatenados).
// `allStats` es la secuencia CRUDA (sin filtrar acciones admin) del mismo
// ámbito — solo la usa `serveSkillTable` para la columna "puntos ganados
// sacando" (universo `to === 1`, no restringido a acciones de juego).
import { computed, ref } from "vue";
import {
    attackSkillTable,
    blockSkillTable,
    digSkillTable,
    downhitTotals,
    faultSkillTable,
    freeSkillTable,
    receiveSkillTable,
    serveSkillTable,
    setSkillTable,
} from "../../utils/teamTables";
import type { StatDoc } from "../../utils/volleyStats";

const props = defineProps<{
    stats: StatDoc[];
    allStats: StatDoc[];
}>();

// Etiquetas de pestaña reutilizando `stats.areas.*` (ya cubren las 9
// destrezas exactas de esta sección).
const SKILL_DEFS = [
    { key: "attack", labelKey: "stats.areas.attack" },
    { key: "serve", labelKey: "stats.areas.serve" },
    { key: "receive", labelKey: "stats.areas.reception" },
    { key: "block", labelKey: "stats.areas.block" },
    { key: "dig", labelKey: "stats.areas.defense" },
    { key: "set", labelKey: "stats.areas.setting" },
    { key: "free", labelKey: "stats.areas.freeball" },
    { key: "fault", labelKey: "stats.areas.fault" },
    { key: "downhit", labelKey: "stats.areas.downhit" },
] as const;
type SkillKey = (typeof SKILL_DEFS)[number]["key"];

const selectedSkill = ref<SkillKey>("attack");

const skillTables = computed(() => ({
    attack: attackSkillTable(props.stats),
    serve: serveSkillTable(props.stats, props.allStats),
    receive: receiveSkillTable(props.stats),
    block: blockSkillTable(props.stats),
    dig: digSkillTable(props.stats),
    set: setSkillTable(props.stats),
    free: freeSkillTable(props.stats),
    fault: faultSkillTable(props.stats),
}));
const currentSkillTable = computed(() =>
    selectedSkill.value === "downhit" ? null : skillTables.value[selectedSkill.value as Exclude<SkillKey, "downhit">]
);
const downhitCard = computed(() => downhitTotals(props.stats));
</script>
