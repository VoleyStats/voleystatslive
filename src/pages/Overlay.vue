<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue"
import { useRoute } from "vue-router"
import { useI18n } from "vue-i18n"
import { collection, doc, onSnapshot, orderBy, query } from "firebase/firestore"
import { useDocument } from "vuefire"
import { db } from "../firebase"
import { ADMIN_IDS, aid, deriveCredits, pointsOrigin } from "../utils/volleyStats"

const { t } = useI18n()

// Everything the scoreboard needs already lives on the match doc: the app
// rewrites `sets_scoreboard` (per-set scores, current set included) on every
// point, plus `sets_us`/`sets_them`/`current_set`. So we subscribe only to
// `live_matches/{code}` — no need to read the (potentially huge) stats subcollection.
interface SetScore {
    number: number
    score_us: number
    score_them: number
}
interface LiveMatch {
    team?: { name?: string; color?: string }
    opponent?: string
    n_sets?: number
    sets_us?: number
    sets_them?: number
    current_set?: number
    set_closed?: boolean
    sets_scoreboard?: SetScore[]
}

const route = useRoute()
const code = String(route.params.code ?? "")
// Demo mode (?demo=1 in-play, ?demo=between between sets) feeds mock data so the
// overlay can be styled and placed in OBS without a real live match (and without
// touching Firestore, so it works with no .env).
const demo = route.query.demo
const liveMatch = useDocument<LiveMatch>(
    computed(() => (code && !demo ? doc(db, "live_matches", code) : null))
)
const demoData = computed<LiveMatch | null>(() => {
    if (!demo) return null
    const between = demo === "between"
    return {
        team: { name: "C.V. Valencia", color: "1e90ff" },
        opponent: "Barça",
        n_sets: 5,
        sets_us: 1,
        sets_them: 1,
        current_set: 3,
        set_closed: between,
        sets_scoreboard: [
            { number: 1, score_us: 25, score_them: 20 },
            { number: 2, score_us: 22, score_them: 25 },
            { number: 3, score_us: between ? 25 : 16, score_them: between ? 18 : 14 },
            { number: 4, score_us: 0, score_them: 0 },
            { number: 5, score_us: 0, score_them: 0 },
        ],
    }
})
const match = computed<LiveMatch | null | undefined>(() => demoData.value ?? liveMatch.value)

// --- OBS placement, configurable via URL (?pos=, ?scale=) ---
const pos = String(route.query.pos ?? "bottom-left")
const scale = Number(route.query.scale) || 1

const compactStyle = computed(() => {
    const m = "3vmin"
    const base: Record<string, string> = { transform: `scale(${scale})` }
    switch (pos) {
        case "bottom-right":
            return { ...base, bottom: m, right: m, transformOrigin: "bottom right" }
        case "top-left":
            return { ...base, top: m, left: m, transformOrigin: "top left" }
        case "top-right":
            return { ...base, top: m, right: m, transformOrigin: "top right" }
        default:
            return { ...base, bottom: m, left: m, transformOrigin: "bottom left" }
    }
})
const expandedStyle = computed(() => ({
    transform: `translate(-50%, -50%) scale(${scale})`,
}))

// --- Derived match state ---
function cssColor(hex: string | undefined, fallback: string): string {
    if (!hex) return fallback
    const h = hex.replace("#", "").trim()
    return h.length === 6 || h.length === 8 ? `#${h}` : fallback
}

const ready = computed(() => !!match.value)
const nSets = computed(() => match.value?.n_sets ?? 5)
const usName = computed(() => match.value?.team?.name || "Local")
const themName = computed(() => match.value?.opponent || "Visitante")
const usColor = computed(() => cssColor(match.value?.team?.color, "#38bdf8"))
const themColor = "#f87171"

const currentSet = computed(() => match.value?.current_set ?? 1)
const scoreboard = computed<SetScore[]>(() => match.value?.sets_scoreboard ?? [])
const cur = computed<SetScore>(
    () =>
        scoreboard.value.find((s) => s.number === currentSet.value) ?? {
            number: currentSet.value,
            score_us: 0,
            score_them: 0,
        }
)

