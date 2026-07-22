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
        <template v-else-if="matchRows.length > 0">
            <template v-if="progress.loading">
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

                <!-- Progreso de carga (misma cifra que en la pestaña Partidos). -->
                <p class="text-xs text-slate-500 text-center">
                    {{ $t('team.loadingProgress', { done: progress.done, total: progress.total }) }}
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
                </template>
            </template>
        </template>
    </section>
</template>

<script lang="ts" setup>
import { computed, ref } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
// Registro local (no global en main.ts): solo esta página paga por ApexCharts.
import VueApexCharts from "vue3-apexcharts";
import type { ApexOptions } from "apexcharts";
import EmptyState from "../components/EmptyState.vue";
import CourtMap from "../components/CourtMap.vue";
import SkeletonCard from "../components/SkeletonCard.vue";
import SkeletonChart from "../components/SkeletonChart.vue";
import SkeletonRow from "../components/SkeletonRow.vue";
import { useTeamStats } from "../composables/useTeamStats";
import {
    ATTACK_IDS,
    SERVE_ERR_IDS,
    TEAM_RADAR_FILTERS,
    activePlayerIds,
    aid,
    areaTotals,
    attackByReceptionGradeForMatch,
    attackByTechnique,
    attackEfficiency,
    attackPhaseTotals,
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
    rotationBreakdown,
    setterConnections,
    shrinkRate,
    sideOutStats,
    unforcedShare,
    type AttackTotals,
    type StatDoc,
} from "../utils/volleyStats";
import {
    SERVE_TABLE_IDS,
    attackSkillTable,
    blockSkillTable,
    digSkillTable,
    downhitTotals,
    faultSkillTable,
    freeSkillTable,
    receiveSkillTable,
    serveSkillTable,
    setSkillTable,
} from "../utils/teamTables";

const teamId = useRoute().params.id as string;
const { t, locale } = useI18n();

const {
    team,
    filteredMatches,
    progress,
    hasSeasons,
    seasonsMap,
    seasonIds,
    selectedSeason,
    hasUnseasonedMatches,
} = useTeamStats(teamId);

const view = ref<"matches" | "stats">("matches");

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

// Color compartido de % de remate (mismo criterio que GeneralStats.vue).
const killColor = (kills: number, attempts: number): string => {
    if (!attempts) return "text-slate-500";
    const p = kills / attempts;
    return p >= 0.4 ? "text-volt-400" : p >= 0.25 ? "text-yellow-400" : "text-red-400";
};

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

// --- D: rotaciones 360 (heatmap) -------------------------------------------
const rotationRows = computed(() => rotationBreakdown(gameStats.value, derivedKills.value));
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
    const { k1, k2 } = attackPhaseTotals(gameStats.value, derivedKills.value);
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
const receptionGradeBuckets = computed(() => {
    const perMatch = loadedMatches.value.map((m) =>
        attackByReceptionGradeForMatch((m.stats as StatDoc[]).filter(isGameStat), creditsByCode.value.get(m.code)?.kills ?? new Set())
    );
    return mergeGradeBuckets(perMatch);
});
const receptionGradeRows = computed(() =>
    [3, 2, 1, 0]
        .filter((g) => (receptionGradeBuckets.value.get(g)?.attempts ?? 0) > 0)
        .map((g) => {
            const b = receptionGradeBuckets.value.get(g)!;
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
    attackByTechnique(gameStats.value, derivedKills.value).map((b) => ({
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
    const activeIds = activePlayerIds(gameStats.value);
    const qualified = setterConnections(gameStats.value, derivedKills.value, activeIds).filter((c) => c.attempts >= 6);
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

// --- G: tablas por destreza (fase 2b) ---------------------------------
// Etiquetas de pestaña reutilizando `stats.areas.*` (ya cubren las 9
// destrezas exactas de esta sección, ver AREA_LABEL_KEYS).
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
    attack: attackSkillTable(gameStats.value),
    serve: serveSkillTable(gameStats.value, allStats.value),
    receive: receiveSkillTable(gameStats.value),
    block: blockSkillTable(gameStats.value),
    dig: digSkillTable(gameStats.value),
    set: setSkillTable(gameStats.value),
    free: freeSkillTable(gameStats.value),
    fault: faultSkillTable(gameStats.value),
}));
const currentSkillTable = computed(() =>
    selectedSkill.value === "downhit" ? null : skillTables.value[selectedSkill.value as Exclude<SkillKey, "downhit">]
);
const downhitCard = computed(() => downhitTotals(gameStats.value));

// --- H: direcciones de equipo (mapa de pista agregado) ------------------
const DIRECTION_FAMILIES = [
    { key: "attack", labelKey: "stats.areas.attack" },
    { key: "serve", labelKey: "stats.areas.serve" },
] as const;
type DirectionFamily = (typeof DIRECTION_FAMILIES)[number]["key"];

const directionsFamily = ref<DirectionFamily>("attack");
const directionsSide = ref<"us" | "rival">("us");
const directionsPlayerId = ref<string>("all");

const directionsIds = computed(() => (directionsFamily.value === "serve" ? SERVE_TABLE_IDS : ATTACK_IDS));
const directionsStats = computed(() => {
    if (directionsSide.value === "us" && directionsPlayerId.value !== "all") {
        return gameStats.value.filter((s) => String(s.player?.id ?? "") === directionsPlayerId.value);
    }
    return gameStats.value;
});

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
