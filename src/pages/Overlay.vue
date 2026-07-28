<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useI18n } from "vue-i18n"
import { collection, doc, onSnapshot, orderBy, query } from "firebase/firestore"
import { useDocument } from "vuefire"
import { db } from "../firebase"
import { ADMIN_IDS, aid, deriveCredits, isRival, pointsOrigin, rivalServing } from "../utils/volleyStats"

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
    team?: { id?: string; name?: string; color?: string }
    opponent?: string
    n_sets?: number
    sets_us?: number
    sets_them?: number
    current_set?: number
    set_closed?: boolean
    sets_scoreboard?: SetScore[]
}

// Remote placement config, published (optionally) on `teams/{team.id}.overlay`
// by the apps: `pos`/`scale`/`banners` mirror the URL params below and, once
// published, take priority over them — see the priority cascade (session >
// remote > URL > default) further down.
interface RemoteOverlay {
    pos?: string
    scale?: number
    banners?: string
}

const route = useRoute()
const router = useRouter()
const code = String(route.params.code ?? "")

// ?setup shows a floating, non-transparent configuration panel with a live
// preview of the overlay (usable in a normal browser, not meant for OBS).
const isSetup = computed(() => route.query.setup !== undefined)
const hasAnyQueryParam = computed(() => Object.keys(route.query).length > 0)

// Demo mode (?demo=1 in-play, ?demo=between between sets) feeds mock data so the
// overlay can be styled and placed in OBS without a real live match (and without
// touching Firestore, so it works with no .env). Kept as a ref (rather than the
// original plain const) so the setup panel's "demo data" toggle can flip it live.
const demo = ref<string>(
    typeof route.query.demo === "string" ? route.query.demo : route.query.demo != null ? "1" : ""
)
const demoOn = computed<boolean>({
    get: () => !!demo.value,
    set: (v) => {
        demo.value = v ? "1" : ""
    },
})