// A set is finished at 25 (15 for the deciding set) with a 2-point margin.
function setTarget(n: number): number {
    return n === nSets.value ? 15 : 25
}
const currentDone = computed(() => {
    const s = cur.value
    const hi = Math.max(s.score_us, s.score_them)
    return hi >= setTarget(currentSet.value) && Math.abs(s.score_us - s.score_them) >= 2
})

// The app signals set end explicitly via `set_closed` (from its "has the set
// ended?" prompt). Prefer that; fall back to the score-based rule for older builds.
const between = computed(() => {
    if (match.value?.set_closed === true) return true
    if (match.value?.set_closed === false) return false
    return currentDone.value
})

// Sets won: `sets_*` counts only sets *before* the current one, so when the
// current set has just finished we add it back in for the displayed tally.
const effUs = computed(
    () => (match.value?.sets_us ?? 0) + (between.value && cur.value.score_us > cur.value.score_them ? 1 : 0)
)
const effThem = computed(
    () => (match.value?.sets_them ?? 0) + (between.value && cur.value.score_them > cur.value.score_us ? 1 : 0)
)

const majority = computed(() => Math.floor(nSets.value / 2) + 1)
const matchOver = computed(() => between.value && (effUs.value >= majority.value || effThem.value >= majority.value))

// playing: compact bar during a set. between: big breakdown once a set ends.
const phase = computed<"playing" | "between">(() => (between.value ? "between" : "playing"))
const headline = computed(() => (matchOver.value ? "Final" : `Fin del set ${currentSet.value}`))
const playedSets = computed(() =>
    scoreboard.value.filter((s) => s.number <= currentSet.value).sort((a, b) => a.number - b.number)
)

// --- Stats subcollection: momentary banners (timeout/substitution) + the
// "set stats" block of the expanded panel. One listener, same query shape as
// GeneralStats.vue. Skipped entirely in demo mode (no Firestore needed).
const allStats = ref<any[]>([])

interface BannerItem {
    id: number
    kind: "timeout" | "sub"
    team?: "us" | "them"
    playerIn?: string
    playerOut?: string
}
const bannerQueue = ref<BannerItem[]>([])
const activeBanner = ref<BannerItem | null>(null)
let bannerSeq = 0
let bannerTimer: ReturnType<typeof setTimeout> | null = null
const BANNER_MS = 8000

function clearBannerTimer() {
    if (bannerTimer) {
        clearTimeout(bannerTimer)
        bannerTimer = null
    }
}
function advanceBanner() {
    clearBannerTimer()
    const next = bannerQueue.value.shift()
    activeBanner.value = next ?? null
    if (next) bannerTimer = setTimeout(advanceBanner, BANNER_MS)
}
function enqueueBanner(item: Omit<BannerItem, "id">) {
    bannerQueue.value.push({ id: ++bannerSeq, ...item })
    if (!activeBanner.value) advanceBanner()
}
function formatPlayer(p: any): string {
    if (!p) return ""
    const name = p.name ?? ""
    const num = Number(p.number)
    return num ? `${num} ${name}`.trim() : name
}
// Timeout ("0"): `to` carries WHO called it here (1 = us, 2 = them) instead
// of its usual "who scored" meaning — `player` is always the rival sentinel
// on this stat, so it can't be used to tell the teams apart.
// Substitution ("99"): `player` (outgoing) is always our own roster — the app
// doesn't track rival substitutions — so no team badge is needed there.
function handleLiveStat(s: any) {
    const id = aid(s)
    if (id === "0") {
        enqueueBanner({ kind: "timeout", team: s?.to === 1 ? "us" : s?.to === 2 ? "them" : undefined })
        return
    }
    if (id === "99") {
        enqueueBanner({ kind: "sub", playerIn: formatPlayer(s?.player_in), playerOut: formatPlayer(s?.player) })
        return
    }
    if (id === "98") return
    // Any real point closing while a banner is up: clear it early rather
    // than let it linger over the next rally.
    if (s?.to !== 0 && activeBanner.value) advanceBanner()
}

const bannerChipColor = computed(() => {
    const b = activeBanner.value
    if (!b) return "#93a4bd"
    if (b.kind === "sub") return usColor.value
    return b.team === "us" ? usColor.value : b.team === "them" ? themColor : "#93a4bd"
})

