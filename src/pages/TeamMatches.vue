<template>
    <EmptyState
        v-if="notFound"
        :title="$t('team.notFoundTitle')"
        :message="$t('team.notFoundMessage')"
    />

    <section v-else class="min-h-screen px-4 pb-16 flex flex-col gap-4 items-center max-w-3xl mx-auto">
        <!-- Cabecera del equipo -->
        <article class="card w-full p-5 flex items-center gap-4">
            <span
                class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 font-display font-bold text-lg"
                :style="{ background: teamColor + '33', color: teamColor }"
            >
                {{ initials }}
            </span>
            <span class="flex-1 min-w-0">
                <span class="block text-lg font-bold truncate">{{ teamName }}</span>
                <span class="block text-xs text-slate-400">{{ $t('team.sharedMatches', matches.length) }}</span>
            </span>
        </article>

        <EmptyState
            v-if="!loading && matches.length === 0"
            :title="$t('team.emptyTitle')"
            :message="$t('team.emptyMessage')"
        />

        <!-- Partidos -->
        <RouterLink
            v-for="m in matches"
            :key="m.code"
            :to="{ name: 'stats', params: { id: m.code } }"
            class="card w-full p-4 flex items-center gap-3 hover:border-brand-500/40 transition-colors"
        >
            <span class="flex-1 min-w-0">
                <span class="block font-semibold truncate">{{ $t('team.vs', { opponent: m.opponent }) }}</span>
                <span class="block text-xs text-slate-400">{{ m.dateLabel }}</span>
            </span>
            <span v-if="m.live" class="inline-flex items-center gap-1.5 text-xs font-semibold text-volt-400">
                <span class="h-2 w-2 rounded-full bg-volt-400 animate-pulse"></span>
                {{ $t('team.live') }}
            </span>
            <span v-else-if="m.result" class="font-display font-bold" :class="m.won ? 'text-volt-400' : 'text-red-400'">
                {{ m.result }}
            </span>
            <i class="bi bi-chevron-right text-slate-500"></i>
        </RouterLink>
    </section>
</template>

<script lang="ts" setup>
import { computed, reactive, watchEffect } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { doc, getDoc } from "firebase/firestore";
import { useI18n } from "vue-i18n";
import { useDocument } from "vuefire";
import EmptyState from "../components/EmptyState.vue";
import { db } from "../firebase";

const teamId = useRoute().params.id as string;
const { t, locale } = useI18n();
const team = useDocument(doc(db, "teams", teamId));

const notFound = computed(() => team.value === null);
const loading = computed(() => team.value === undefined);
const teamName = computed(() => team.value?.name ?? t("team.teamFallback"));
const teamColor = computed(() => {
    const hex = String(team.value?.color ?? "").replace("#", "");
    return hex.length === 6 || hex.length === 8 ? `#${hex}` : "#6E93FF";
});
const initials = computed(() =>
    teamName.value.split(/\s+/).map((w: string) => w[0]).join("").slice(0, 3).toUpperCase()
);

interface TeamMatch {
    code: string;
    opponent: string;
    dateLabel: string;
    date: number;
    live: boolean;
    result: string;
    won: boolean;
}

const matches = reactive<TeamMatch[]>([]);

// El doc del equipo trae el índice (code/opponent/date); el estado de cada
// partido (en vivo, resultado en sets) se lee de su propio doc.
watchEffect(async () => {
    const index = (team.value?.matches ?? []) as any[];
    if (!index.length) return;
    const df = new Intl.DateTimeFormat(locale.value, { dateStyle: "medium" });
    const rows = await Promise.all(
        index.map(async (entry) => {
            const row: TeamMatch = {
                code: String(entry.code ?? ""),
                opponent: String(entry.opponent ?? ""),
                date: Number(entry.date ?? 0),
                dateLabel: df.format(new Date(Number(entry.date ?? 0) * 1000)),
                live: false,
                result: "",
                won: false,
            };
            try {
                const snap = await getDoc(doc(db, "live_matches", row.code));
                if (snap.exists()) {
                    const m = snap.data() as any;
                    const majority = Math.floor((m.n_sets ?? 5) / 2) + 1;
                    let us = m.sets_us ?? 0;
                    let them = m.sets_them ?? 0;
                    if (m.set_closed) {
                        const cur = (m.sets_scoreboard ?? []).find((s: any) => s.number === m.current_set);
                        if (cur) {
                            if (cur.score_us > cur.score_them) us++;
                            else if (cur.score_them > cur.score_us) them++;
                        }
                    }
                    const over = m.live === false || (m.set_closed === true && (us >= majority || them >= majority));
                    row.live = !over && (us > 0 || them > 0 || m.live === true);
                    if (over || us > 0 || them > 0) {
                        row.result = `${us}-${them}`;
                        row.won = us > them;
                    }
                    if (over) row.live = false;
                }
            } catch {
                // Partido purgado o inaccesible: se muestra solo la ficha.
            }
            return row;
        })
    );
    matches.splice(0, matches.length, ...rows.sort((a, b) => b.date - a.date));
});
</script>