const liveMatch = useDocument<LiveMatch>(
    computed(() => (code && !demo.value ? doc(db, "live_matches", code) : null))
)
const demoData = computed<LiveMatch | null>(() => {
    if (!demo.value) return null
    const between = demo.value === "between"
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

// --- OBS placement: `pos`/`scale`/`banners` follow a priority cascade —
// session override from the `?setup` panel (only while the streamer is
// actively touching controls on that page) > remote `teams/{team.id}.overlay`
// config (see `remoteOverlay` below, hot-reloaded so a streamer can nudge
// things from the app mid-broadcast) > explicit URL query param > hardcoded
// default. Putting remote ahead of the URL param is deliberate: OBS/Prism
// Browser Sources are typically set up once with `?pos=...&scale=...` baked
// in and never touched again, so if the URL always won, publishing a remote
// config from the app would silently do nothing for anyone with an
// already-configured overlay. The `*UrlParam` values are parsed once from the
// query at load time and never change; the `*Session` refs start at `null`
// and are populated ONLY by the setup panel's controls. The plain
// `pos`/`scale`/`bannersMode` computeds below resolve the cascade and are
// what the template/styles read.
const posOptions = ["bottom-left", "bottom-right", "top-left", "top-right"] as const
type Pos = (typeof posOptions)[number]
function parsePos(v: unknown): Pos | null {
    const s = String(v ?? "")
    return (posOptions as readonly string[]).includes(s) ? (s as Pos) : null
}
function parseScale(v: unknown): number | null {
    const n = Number(v)
    return Number.isFinite(n) && n >= 0.5 && n <= 2 ? n : null
}
// Banner layout for timeout/substitution notices, relative to the compact
// bar: "side"/"stack" are the historical auto modes (side picks left/right,
// stack picks above/below, both based on which screen corner the bar sits
// in); "top"/"bottom"/"left"/"right" pin the banner to that explicit edge of
// the bar regardless of corner, letting the streamer override the auto
// choice (e.g. push it toward screen center, or deliberately off-screen-ish
// for a tighter crop). "side" stays the default for URLs with no `banners`.
type BannersMode = "side" | "stack" | "top" | "bottom" | "left" | "right"
const BANNERS_MODES: readonly BannersMode[] = ["side", "stack", "top", "bottom", "left", "right"]
function parseBannersMode(v: unknown): BannersMode | null {
    const s = String(v ?? "")
    return (BANNERS_MODES as readonly string[]).includes(s) ? (s as BannersMode) : null
}

// Parsed once from the URL at load time — immutable for the life of the page
// (unlike the session overrides below, these never change once resolved).
const posUrlParam = parsePos(route.query.pos)
const scaleUrlParam = parseScale(route.query.scale)
const bannersUrlParam = parseBannersMode(route.query.banners)

// Populated ONLY by the `?setup` panel's controls (see the `@click`/`v-model`
// handlers below) — stays `null` for the whole session otherwise, including
// for OBS/Prism sources opened straight from a saved URL.
const posSession = ref<Pos | null>(null)
const scaleSession = ref<number | null>(null)
const bannersSession = ref<BannersMode | null>(null)

const pos = computed<Pos>(() => posSession.value ?? parsePos(remoteOverlay.value?.pos) ?? posUrlParam ?? "bottom-left")
const scale = computed<number>(() => scaleSession.value ?? parseScale(remoteOverlay.value?.scale) ?? scaleUrlParam ?? 1)
// Writable proxy for the setup panel's range input (`v-model.number`) — it
// just funnels edits into the session override; reads still go through the
// resolved cascade above.
const scaleInput = computed<number>({
    get: () => scale.value,
    set: (v) => {
        scaleSession.value = v
    },
})
const bannersMode = computed<BannersMode>(
    () => bannersSession.value ?? parseBannersMode(remoteOverlay.value?.banners) ?? bannersUrlParam ?? "side"
)
// Resolves the mode above into one of the 4 concrete edges the CSS actually
// draws. Auto modes derive the edge from `pos` (the bar's screen corner):
// "side" flares toward the horizontal center, "stack" toward the vertical
// center — same rule as before, just factored out so explicit modes can
// short-circuit it.
const bannerDir = computed<"top" | "bottom" | "left" | "right">(() => {
    switch (bannersMode.value) {
        case "top":
        case "bottom":
        case "left":
        case "right":
            return bannersMode.value
        case "stack":
            return pos.value.startsWith("top") ? "bottom" : "top"
        case "side":
        default:
            return pos.value.includes("left") ? "right" : "left"
    }
})
const bannerAxis = computed<"vertical" | "horizontal">(() =>
    bannerDir.value === "top" || bannerDir.value === "bottom" ? "vertical" : "horizontal"
)

const compactStyle = computed(() => {
    const m = "3vmin"
    const base: Record<string, string> = { transform: `scale(${scale.value})` }
    switch (pos.value) {
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
    transform: `translate(-50%, -50%) scale(${scale.value})`,
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
// Fallback is brand-400 (#6E93FF, see tailwind.config.js) — the site's own
// blue — instead of an arbitrary sky tone, so an unbranded match still reads
// as "Voley Stats" rather than a generic color.
const usColor = computed(() => cssColor(match.value?.team?.color, "#6E93FF"))
const themColor = "#F87171"

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

// --- Stats subcollection: momentary banners (timeout/substitution), the
// serving-team indicator and the "set stats" block of the expanded panel.
// Same query shape as GeneralStats.vue. Skipped entirely in demo mode (no
// Firestore needed) — see startStatsSubscription/stopStatsSubscription below,
// which (re)start it reactively as the setup panel's demo toggle flips.
const allStats = ref<any[]>([])

interface BannerItem {
    id: number
    kind: "timeout" | "sub"
    team?: "us" | "them"
    playerIn?: string
    playerOut?: string
    setNumber?: number
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
        enqueueBanner({
            kind: "timeout",
            team: s?.to === 1 ? "us" : s?.to === 2 ? "them" : undefined,
            setNumber: Number(s?.set?.number),
        })
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
// Vertical layout (top/bottom edge) keeps the original team-color left
// border; horizontal layout (left/right edge) shows the accent as a top
// inset line instead (the left/right edge is the seam glued to the compact
// bar, so it can't carry a 4px accent border there).
const bannerAccentStyle = computed(() => ({ borderLeftColor: bannerChipColor.value }))
const bannerPosClass = computed(() => {
    if (bannerAxis.value === "vertical") return bannerDir.value === "top" ? "banner-above" : "banner-below"
    return bannerDir.value === "right" ? "banner-extend-right" : "banner-extend-left"
})

// Tiempos muertos gastados EN ESTE SET por el equipo que acaba de pedirlo
// (incluido el que acaba de llegar): cuenta stats `action.id=="0"` del mismo
// `to` (equipo) y mismo `set.number`. `null` cuando no es computable (datos
// viejos sin `to`) — el contador se omite en ese caso.
const timeoutCount = computed<number | null>(() => {
    const b = activeBanner.value
    if (!b || b.kind !== "timeout" || !b.team || !Number.isFinite(b.setNumber)) return null
    const toValue = b.team === "us" ? 1 : 2
    return allStats.value.filter(
        (s) => aid(s) === "0" && Number(s?.to) === toValue && Number(s?.set?.number) === b.setNumber
    ).length
})

// --- Serving-team indicator (compact bar): the current rally is served by
// the team on `server` of the LAST stat (skipping admin stats); if that last
// stat already closed a rally (`to !== 0`), the next serve goes to whoever
// won it. `null` (nothing shown) until there is at least one real stat.
const servingTeam = computed<"us" | "them" | null>(() => {
    const stats = allStats.value
    for (let i = stats.length - 1; i >= 0; i--) {
        const s = stats[i]
        if (ADMIN_IDS.includes(aid(s))) continue
        if (s?.to === 1) return "us"
        if (s?.to === 2) return "them"
        if (s?.server == null) return null
        return rivalServing(s) ? "them" : "us"
    }
    return null
})

// --- Remote overlay config: `teams/{team.id}.overlay`, hot-reloaded so a
// streamer can reposition/rescale the scoreboard from the app while watching
// the live output, without touching OBS. Subscribes once the match doc
// resolves `team.id`; re-subscribes if the id changes; skipped entirely in
// demo mode (no real team doc) — see the `id` computation below.
const remoteOverlay = ref<RemoteOverlay | null>(null)
let teamUnsub: (() => void) | null = null
let subscribedTeamId: string | null = null

function stopTeamSubscription() {
    teamUnsub?.()
    teamUnsub = null
    subscribedTeamId = null
    remoteOverlay.value = null
}

watch(
    () => (demo.value ? null : match.value?.team?.id ?? null),
    (id) => {
        if (id === subscribedTeamId) return
        stopTeamSubscription()
        if (!id) return
        subscribedTeamId = id
        teamUnsub = onSnapshot(doc(db, "teams", id), (snap) => {
            remoteOverlay.value = (snap.data() as { overlay?: RemoteOverlay } | undefined)?.overlay ?? null
        })
    },
    { immediate: true }
)

let statsUnsub: (() => void) | null = null

function startStatsSubscription() {
    if (statsUnsub || !code || demo.value) return
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
function stopStatsSubscription() {
    statsUnsub?.()
    statsUnsub = null
    allStats.value = []
    bannerQueue.value = []
    activeBanner.value = null
    clearBannerTimer()
}

// --- Set stats block (expanded panel): a ONE-SIDED summary of our own
// team's set — this app captures almost exclusively our own actions, so the
// rival's columns are essentially always empty; showing them side by side
// (as the old comparative bars did) is misleading. `currentSet` still points
// at the set that just ended until the app starts the next one.
const finishedSetGameStats = computed(() =>
    allStats.value.filter((s) => Number(s?.set?.number) === currentSet.value && !ADMIN_IDS.includes(aid(s)))
)
const finishedSetPointEnders = computed(() => finishedSetGameStats.value.filter((s) => s.to !== 0))
const finishedSetCredits = computed(() => deriveCredits(finishedSetGameStats.value))

const setOriginRows = computed(() => {
    const o = pointsOrigin(finishedSetPointEnders.value, finishedSetCredits.value)
    const usTotal = cur.value.score_us || 0
    const rows = [
        { key: "attack", label: t("stats.originAttack"), value: o.attack.us },
        { key: "block", label: t("stats.originBlock"), value: o.block.us },
        { key: "ace", label: t("stats.originAce"), value: o.ace.us },
        { key: "errors", label: t("stats.originErrors"), value: o.errors.us },
    ]
    return rows.map((row) => ({ ...row, pct: usTotal > 0 ? Math.round((row.value / usTotal) * 100) : 0 }))
})

// Top scorer of the set just finished — same crediting rules as
// GeneralStats.vue's `topScorers` (court-capture wins recorded as a rival
// "error" get reattributed to whoever actually earned the credit).
const setTopScorer = computed<{ name: string; points: number } | null>(() => {
    const credits = finishedSetCredits.value
    const byPlayer = new Map<string, number>()
    for (const s of finishedSetPointEnders.value) {
        if (s.to !== 1) continue
        if (!isRival(s)) {
            const name = s.player?.name ?? ""
            if (name) byPlayer.set(name, (byPlayer.get(name) ?? 0) + 1)
            continue
        }
        const credit = credits.creditedBy.get(s)
        if (!credit) continue
        const name = (credits.aces.has(credit) ? credit.server?.name : credit.player?.name) ?? ""
        if (name) byPlayer.set(name, (byPlayer.get(name) ?? 0) + 1)
    }
    const sorted = [...byPlayer.entries()].sort((a, b) => b[1] - a[1])
    return sorted[0] ? { name: sorted[0][0], points: sorted[0][1] } : null
})

// --- Setup-mode discoverability: a small "configure" link, shown only when
// the overlay is opened bare (no query params at all — a configured OBS
// Browser Source always carries at least `?pos`/`?scale`) AND a real mouse
// has actually moved over the page. OBS's Browser Source never dispatches
// mouse events on an unattended capture, so requiring one (on top of the
// "no params" check, and auto-hiding after a few seconds either way) keeps
// this from ever appearing in a real broadcast.
const showSetupHint = ref(false)
let hintTimer: ReturnType<typeof setTimeout> | null = null
function armSetupHint() {
    if (isSetup.value || hasAnyQueryParam.value) return
    showSetupHint.value = true
    hintTimer = setTimeout(() => {
        showSetupHint.value = false
    }, 6000)
}

// --- Setup panel: final OBS URL (current pos/scale/banners, never `setup`
// or `demo` — those two are preview-only) + clipboard copy.
// Only bakes in an explicit `pos`/`scale`/`banners` param when the streamer
// actually touched that control in THIS session (the `*Session` refs) —
// leaving a control untouched means the copied URL has no opinion on it, so
// the remote config (and, failing that, the default) keeps applying live
// even after this URL is pasted into OBS.
const finalOverlayUrl = computed(() => {
    const q: Record<string, string> = {}
    if (posSession.value) q.pos = posSession.value
    if (scaleSession.value != null) q.scale = String(scaleSession.value)
    if (bannersSession.value) q.banners = bannersSession.value
    const resolved = router.resolve({ name: "overlay", params: { code }, query: q })
    return `${window.location.origin}${resolved.href}`
})
const copied = ref(false)
async function copyFinalUrl() {
    try {
        await navigator.clipboard.writeText(finalOverlayUrl.value)
        copied.value = true
        setTimeout(() => {
            copied.value = false
        }, 1800)
    } catch {
        // Clipboard API can be unavailable (permissions/non-secure context);
        // the URL is still visible and selectable in the panel.
    }
}

// Force a transparent canvas so OBS captures the page with alpha (setup mode
// draws its own checkerboard backdrop on top, see template).
onMounted(() => {
    document.documentElement.style.background = "transparent"
    document.body.style.background = "transparent"
    document.documentElement.style.colorScheme = "normal"

    startStatsSubscription()

    if (!isSetup.value && !hasAnyQueryParam.value) {
        window.addEventListener("mousemove", armSetupHint, { once: true })
    }
})
// Lets the setup panel's demo toggle switch live between the real Firestore
// stream and the mock data without a page reload.
watch(demo, (isDemo) => {
    if (isDemo) stopStatsSubscription()
    else startStatsSubscription()
})
onUnmounted(() => {
    document.documentElement.style.background = ""
    document.body.style.background = ""
    document.documentElement.style.colorScheme = ""
    stopStatsSubscription()
    stopTeamSubscription()
    window.removeEventListener("mousemove", armSetupHint)
    if (hintTimer) clearTimeout(hintTimer)
})
</script>

<template>
    <div class="overlay-root">
        <div v-if="isSetup" class="setup-checkerboard"></div>

        <template v-if="ready">
            <Transition name="sb" mode="out-in">
                <!-- COMPACT — during a set -->
                <div v-if="phase === 'playing'" key="playing" class="compact-wrap" :style="compactStyle">
                    <Transition :name="bannerAxis === 'vertical' ? 'banner' : 'banner-side'">
                        <div v-if="activeBanner" :key="activeBanner.id" class="banner" :class="bannerPosClass" :style="bannerAccentStyle">
                            <div v-if="activeBanner.kind === 'timeout'" class="banner-head">
                                <span class="banner-title">{{ t("overlay.timeout") }}</span>
                                <span v-if="activeBanner.team" class="banner-team">
                                    {{ activeBanner.team === "us" ? usName : themName }}
                                </span>
                                <span v-if="timeoutCount !== null" class="to-dots">
                                    <span
                                        v-for="n in 2"
                                        :key="n"
                                        class="to-dot"
                                        :class="{ filled: n <= timeoutCount }"
                                        :style="n <= timeoutCount ? { background: bannerChipColor, borderColor: bannerChipColor } : {}"
                                    ></span>
                                </span>
                            </div>
                            <div v-else class="banner-sub">
                                <!-- Substitutions are always our own roster (see handleLiveStat) — spell
                                     out the team explicitly (chip + name) so it reads the same way the
                                     timeout banner names its requester. -->
                                <div class="banner-team-row">
                                    <span class="chip" :style="{ background: usColor }"></span>
                                    <span class="banner-team">{{ usName }}</span>
                                </div>
                                <div class="banner-sub-rows">
                                    <span class="banner-sub-row"><span class="arrow arrow-in">↑</span>{{ activeBanner.playerIn }}</span>
                                    <span class="banner-sub-row"><span class="arrow arrow-out">↓</span>{{ activeBanner.playerOut }}</span>
                                </div>
                            </div>
                        </div>
                    </Transition>
                    <div class="compact">
                        <div class="compact-head">SET {{ currentSet }}</div>
                        <div class="team-row">
                            <span class="chip" :style="{ background: usColor }"></span>
                            <span class="tname">{{ usName }}</span>
                            <span class="sets">{{ effUs }}</span>
                            <span class="pts-wrap">
                                <span v-if="servingTeam === 'us'" class="serve-dot"></span>
                                <span class="pts">{{ cur.score_us }}</span>
                            </span>
                        </div>
                        <div class="team-row">
                            <span class="chip" :style="{ background: themColor }"></span>
                            <span class="tname">{{ themName }}</span>
                            <span class="sets">{{ effThem }}</span>
                            <span class="pts-wrap">
                                <span v-if="servingTeam === 'them'" class="serve-dot"></span>
                                <span class="pts">{{ cur.score_them }}</span>
                            </span>
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

                        <!-- Resumen de NUESTROS puntos del set + máxima anotadora -->
                        <template v-if="setOriginRows.some((r) => r.value > 0) || setTopScorer">
                            <div class="divider"></div>
                            <div class="stats-title">{{ t("overlay.setStatsTitle") }}</div>
                            <div class="origin-row" v-for="row in setOriginRows" :key="row.key">
                                <span class="origin-label">{{ row.label }}</span>
                                <div class="origin-track">
                                    <div class="origin-fill" :style="{ width: row.pct + '%', background: usColor }"></div>
                                </div>
                                <span class="origin-num">{{ row.value }}</span>
                            </div>
                            <div v-if="setTopScorer" class="top-scorer">
                                <span class="top-scorer-label">{{ t("overlay.topScorer") }}</span>
                                <span class="top-scorer-name">{{ setTopScorer.name }}</span>
                                <span class="top-scorer-pts">{{ setTopScorer.points }}</span>
                            </div>
                        </template>
                    </div>
                </div>
            </Transition>
        </template>
        <div v-else-if="isSetup" class="setup-empty-hint">{{ t("overlay.setupNoLiveData") }}</div>

        <RouterLink
            v-if="showSetupHint"
            :to="{ name: 'overlay', params: { code }, query: { setup: '1' } }"
            class="btn-ghost setup-hint-btn pointer-events-auto fixed bottom-4 right-4 z-20 !px-4 !py-2 text-xs opacity-90 hover:opacity-100"
        >
            ⚙︎ {{ t("overlay.configure") }}
        </RouterLink>

        <aside
            v-if="isSetup"
            class="pointer-events-auto fixed right-4 top-4 z-20 max-h-[calc(100vh-32px)] w-[320px] overflow-y-auto rounded-2xl border border-white/10 bg-ink-900/95 p-5 text-slate-200 shadow-card backdrop-blur-xl"
        >
            <h2 class="font-display text-lg font-bold tracking-tight text-white">{{ t("overlay.setupTitle") }}</h2>
            <p class="mt-1 text-xs text-slate-400">{{ t("overlay.setupSubtitle") }}</p>
            <p class="mt-1 text-[11px] text-slate-500">{{ t("overlay.setupRemoteNote") }}</p>

            <div class="mt-5">
                <p class="eyebrow !py-1 !text-[10px]">{{ t("overlay.setupPos") }}</p>
                <div class="mt-2 grid grid-cols-2 gap-2">
                    <button
                        v-for="p in posOptions"
                        :key="p"
                        type="button"
                        class="rounded-lg border px-3 py-2 text-xs font-semibold transition-colors"
                        :class="pos === p ? 'border-brand-400 bg-brand-500/20 text-white' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'"
                        @click="posSession = p"
                    >
                        {{ t(`overlay.pos.${p}`) }}
                    </button>
                </div>
            </div>

            <div class="mt-5">
                <label class="eyebrow !py-1 !text-[10px]" for="setup-scale">{{ t("overlay.setupScale") }} · {{ scale.toFixed(2) }}×</label>
                <input id="setup-scale" v-model.number="scaleInput" type="range" min="0.5" max="2" step="0.05" class="mt-2 w-full accent-volt-400" />
            </div>

            <div class="mt-5">
                <p class="eyebrow !py-1 !text-[10px]">{{ t("overlay.setupBanners") }}</p>
                <!-- D-pad layout: direction is relative to the compact bar, so
                     arrows read naturally regardless of which corner it's pinned to. -->
                <div class="mt-2 grid grid-cols-3 gap-2">
                    <span></span>
                    <button
                        type="button"
                        :title="t('overlay.bannersTop')"
                        class="flex h-9 items-center justify-center rounded-lg border text-base font-semibold leading-none transition-colors"
                        :class="bannersMode === 'top' ? 'border-brand-400 bg-brand-500/20 text-white' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'"
                        @click="bannersSession = 'top'"
                    >
                        ↑
                    </button>
                    <span></span>

                    <button
                        type="button"
                        :title="t('overlay.bannersLeft')"
                        class="flex h-9 items-center justify-center rounded-lg border text-base font-semibold leading-none transition-colors"
                        :class="bannersMode === 'left' ? 'border-brand-400 bg-brand-500/20 text-white' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'"
                        @click="bannersSession = 'left'"
                    >
                        ←
                    </button>
                    <button
                        type="button"
                        :title="t('overlay.bannersAuto')"
                        class="flex h-9 items-center justify-center rounded-lg border text-[10px] font-semibold uppercase tracking-wide transition-colors"
                        :class="bannersMode === 'side' ? 'border-brand-400 bg-brand-500/20 text-white' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'"
                        @click="bannersSession = 'side'"
                    >
                        {{ t("overlay.bannersAuto") }}
                    </button>
                    <button
                        type="button"
                        :title="t('overlay.bannersRight')"
                        class="flex h-9 items-center justify-center rounded-lg border text-base font-semibold leading-none transition-colors"
                        :class="bannersMode === 'right' ? 'border-brand-400 bg-brand-500/20 text-white' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'"
                        @click="bannersSession = 'right'"
                    >
                        →
                    </button>

                    <span></span>
                    <button
                        type="button"
                        :title="t('overlay.bannersBottom')"
                        class="flex h-9 items-center justify-center rounded-lg border text-base font-semibold leading-none transition-colors"
                        :class="bannersMode === 'bottom' ? 'border-brand-400 bg-brand-500/20 text-white' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'"
                        @click="bannersSession = 'bottom'"
                    >
                        ↓
                    </button>
                    <span></span>
                </div>
            </div>

            <label class="mt-5 flex items-center justify-between gap-3">
                <span class="text-xs font-medium uppercase tracking-widest text-brand-300">{{ t("overlay.setupDemo") }}</span>
                <input v-model="demoOn" type="checkbox" class="h-4 w-4 accent-volt-400" />
            </label>

            <div class="mt-6 border-t border-white/10 pt-4">
                <p class="text-xs font-medium uppercase tracking-widest text-brand-300">{{ t("overlay.setupUrlLabel") }}</p>
                <code class="mt-2 block break-all rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[11px] text-slate-300">{{
                    finalOverlayUrl
                }}</code>
                <button type="button" class="btn-primary mt-3 w-full !py-2 text-xs" @click="copyFinalUrl">
                    {{ copied ? t("overlay.copied") : t("overlay.copyUrl") }}
                </button>
            </div>
        </aside>
    </div>
</template>

<style scoped>
.overlay-root {
    /* Real design tokens from tailwind.config.js (ink/brand/volt) as CSS vars
       — rgba() below reference these instead of freehand hex guesses, and
       everything under this root (scoreboard, setup panel, hint button)
       inherits them regardless of Vue's scoped-style attribute. */
    --c-ink-950-rgb: 7, 10, 18;
    --c-ink-900-rgb: 11, 15, 26;
    --c-ink-850-rgb: 15, 21, 36;
    --c-ink-700-rgb: 36, 48, 79;
    --c-ink-600-rgb: 51, 66, 106;
    --c-brand-200: #c7d8ff;
    --c-brand-500-rgb: 61, 107, 255;
    --c-volt-400: #cbfb45;
    --c-slate-200: #e2e8f0;
    --c-slate-400: #94a3b8;
    /* Same stacks as tailwind.config.js fontFamily.sans/display, loaded via
       the Google Fonts <link> in index.html (weights 400–700 only). */
    --font-sans: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    --font-display: "Space Grotesk", "Inter", ui-sans-serif, system-ui, sans-serif;

    position: fixed;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    color: #fff;
    font-family: var(--font-sans);
    font-variant-numeric: tabular-nums;
}

/* ---------- SETUP MODE ---------- */
.setup-checkerboard {
    position: absolute;
    inset: 0;
    background-color: rgba(var(--c-ink-950-rgb), 1);
    background-image: linear-gradient(45deg, rgba(255, 255, 255, 0.06) 25%, transparent 25%),
        linear-gradient(-45deg, rgba(255, 255, 255, 0.06) 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, rgba(255, 255, 255, 0.06) 75%),
        linear-gradient(-45deg, transparent 75%, rgba(255, 255, 255, 0.06) 75%);
    background-size: 24px 24px;
    background-position: 0 0, 0 12px, 12px -12px, -12px 0;
}
.setup-empty-hint {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    max-width: 420px;
    padding: 20px 26px;
    border-radius: 16px;
    background: rgba(var(--c-ink-900-rgb), 0.9);
    border: 1px solid rgba(var(--c-brand-500-rgb), 0.24);
    color: var(--c-slate-400);
    font-size: 15px;
    font-weight: 600;
    text-align: center;
}
.setup-hint-btn {
    font-family: var(--font-sans);
    text-decoration: none;
}

/* ---------- COMPACT ---------- */
.compact-wrap {
    position: absolute;
}
.compact {
    position: relative;
    min-width: 340px;
    padding: 10px 16px 14px;
    background: rgba(var(--c-ink-900-rgb), 0.88);
    backdrop-filter: blur(6px);
    border: 1px solid rgba(var(--c-brand-500-rgb), 0.24);
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
}

/* ---------- BANNER (timeout / substitution) ---------- */
/* Single layout for every direction: header row (title/team, wraps if
   needed) + stacked rows below. Only the anchor position below (and the
   enter/leave animation, further down) changes per `bannerDir`. */
.banner {
    position: absolute;
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 340px;
    padding: 10px 16px 10px 14px;
    background: rgba(var(--c-ink-950-rgb), 0.94);
    backdrop-filter: blur(6px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-left: 4px solid rgba(255, 255, 255, 0.3);
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
}

/* Anchor position relative to the compact bar — the only thing that
   differs between banner directions. */
.banner-above {
    left: 0;
    right: 0;
    bottom: 100%;
    margin-bottom: 10px;
}
.banner-below {
    left: 0;
    right: 0;
    top: 100%;
    margin-top: 10px;
}
.banner-extend-right {
    top: 0;
    left: 100%;
    margin-left: 10px;
}
.banner-extend-left {
    top: 0;
    right: 100%;
    margin-right: 10px;
}
.banner-head {
    display: flex;
    align-items: center;
    /* Wraps rather than compresses when title + team + timeout dots don't
       fit on one line at the banner's width. */
    flex-wrap: wrap;
    gap: 10px;
    row-gap: 4px;
}
.banner-sub {
    display: flex;
    flex-direction: column;
    gap: 6px;
}
.banner-team-row {
    display: flex;
    align-items: center;
    gap: 8px;
}
.banner-title {
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--c-brand-200);
}
.banner-team {
    font-size: 16px;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--c-slate-400);
}
.to-dots {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-left: auto;
}
.to-dot {
    width: 11px;
    height: 11px;
    border-radius: 50%;
    border: 2px solid rgba(var(--c-ink-600-rgb), 0.9);
    background: transparent;
    box-sizing: border-box;
}
.to-dot.filled {
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.25) inset;
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
    color: var(--c-slate-200);
    display: flex;
    align-items: center;
    gap: 8px;
}
.arrow {
    font-weight: 700;
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
    color: var(--c-slate-400);
    margin-bottom: 8px;
}
.team-row {
    display: grid;
    grid-template-columns: 14px 1fr auto auto;
    align-items: center;
    column-gap: 14px;
    padding: 3px 0;
}
/* Team color identifier — always visible regardless of who's serving (see
   .serve-dot below for that indicator, anchored to the points instead). */
.chip {
    width: 14px;
    height: 14px;
    border-radius: 4px;
    box-shadow: 0 0 0 1.5px rgba(255, 255, 255, 0.35) inset, 0 1px 3px rgba(0, 0, 0, 0.45);
}
.tname {
    font-family: var(--font-display);
    font-size: 26px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: -0.01em;
    max-width: 320px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.sets {
    font-family: var(--font-display);
    font-size: 24px;
    font-weight: 700;
    color: var(--c-slate-400);
    min-width: 24px;
    text-align: center;
}
.pts-wrap {
    position: relative;
    display: inline-flex;
    align-items: center;
}
.pts {
    font-family: var(--font-display);
    font-size: 40px;
    font-weight: 700;
    min-width: 56px;
    text-align: center;
    line-height: 1;
}
/* Serving-team indicator: a volt dot anchored beside the serving team's
   point number, derived live from the stats stream (see `servingTeam`). */
.serve-dot {
    position: absolute;
    right: -14px;
    top: 50%;
    transform: translateY(-50%);
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--c-volt-400);
    box-shadow: 0 0 0 2px rgba(var(--c-ink-900-rgb), 0.95), 0 0 6px rgba(203, 251, 69, 0.65);
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
    color: var(--c-slate-400);
    margin-bottom: 18px;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.8);
}
.panel {
    min-width: 560px;
    padding: 34px 48px;
    background: rgba(var(--c-ink-850-rgb), 0.92);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(var(--c-brand-500-rgb), 0.2);
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
    font-family: var(--font-display);
    font-size: 56px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: -0.01em;
    text-align: left;
}
.bsets {
    font-family: var(--font-display);
    font-size: 72px;
    font-weight: 700;
    line-height: 1;
    min-width: 90px;
    text-align: center;
}
.winner .bsets {
    color: var(--c-volt-400);
}
.divider {
    height: 1px;
    background: rgba(var(--c-brand-500-rgb), 0.2);
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
    color: var(--c-slate-400);
    letter-spacing: 0.06em;
}
.sval {
    font-family: var(--font-display);
    font-size: 30px;
    font-weight: 700;
    text-align: center;
    color: var(--c-slate-200);
}
.sval.win {
    color: #fff;
}

/* ---------- SET STATS (expanded panel): one-sided "our set" summary ---------- */
.stats-title {
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    text-align: left;
    color: var(--c-slate-400);
    margin: 0 0 12px;
}
.origin-row {
    display: grid;
    grid-template-columns: 1fr 90px 30px;
    align-items: center;
    column-gap: 12px;
    padding: 4px 0;
}
.origin-label {
    text-align: left;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--c-slate-400);
}
.origin-track {
    height: 8px;
    border-radius: 5px;
    overflow: hidden;
    background: rgba(var(--c-ink-700-rgb), 0.6);
}
.origin-fill {
    height: 100%;
    border-radius: 5px;
}
.origin-num {
    font-family: var(--font-display);
    font-size: 18px;
    font-weight: 700;
    text-align: right;
    color: #fff;
}
.top-scorer {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid rgba(var(--c-brand-500-rgb), 0.2);
}
.top-scorer-label {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--c-slate-400);
}
.top-scorer-name {
    flex: 1;
    font-family: var(--font-display);
    font-size: 20px;
    font-weight: 700;
    color: #fff;
    text-align: left;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.top-scorer-pts {
    font-family: var(--font-display);
    font-size: 24px;
    font-weight: 700;
    color: var(--c-volt-400);
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

/* ---------- side banner: slide out from behind the bar ---------- */
.banner-side-enter-active,
.banner-side-leave-active {
    transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
}
.banner-extend-right.banner-side-enter-from,
.banner-extend-right.banner-side-leave-to {
    transform: translateX(-100%);
    opacity: 0;
}
.banner-extend-left.banner-side-enter-from,
.banner-extend-left.banner-side-leave-to {
    transform: translateX(100%);
    opacity: 0;
}
</style>