let statsUnsub: (() => void) | null = null

// --- Set stats block (expanded panel): totals for the set that JUST ended.
// `currentSet` still points at that set until the app starts the next one.
const finishedSetGameStats = computed(() =>
    allStats.value.filter((s) => Number(s?.set?.number) === currentSet.value && !ADMIN_IDS.includes(aid(s)))
)
const finishedSetPointEnders = computed(() => finishedSetGameStats.value.filter((s) => s.to !== 0))
const setStatRows = computed(() => {
    const o = pointsOrigin(finishedSetPointEnders.value, deriveCredits(finishedSetGameStats.value))
    return [
        { key: "points", label: t("overlay.statsPoints"), us: cur.value.score_us, them: cur.value.score_them },
        { key: "attack", label: t("stats.originAttack"), us: o.attack.us, them: o.attack.them },
        { key: "block", label: t("stats.originBlock"), us: o.block.us, them: o.block.them },
        { key: "ace", label: t("stats.originAce"), us: o.ace.us, them: o.ace.them },
        { key: "errors", label: t("stats.originErrors"), us: o.errors.us, them: o.errors.them },
    ]
})
function barPct(v: number, total: number): number {
    return total > 0 ? Math.round((v / total) * 100) : 0
}

// Force a transparent canvas so OBS captures the page with alpha.
onMounted(() => {
    document.documentElement.style.background = "transparent"
    document.body.style.background = "transparent"
    document.documentElement.style.colorScheme = "normal"

    if (code && !demo) {
        let firstSnapshot = true
        const statsQuery = query(collection(db, "live_matches", code, "stats"), orderBy("order"))
        statsUnsub = onSnapshot(statsQuery, (snap) => {
            allStats.value = snap.docs.map((d) => d.data())
            // The first snapshot replays the whole match history — never
            // treat those as "live" events, only real additions afterwards.
            if (firstSnapshot) {
                firstSnapshot = false
                return
            }
            for (const change of snap.docChanges()) {
                if (change.type === "added") handleLiveStat(change.doc.data())
            }
        })
    }
})
onUnmounted(() => {
    document.documentElement.style.background = ""
    document.body.style.background = ""
    document.documentElement.style.colorScheme = ""
    statsUnsub?.()
    clearBannerTimer()
})
</script>

<template>
    <div class="overlay-root" v-if="ready">
        <Transition name="sb" mode="out-in">
            <!-- COMPACT — during a set -->
            <div v-if="phase === 'playing'" key="playing" class="compact-wrap" :style="compactStyle">
                <Transition name="banner">
                    <div
                        v-if="activeBanner"
                        :key="activeBanner.id"
                        class="banner"
                        :class="pos.startsWith('top') ? 'banner-below' : 'banner-above'"
                    >
                        <div class="banner-head">
                            <span class="banner-chip" :style="{ background: bannerChipColor }"></span>
                            <span class="banner-title">
                                {{ activeBanner.kind === "timeout" ? t("overlay.timeout") : t("overlay.substitution") }}
                            </span>
                            <span v-if="activeBanner.kind === 'timeout' && activeBanner.team" class="banner-team">
                                {{ activeBanner.team === "us" ? usName : themName }}
                            </span>
                        </div>
                        <div v-if="activeBanner.kind === 'sub'" class="banner-sub-rows">
                            <span class="banner-sub-row"><span class="arrow arrow-in">↑</span>{{ activeBanner.playerIn }}</span>
                            <span class="banner-sub-row"><span class="arrow arrow-out">↓</span>{{ activeBanner.playerOut }}</span>
                        </div>
                    </div>
                </Transition>
                <div class="compact">
                    <div class="compact-head">SET {{ currentSet }}</div>
                    <div class="team-row">
                        <span class="chip" :style="{ background: usColor }"></span>
                        <span class="tname">{{ usName }}</span>
                        <span class="sets">{{ effUs }}</span>
                        <span class="pts">{{ cur.score_us }}</span>
                    </div>
                    <div class="team-row">
                        <span class="chip" :style="{ background: themColor }"></span>
                        <span class="tname">{{ themName }}</span>
                        <span class="sets">{{ effThem }}</span>
                        <span class="pts">{{ cur.score_them }}</span>
                    </div>
                </div>
            </div>

            <!-- EXPANDED — between sets / match over -->
            <div v-else key="between" class="expanded" :style="expandedStyle">
                <div class="headline">{{ headline }}</div>
                <div class="panel">
                    <div class="big-team" :class="{ winner: matchOver && effUs > effThem }">
                        <span class="chip" :style="{ background: usColor }"></span>
                        <span class="bname">{{ usName }}</span>
                        <span class="bsets">{{ effUs }}</span>
                    </div>
                    <div class="big-team" :class="{ winner: matchOver && effThem > effUs }">
                        <span class="chip" :style="{ background: themColor }"></span>
                        <span class="bname">{{ themName }}</span>
                        <span class="bsets">{{ effThem }}</span>
                    </div>
                    <div class="divider"></div>
                    <div class="set-line" v-for="s in playedSets" :key="s.number">
                        <span class="slabel">Set {{ s.number }}</span>
                        <span class="sval" :class="{ win: s.score_us > s.score_them }">{{ s.score_us }}</span>
                        <span class="sval" :class="{ win: s.score_them > s.score_us }">{{ s.score_them }}</span>
                    </div>

                    <!-- Estadísticas del set recién terminado -->
                    <template v-if="setStatRows.some((r) => r.us + r.them > 0)">
                        <div class="divider"></div>
                        <div class="stats-title">{{ t("overlay.setStatsTitle") }}</div>
                        <div class="stat-row" v-for="row in setStatRows" :key="row.key">
                            <div class="stat-label">{{ row.label }}</div>
                            <div class="stat-line">
                                <span class="stat-num">{{ row.us }}</span>
                                <div class="stat-track">
                                    <div class="stat-half us">
                                        <div
                                            class="stat-fill"
                                            :style="{ width: barPct(row.us, row.us + row.them) + '%', background: usColor }"
                                        ></div>
                                    </div>
                                    <div class="stat-half them">
                                        <div
                                            class="stat-fill"
                                            :style="{ width: barPct(row.them, row.us + row.them) + '%', background: themColor }"
                                        ></div>
                                    </div>
                                </div>
                                <span class="stat-num">{{ row.them }}</span>
                            </div>
                        </div>
                    </template>
                </div>
            </div>
        </Transition>
    </div>
</template>

<style scoped>
.overlay-root {
    position: fixed;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    color: #fff;
    font-family: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    font-variant-numeric: tabular-nums;
}

/* ---------- COMPACT ---------- */
.compact-wrap {
    position: absolute;
}
.compact {
    position: relative;
    min-width: 340px;
    padding: 10px 16px 14px;
    background: rgba(9, 12, 20, 0.82);
    backdrop-filter: blur(6px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
}

/* ---------- BANNER (timeout / substitution) ---------- */
.banner {
    position: absolute;
    left: 0;
    right: 0;
    min-width: 340px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 16px;
    background: rgba(9, 12, 20, 0.92);
    backdrop-filter: blur(6px);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
}
.banner-above {
    bottom: 100%;
    margin-bottom: 10px;
}
.banner-below {
    top: 100%;
    margin-top: 10px;
}
.banner-head {
    display: flex;
    align-items: center;
    gap: 10px;
}
.banner-chip {
    width: 14px;
    height: 14px;
    border-radius: 4px;
    flex-shrink: 0;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.25) inset;
}
.banner-title {
    font-size: 16px;
    font-weight: 800;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #fff;
}
.banner-team {
    font-size: 16px;
    font-weight: 700;
    text-transform: uppercase;
    color: #93a4bd;
}
.banner-sub-rows {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding-left: 24px;
}
.banner-sub-row {
    font-size: 18px;
    font-weight: 700;
    color: #e5ecf7;
    display: flex;
    align-items: center;
    gap: 8px;
}
.arrow {
    font-weight: 900;
    font-size: 18px;
    line-height: 1;
}
.arrow-in {
    color: #4ade80;
}
.arrow-out {
    color: #f87171;
}
.compact-head {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.18em;
    color: #93a4bd;
    margin-bottom: 8px;
}
.team-row {
    display: grid;
    grid-template-columns: 14px 1fr auto auto;
    align-items: center;
    column-gap: 14px;
    padding: 3px 0;
}
.chip {
    width: 14px;
    height: 14px;
    border-radius: 4px;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.25) inset;
}
.tname {
    font-size: 26px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.01em;
    max-width: 320px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.sets {
    font-size: 24px;
    font-weight: 700;
    color: #93a4bd;
    min-width: 24px;
    text-align: center;
}
.pts {
    font-size: 40px;
    font-weight: 800;
    min-width: 56px;
    text-align: center;
    line-height: 1;
}

/* ---------- EXPANDED ---------- */
.expanded {
    position: absolute;
    top: 50%;
    left: 50%;
    text-align: center;
}
.headline {
    font-size: 22px;
    font-weight: 700;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: #93a4bd;
    margin-bottom: 18px;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.8);
}
.panel {
    min-width: 560px;
    padding: 34px 48px;
    background: rgba(9, 12, 20, 0.9);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 20px;
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.55);
}
.big-team {
    display: grid;
    grid-template-columns: 22px 1fr auto;
    align-items: center;
    column-gap: 22px;
    padding: 8px 0;
    opacity: 0.92;
}
.big-team.winner {
    opacity: 1;
}
.big-team .chip {
    width: 22px;
    height: 22px;
    border-radius: 6px;
}
.bname {
    font-size: 56px;
    font-weight: 800;
    text-transform: uppercase;
    text-align: left;
}
.bsets {
    font-size: 72px;
    font-weight: 900;
    line-height: 1;
    min-width: 90px;
    text-align: center;
}
.winner .bsets {
    color: #4ade80;
}
.divider {
    height: 1px;
    background: rgba(255, 255, 255, 0.14);
    margin: 20px 0 16px;
}
.set-line {
    display: grid;
    grid-template-columns: 1fr 70px 70px;
    align-items: center;
    column-gap: 12px;
    padding: 5px 0;
}
.slabel {
    text-align: left;
    font-size: 22px;
    font-weight: 600;
    color: #93a4bd;
    letter-spacing: 0.06em;
}
.sval {
    font-size: 30px;
    font-weight: 700;
    text-align: center;
    color: #d5deec;
}
.sval.win {
    color: #fff;
}

/* ---------- SET STATS (expanded panel) ---------- */
.stats-title {
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    text-align: left;
    color: #93a4bd;
    margin: 0 0 12px;
}
.stat-row {
    text-align: left;
    margin: 0 0 12px;
}
.stat-row:last-child {
    margin-bottom: 0;
}
.stat-label {
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #93a4bd;
    margin-bottom: 5px;
}
.stat-line {
    display: flex;
    align-items: center;
    gap: 10px;
}
.stat-num {
    font-size: 20px;
    font-weight: 800;
    min-width: 28px;
    text-align: center;
    color: #fff;
}
.stat-track {
    flex: 1;
    display: flex;
    height: 10px;
    border-radius: 6px;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.08);
}
.stat-half {
    flex: 1;
    display: flex;
}
.stat-half.us {
    justify-content: flex-end;
}
.stat-half.them {
    justify-content: flex-start;
}
.stat-fill {
    height: 100%;
}

/* ---------- transition between the two states ---------- */
.sb-enter-active,
.sb-leave-active {
    transition: opacity 0.45s ease, transform 0.45s ease;
}
.compact-wrap.sb-enter-from,
.compact-wrap.sb-leave-to {
    opacity: 0;
}
.expanded.sb-enter-from,
.expanded.sb-leave-to {
    opacity: 0;
}

/* ---------- banner enter/leave ---------- */
.banner-enter-active,
.banner-leave-active {
    transition: opacity 0.35s ease, transform 0.35s ease;
}
.banner-above.banner-enter-from,
.banner-above.banner-leave-to {
    opacity: 0;
    transform: translateY(8px);
}
.banner-below.banner-enter-from,
.banner-below.banner-leave-to {
    opacity: 0;
    transform: translateY(-8px);
}
</style>
