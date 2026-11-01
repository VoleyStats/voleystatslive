<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useI18n } from "vue-i18n"
import { collection, doc, onSnapshot, orderBy, query } from "firebase/firestore"
import { useDocument } from "vuefire"
import { db } from "../firebase"
import { ADMIN_IDS, aid, deriveCredits, overlaySetsWon, pointsOrigin, rivalServing, sortChronological } from "../utils/volleyStats"
import TeamCrest from "../components/TeamCrest.vue"
import { safeLogoUrl } from "../utils/teamLogo"
// Everything the scoreboard needs already lives on the match doc: the app
// rewrites `sets_scoreboard` (per-set scores, current set included) on every
// point, plus `sets_us`/`sets_them`/`current_set`. So we subscribe only to
// `live_matches/{code}` — no need to read the (potentially huge) stats
// subcollection. Shapes live in `src/interfaces/firestore.ts`; the remote
// placement config (`teams/{team.id}.overlay`: `pos`/`scale`/`banners`/`logos`/`lang`)
// mirrors the URL params below and, once published, takes priority over them —
// see the priority cascade (session > remote > URL > default) further down.
import type { LiveMatch, SetScore, TeamOverlayConfig as RemoteOverlay } from "../interfaces/firestore"

const { t, locale } = useI18n()

const route = useRoute()
const router = useRouter()
const code = String(route.params.code ?? "")

// ?setup shows a floating, non-transparent configuration panel with a live
// preview of the overlay (usable in a normal browser, not meant for OBS).
const isSetup = computed(() => route.query.setup !== undefined)
const hasAnyQueryParam = computed(() => Object.keys(route.query).length > 0)

// Demo mode (?demo=1 in-play, ?demo=between between sets, ?demo=matchend finished 2-1 match, ?demo=banners in-play + banner loop) feeds mock data so the
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
    if (demo.value === "matchend") {
        // Same shape `publishFinishedMatch` writes: `current_set` is one past the
        // last set (no scoreboard entry), `sets_*` already count every set.
        return {
            team: { name: "Demo team", color: "1e90ff", logo_url: "/icon-192.png" },
            opponent: "Demo opponent",
            opponent_logo_url: "/icon-192.png",
            opponent_color: "f59e0b",
            n_sets: 3,
            sets_us: 2,
            sets_them: 1,
            current_set: 4,
            set_closed: true,
            sets_scoreboard: [
                { number: 1, score_us: 25, score_them: 20 },
                { number: 2, score_us: 22, score_them: 25 },
                { number: 3, score_us: 25, score_them: 18 },
            ],
        }
    }
    return {
        // Crests: the app's own icon from `public/` (same-origin, so it passes
        // `safeLogoUrl`) stands in for both teams — placement in OBS has to be
        // decided against the WIDEST layout, which is the one with two crests.
        team: { name: "Demo team", color: "1e90ff", logo_url: "/icon-192.png" },
        opponent: "Demo opponent",
        opponent_logo_url: "/icon-192.png",
        opponent_color: "f59e0b",
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
// Team crests on/off. Same cascade as the rest, and the DEFAULT IS ON: an app
// build that never publishes `overlay.logos` (or a bare `?setup`-less URL) must
// still show crests, so only an explicit `false`/`0` turns them off.
function parseLogos(v: unknown): boolean | null {
    if (typeof v === "boolean") return v
    const s = String(v ?? "").toLowerCase()
    if (s === "1" || s === "true") return true
    if (s === "0" || s === "false") return false
    return null
}

// Language of the overlay's texts. OBS/Prism run their own embedded browser,
// so the detected language (navigator / saved choice) is not something the
// streamer can see or change — hence an explicit "es"/"en". "auto" (or
// anything else) = no opinion, fall through to the next level of the cascade.
type OverlayLang = "es" | "en"
function parseLang(v: unknown): OverlayLang | null {
    const s = String(v ?? "").toLowerCase()
    return s === "es" || s === "en" ? s : null
}

// Parsed once from the URL at load time — immutable for the life of the page
// (unlike the session overrides below, these never change once resolved).
const posUrlParam = parsePos(route.query.pos)
const scaleUrlParam = parseScale(route.query.scale)
const bannersUrlParam = parseBannersMode(route.query.banners)
const logosUrlParam = parseLogos(route.query.logos)
const langUrlParam = parseLang(route.query.lang)

// Populated ONLY by the `?setup` panel's controls (see the `@click`/`v-model`
// handlers below) — stays `null` for the whole session otherwise, including
// for OBS/Prism sources opened straight from a saved URL.
const posSession = ref<Pos | null>(null)
const scaleSession = ref<number | null>(null)
const bannersSession = ref<BannersMode | null>(null)
const logosSession = ref<boolean | null>(null)
// "auto" here is an explicit choice in the setup panel (back to detection),
// unlike `null`, which means the panel never touched the control.
const langSession = ref<OverlayLang | "auto" | null>(null)

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
const showLogos = computed<boolean>(
    () => logosSession.value ?? parseLogos(remoteOverlay.value?.logos) ?? logosUrlParam ?? true
)
// What `src/i18n` detected at load (saved choice or navigator), the "auto"
// fallback. The overlay switches the global locale WITHOUT `setLocale`, so
// it never persists to localStorage nor leaks into the rest of the site.
const detectedLang = locale.value as OverlayLang
const overlayLang = computed<OverlayLang>(() => {
    if (langSession.value) return langSession.value === "auto" ? detectedLang : langSession.value
    return parseLang(remoteOverlay.value?.lang) ?? langUrlParam ?? detectedLang
})
// Writable proxy for the setup panel's checkbox, same shape as `scaleInput`.
const logosInput = computed<boolean>({
    get: () => showLogos.value,
    set: (v) => {
        logosSession.value = v
    },
})
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

// El `scale(var(--sb-enter-scale, 1))` del final es el hueco donde la
// transición entre estados (ver `.sb-*` en los estilos) mete su escala de
// entrada/salida: estos estilos son INLINE y ganan a cualquier regla de la
// hoja, así que un `transform` en `.sb-enter-from` no se aplicaría — la
// escala tiene que COMPONERSE aquí, no sustituir a la colocación.
// --- Fit to the widget (owner, 2026-10-19). Prism Live lets the browser widget
// be any size, not just the full canvas, and the page used to lay itself out
// for 1920×1080 regardless — so a smaller widget just cropped a window out of
// it: the set-end panel and the banners were cut. Now every piece measures its
// natural size and the scale applied is the streamer's `scale` CAPPED by what
// fits in the viewport, so it can only shrink to fit, never grow past the
// chosen size.
const vw = ref(window.innerWidth)
const vh = ref(window.innerHeight)
function onResize() {
    vw.value = window.innerWidth
    vh.value = window.innerHeight
}
type FitKey = "compact" | "banner" | "expanded"
const sizes = reactive<Record<FitKey, { w: number; h: number }>>({
    compact: { w: 0, h: 0 },
    banner: { w: 0, h: 0 },
    expanded: { w: 0, h: 0 },
})
// offsetWidth/Height ignore transforms: the natural, unscaled size.
const resizeObs =
    typeof ResizeObserver !== "undefined"
        ? new ResizeObserver((entries) => {
              for (const e of entries) {
                  const el = e.target as HTMLElement
                  const key = el.dataset.fit as FitKey | undefined
                  if (key) sizes[key] = { w: el.offsetWidth, h: el.offsetHeight }
              }
          })
        : null
const tracked = new Map<FitKey, HTMLElement>()
// Function refs built ONCE (an inline arrow in the template would be a new
// function each render, and Vue would unbind/rebind it every time).
function fitRef(key: FitKey) {
    return (el: unknown) => {
        const next = el instanceof HTMLElement ? el : null
        const prev = tracked.get(key) ?? null
        if (prev === next) return
        if (prev) resizeObs?.unobserve(prev)
        if (next) {
            next.dataset.fit = key
            tracked.set(key, next)
            resizeObs?.observe(next)
            sizes[key] = { w: next.offsetWidth, h: next.offsetHeight }
        } else {
            tracked.delete(key)
        }
    }
}
const compactRef = fitRef("compact")
const bannerRef = fitRef("banner")
const expandedRef = fitRef("expanded")
const marginPx = computed(() => 0.03 * Math.min(vw.value, vh.value))
const BANNER_GAP = 10
function fitScale(w: number, h: number): number {
    if (w <= 0 || h <= 0) return scale.value
    const m = marginPx.value
    return Math.min(scale.value, (vw.value - 2 * m) / w, (vh.value - 2 * m) / h)
}
const compactScale = computed(() => fitScale(sizes.compact.w, sizes.compact.h))
const expandedScale = computed(() => fitScale(sizes.expanded.w, sizes.expanded.h))
// A banner never shrinks the scoreboard (that would make the score jump in
// size every timeout). If it doesn't fit beside/above the bar at the bar's
// scale, it covers the bar instead for its few seconds. The estimate covers
// the first frame, before the banner has been measured.
const BANNER_EST = { w: 340, h: 104 }
const bannerFits = computed(() => {
    const s = compactScale.value
    const m = marginPx.value
    const c = sizes.compact
    const bw = Math.max(sizes.banner.w, BANNER_EST.w)
    const bh = Math.max(sizes.banner.h, BANNER_EST.h)
    if (bannerAxis.value === "vertical") return (c.h + BANNER_GAP + bh) * s <= vh.value - 2 * m
    return (c.w + BANNER_GAP + bw) * s <= vw.value - 2 * m && Math.max(c.h, bh) * s <= vh.value - 2 * m
})

const compactStyle = computed(() => {
    const m = "3vmin"
    const base: Record<string, string> = { transform: `scale(${compactScale.value}) scale(var(--sb-enter-scale, 1))` }
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
    transform: `translate(-50%, -50%) scale(${expandedScale.value}) scale(var(--sb-enter-scale, 1))`,
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
// as "Clipeo" rather than a generic color.
const US_FALLBACK = "#6E93FF"
// The app paints the rival in pink (`.pink`, the "their player" button), so
// that's the rival's fallback here too.
const THEM_FALLBACK = "#FF375F"
function rgb(hex: string): [number, number, number] {
    const h = hex.replace("#", "")
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number]
}
function luminance(hex: string): number {
    const [r, g, b] = rgb(hex).map((c) => {
        const v = c / 255
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
// A team colour has to survive on the dark card: near-black (the default of a
// rival sheet nobody painted, "000000") is replaced by the fallback.
function visibleColor(hex: string | undefined, fallback: string): string {
    const c = cssColor(hex, fallback)
    return luminance(c) < 0.03 ? fallback : c
}
// Text drawn ON a team colour (the points box): dark ink on light colours.
function inkOn(hex: string): string {
    return luminance(hex) > 0.45 ? "#0b0f1a" : "#ffffff"
}
const usColor = computed(() => visibleColor(match.value?.team?.color, US_FALLBACK))
// Each team in its own colour (owner, 2026-10-19): the rival's comes from its
// sheet (`opponent_color`). If it's missing, or too close to ours to tell the
// two rows apart, the app's rival pink takes over.
const themColor = computed(() => {
    const c = visibleColor(match.value?.opponent_color, THEM_FALLBACK)
    const [r1, g1, b1] = rgb(c)
    const [r2, g2, b2] = rgb(usColor.value)
    const close = Math.hypot(r1 - r2, g1 - g2, b1 - b2) < 90
    return close ? (usColor.value.toLowerCase() === THEM_FALLBACK.toLowerCase() ? US_FALLBACK : THEM_FALLBACK) : c
})
const usStyle = computed(() => ({ "--team": usColor.value, "--team-ink": inkOn(usColor.value) }))
const themStyle = computed(() => ({ "--team": themColor.value, "--team-ink": inkOn(themColor.value) }))
// Crests. `""` (no logo published, or crests switched off) falls back to the
// color chip, which is exactly what the scoreboard showed before this existed.
// The URL is passed through untouched — `TeamCrest`/`safeLogoUrl` own the host
// check and the cache-buster must survive intact.
const usLogo = computed(() => (showLogos.value ? match.value?.team?.logo_url ?? "" : ""))
const themLogo = computed(() => (showLogos.value ? match.value?.opponent_logo_url ?? "" : ""))
// Each team row is its OWN grid, so the identifier column has to be sized
// globally or a match where only one side has a crest would end up with
// misaligned names. One crest anywhere widens the column for both rows; the
// color chip then just centers inside it (see `.chip` in the styles below).
// Consumed from the CSS via `v-bind()`.
const CREST_SIZE = 30
const anyCrest = computed(() => !!safeLogoUrl(usLogo.value) || !!safeLogoUrl(themLogo.value))
const idCol = computed(() => (anyCrest.value ? `${CREST_SIZE}px` : "14px"))
// Forma del chip de color, por la misma razón: si un equipo trae escudo (ya
// recortado en círculo por la app) y el otro no, un cuadradito redondeado justo
// encima de un círculo canta. Cuando hay algún escudo en el marcador el chip se
// vuelve redondo también; sin ningún escudo conserva su radio de siempre y la
// barra queda pixel a pixel como estaba. Solo se sobreescribe dentro de
// `.team-row`/`.vs-team`: el chip del rótulo de sustitución usa la regla base
// `.chip` y se queda cuadrado siempre.
const chipRadius = computed(() => (anyCrest.value ? "50%" : "4px"))
const chipRadiusBig = computed(() => (anyCrest.value ? "50%" : "6px"))

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

// Sets won (see `overlaySetsWon`): adds the set that just closed while playing,
// adds nothing for a finished match (`current_set` is one past the last set).
const effUs = computed(() => (match.value ? overlaySetsWon(match.value, between.value).us : 0))
const effThem = computed(() => (match.value ? overlaySetsWon(match.value, between.value).them : 0))

const majority = computed(() => Math.floor(nSets.value / 2) + 1)
const matchOver = computed(() => between.value && (effUs.value >= majority.value || effThem.value >= majority.value))

// playing: compact bar during a set. between: big breakdown once a set ends.
const phase = computed<"playing" | "between">(() => (between.value ? "between" : "playing"))
// Only the set-end card uses it: the match-end panel has no score card.
const headline = computed(() => t("overlay.setEnd", { n: currentSet.value }))

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

// ?demo=banners: in-play mock data plus a timeout/substitution loop, so the
// banners can be placed and sized in OBS without a live match.
const DEMO_BANNERS: Omit<BannerItem, "id">[] = [
    { kind: "sub", playerIn: "7 Demo In", playerOut: "12 Demo Out" },
    { kind: "timeout", team: "us" },
    { kind: "timeout", team: "them" },
]
let demoBannerTimer: ReturnType<typeof setInterval> | null = null
let demoBannerIdx = 0
watch(
    () => demo.value === "banners",
    (on) => {
        if (demoBannerTimer) clearInterval(demoBannerTimer)
        demoBannerTimer = null
        bannerQueue.value = []
        activeBanner.value = null
        clearBannerTimer()
        if (!on) return
        const next = () => enqueueBanner(DEMO_BANNERS[demoBannerIdx++ % DEMO_BANNERS.length])
        next()
        demoBannerTimer = setInterval(next, BANNER_MS + 1500)
    },
    { immediate: true }
)

const bannerChipColor = computed(() => {
    const b = activeBanner.value
    if (!b) return "#93a4bd"
    if (b.kind === "sub") return usColor.value
    return b.team === "us" ? usColor.value : b.team === "them" ? themColor.value : "#93a4bd"
})
// Vertical layout (top/bottom edge) keeps the original team-color left
// border; horizontal layout (left/right edge) shows the accent as a top
// inset line instead (the left/right edge is the seam glued to the compact
// bar, so it can't carry a 4px accent border there).
const bannerAccentStyle = computed(() => ({ borderLeftColor: bannerChipColor.value }))
const bannerPosClass = computed(() => {
    if (!bannerFits.value) return pos.value.startsWith("top") ? "banner-over banner-over-top" : "banner-over banner-over-bottom"
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

// --- Serving-team indicator (compact bar). `stats.order` restarts at 0 in every
// set and the subscription sorts the whole subcollection by it, so the "last
// stat" of `allStats` is NOT the latest of the match: only look at the CURRENT
// set's stats, in `order`. Skipping admin stats, if the last one closed a rally
// (`to !== 0`) the next serve goes to whoever won it; otherwise the rally in
// progress is served by its `server`. A set with no stats yet falls back to the
// set's `first_serve` (match.sets[]: 1 = us, 2 = rival); else `null`.
const servingTeam = computed<"us" | "them" | null>(() => {
    const stats = allStats.value.filter((s) => Number(s?.set?.number) === currentSet.value && !ADMIN_IDS.includes(aid(s)))
    const s = stats[stats.length - 1]
    if (s) {
        if (s.to === 1) return "us"
        if (s.to === 2) return "them"
        if (s.server == null) return null
        return rivalServing(s) ? "them" : "us"
    }
    const fs = match.value?.sets?.find((x) => Number(x?.number) === currentSet.value)?.first_serve
    return fs === 1 ? "us" : fs === 2 ? "them" : null
})

// --- Remote overlay config: `teams/{team.id}.overlay`, hot-reloaded so a
// streamer can reposition/rescale the scoreboard from the app while watching
// the live output, without touching OBS. Subscribes once the match doc
// resolves `team.id`; re-subscribes if the id changes; skipped entirely in
// demo mode (no real team doc) — see the `id` computation below.
const remoteOverlay = ref<RemoteOverlay | null>(null)
// Applies the overlay's language (see `overlayLang`). Declared here, not next
// to it: `immediate` runs now and the cascade reads `remoteOverlay`.
watch(
    overlayLang,
    (l) => {
        locale.value = l
        document.documentElement.lang = l
    },
    { immediate: true }
)
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
        allStats.value = sortChronological(snap.docs.map((d) => d.data()))
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

// --- Set stats block (expanded panel): both teams row against row, like a
// broadcast "set statistics" card (owner, 2026-10-24). The numbers come from
// the web's single engine (`pointsOrigin` in utils/volleyStats.ts, METRICS.md
// §2.1), the same as the app and the stats page, so each team's categories add
// up to its points:
//  - us: attack / block / ace / opponent errors — with the DERIVED credits
//    (a rally we won logged as the rival's reception/dig error 22/23 is our
//    ace or kill, whatever the capture mode); "opponent errors" excludes them.
//  - them: attack / block / ace / our errors. Symmetric rule (METRICS.md
//    `pointSources`/`concededSources`): a point we lose on our own row is their
//    block if it is a blocked attack error, their ace if it is a reception
//    error, their attack if it is a dig/block error, else our error; the rival's
//    own error rows we win mirror it (blocked attack -> our block, reception ->
//    our ace, dig/block -> our attack, else their error).
// `currentSet` still points at the set that just ended until the app starts
// the next one.
// At match end the block aggregates the WHOLE match (every set, chronological
// so `deriveCredits` sees real rallies); otherwise just the set that closed.
const finishedSetGameStats = computed(() => {
    const game = allStats.value.filter((s) => !ADMIN_IDS.includes(aid(s)))
    return matchOver.value
        ? sortChronological(game)
        : game.filter((s) => Number(s?.set?.number) === currentSet.value)
})
const finishedSetPointEnders = computed(() => finishedSetGameStats.value.filter((s) => s.to !== 0))

interface SetStatRow {
    key: string
    label: string
    us: number
    them: number
    usPct: number
    themPct: number
}
const setStatRows = computed<SetStatRow[]>(() => {
    const origin = pointsOrigin(finishedSetPointEnders.value, deriveCredits(finishedSetGameStats.value))
    const rows = (["attack", "block", "ace", "errors"] as const).map((k) => ({
        key: k,
        label: t(`stats.origin${k.charAt(0).toUpperCase()}${k.slice(1)}`),
        us: origin[k].us,
        them: origin[k].them,
    }))
    // One scale for every bar, so lengths compare across rows too. The set
    // score lives in its own card (`.score-card`), not as a row.
    const max = Math.max(1, ...rows.flatMap((r) => [r.us, r.them]))
    return rows.map((r) => ({ ...r, usPct: (r.us / max) * 100, themPct: (r.them / max) * 100 }))
})
const hasSetStats = computed(() => finishedSetPointEnders.value.length > 0)

// ?demo=between: a plausible set 3 (25-18), with rival actions and our errors, so the
// set statistics block can be previewed and placed without a live match.
// ?demo=matchend: the same sample in sets 1..3 (scaled), for the match block.
function demoSetStats(setNumber = 3, k = 1): any[] {
    let order = 0
    const stat = (to: number, rival: boolean, id: string, extra: object = {}) => ({
        set: { number: setNumber },
        order: (order += 1),
        to,
        player: { id: rival ? "0" : "demo", name: rival ? "" : "Demo" },
        server: { id: "demo" },
        action: { id },
        ...extra,
    })
    const rep = (n: number, to: number, rival: boolean, id: string) =>
        Array.from({ length: Math.max(1, Math.round(n * k)) }, () => stat(to, rival, id))
    // A rally we won logged the Rally Map way: our swing (6, rally goes on) and the
    // rival's reception error closing it -> the engine credits our kill.
    const derivedKill = () => [stat(0, false, "6"), stat(1, true, "23")]
    return [
        ...rep(13, 1, false, "9"),
        ...rep(3, 1, false, "13"),
        ...rep(2, 1, false, "8"),
        ...rep(7, 1, true, "15"),
        ...rep(5, 2, true, "9"),
        ...rep(2, 2, true, "13"),
        ...derivedKill(),
        ...derivedKill(),
        ...rep(3, 2, false, "23"),
        ...rep(3, 2, false, "15"),
        ...rep(4, 2, false, "16"),
    ]
}

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
// Setup panel language buttons. Language names stay in their own language.
const langOptions = computed(() => [
    { value: "auto" as const, label: t("overlay.setupLangAuto") },
    { value: "es" as const, label: "Español" },
    { value: "en" as const, label: "English" },
])
// Highlighted button: the session pick, else what the remote/URL config asks
// for, else "auto".
const langChoice = computed(() => langSession.value ?? parseLang(remoteOverlay.value?.lang) ?? langUrlParam ?? "auto")
const finalOverlayUrl = computed(() => {
    const q: Record<string, string> = {}
    if (posSession.value) q.pos = posSession.value
    if (scaleSession.value != null) q.scale = String(scaleSession.value)
    if (bannersSession.value) q.banners = bannersSession.value
    if (logosSession.value != null) q.logos = logosSession.value ? "1" : "0"
    if (langSession.value && langSession.value !== "auto") q.lang = langSession.value
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
    window.addEventListener("resize", onResize)

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
watch(
    demo,
    (d) => {
        if (d) allStats.value = d === "between" ? demoSetStats() : d === "matchend" ? [3, 1, 2].flatMap((n, i) => demoSetStats(n, [1, 0.8, 1.2][i])) : []
    },
    { immediate: true }
)
onUnmounted(() => {
    document.documentElement.style.background = ""
    document.body.style.background = ""
    document.documentElement.style.colorScheme = ""
    stopStatsSubscription()
    stopTeamSubscription()
    if (demoBannerTimer) clearInterval(demoBannerTimer)
    window.removeEventListener("mousemove", armSetupHint)
    window.removeEventListener("resize", onResize)
    resizeObs?.disconnect()
    if (hintTimer) clearTimeout(hintTimer)
})
</script>

<template>
    <div class="overlay-root" :class="{ 'is-setup': isSetup }">
        <div v-if="isSetup" class="setup-checkerboard"></div>

        <template v-if="ready">
            <Transition name="sb" mode="out-in">
                <!-- COMPACT — during a set -->
                <div v-if="phase === 'playing'" key="playing" class="compact-wrap" :style="compactStyle">
                    <Transition :name="!bannerFits || bannerAxis === 'vertical' ? 'banner' : 'banner-side'">
                        <div v-if="activeBanner" :key="activeBanner.id" :ref="bannerRef" class="banner" :class="bannerPosClass" :style="bannerAccentStyle">
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
                    <div :ref="compactRef" class="compact">
                        <div class="compact-head"><span>SET {{ currentSet }}</span><span class="brand"><img src="/logo.png" alt="" aria-hidden="true" />Clipeo</span></div>
                        <!-- El escudo ocupa el mismo hueco que el chip de color
                             y cae a ese mismo chip (slot) cuando no hay logo,
                             falla la carga o el operador los apaga: sin escudos
                             la barra queda idéntica a como era. -->
                        <div class="team-row" :style="usStyle">
                            <TeamCrest :url="usLogo" :size="30" :alt="usName">
                                <span class="chip" :style="{ background: usColor }"></span>
                            </TeamCrest>
                            <span class="tname">{{ usName }}</span>
                            <span class="sets">{{ effUs }}</span>
                            <span class="pts-wrap">
                                <span v-if="servingTeam === 'us'" class="serve-dot"></span>
                                <span class="pts">{{ cur.score_us }}</span>
                            </span>
                        </div>
                        <div class="team-row" :style="themStyle">
                            <TeamCrest :url="themLogo" :size="30" :alt="themName">
                                <span class="chip" :style="{ background: themColor }"></span>
                            </TeamCrest>
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
                <div v-else key="between" :ref="expandedRef" class="expanded" :style="expandedStyle">
                    <!-- Tres tarjetas con el mismo estilo: equipos con los sets (como la
                         VNL), marcador del set terminado y estadísticas. -->
                    <div class="panels" :class="{ decided: matchOver }">
                        <div class="card vs-head">
                            <div class="vs-team us" :class="{ winner: matchOver && effUs > effThem }">
                                <TeamCrest :url="usLogo" :size="48" :alt="usName">
                                    <span class="chip" :style="{ background: usColor }"></span>
                                </TeamCrest>
                                <span class="bname">{{ usName }}</span>
                            </div>
                            <div class="vs-score">
                                <span class="bsets" :style="usStyle">{{ effUs }}</span>
                                <span class="vs-dash">–</span>
                                <span class="bsets" :style="themStyle">{{ effThem }}</span>
                            </div>
                            <div class="vs-team them" :class="{ winner: matchOver && effThem > effUs }">
                                <span class="bname">{{ themName }}</span>
                                <TeamCrest :url="themLogo" :size="48" :alt="themName">
                                    <span class="chip" :style="{ background: themColor }"></span>
                                </TeamCrest>
                            </div>
                        </div>

                        <!-- Marcador del set que acaba de terminar -->
                        <div v-if="!matchOver" class="card score-card">
                            <div class="headline">{{ headline }}</div>
                            <div class="set-score">
                                <span class="spts"><span class="spts-flag" :style="{ background: usColor }"></span>{{ cur.score_us || 0 }}</span>
                                <span class="vs-dash">–</span>
                                <span class="spts">{{ cur.score_them || 0 }}<span class="spts-flag" :style="{ background: themColor }"></span></span>
                            </div>
                            <span class="brand"><img src="/logo.png" alt="" aria-hidden="true" />Clipeo</span>
                        </div>

                        <!-- Estadísticas del set: los dos equipos, fila contra fila -->
                        <div v-if="hasSetStats" class="card">
                            <div class="stats-head">
                                <div class="stats-title">
                                    {{ matchOver ? t("overlay.matchStatsTitle") : `${t("overlay.setStatsTitle")} · Set ${currentSet}` }}
                                </div>
                                <!-- Fin de partido: la marca cierra la cabecera de las estadísticas
                                     (no hay tarjeta de marcador del set donde ponerla). -->
                                <span v-if="matchOver" class="brand"><img src="/logo.png" alt="" aria-hidden="true" />Clipeo</span>
                            </div>
                            <div class="cmp-row" v-for="row in setStatRows" :key="row.key">
                                <div class="cmp-label">{{ row.label }}</div>
                                <div class="cmp-lines">
                                    <div class="cmp-line">
                                        <span class="cmp-flag" :style="{ background: usColor }"></span>
                                        <span class="cmp-num">{{ row.us }}</span>
                                        <div class="cmp-track">
                                            <div class="cmp-fill" :style="{ width: row.usPct + '%', background: usColor }"></div>
                                        </div>
                                    </div>
                                    <div class="cmp-line">
                                        <span class="cmp-flag" :style="{ background: themColor }"></span>
                                        <span class="cmp-num">{{ row.them }}</span>
                                        <div class="cmp-track">
                                            <div class="cmp-fill" :style="{ width: row.themPct + '%', background: themColor }"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
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
                <span class="text-xs font-medium uppercase tracking-widest text-brand-300">{{ t("overlay.setupLogos") }}</span>
                <input v-model="logosInput" type="checkbox" class="h-4 w-4 accent-volt-400" />
            </label>

            <div class="mt-5">
                <p class="text-xs font-medium uppercase tracking-widest text-brand-300">{{ t("overlay.setupLang") }}</p>
                <div class="mt-2 grid grid-cols-3 gap-2">
                    <button
                        v-for="opt in langOptions"
                        :key="opt.value"
                        type="button"
                        class="rounded-lg border px-2 py-2 text-xs font-semibold transition-colors"
                        :class="langChoice === opt.value ? 'border-brand-400 bg-brand-500/20 text-white' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'"
                        @click="langSession = opt.value"
                    >
                        {{ opt.label }}
                    </button>
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

/* El desenfoque de fondo (`backdrop-filter`) SOLO existe en `?setup`.
   En OBS la página se compone con alfa (`.overlay-root` no tiene fondo y
   `onMounted` fuerza `background: transparent`), así que el backdrop de estos
   elementos es píxel TRANSPARENTE: no desenfoca el vídeo de YouTube —eso lo
   compone OBS después—, desenfoca la nada. A cambio, cada elemento con
   `backdrop-filter` fuerza una raíz de composición que se reevalúa en cada
   repintado (o sea, en cada punto) y en CADA FOTOGRAMA de la transición entre
   estados, en un portátil que además está codificando vídeo. Lo único donde
   el efecto se ve de verdad es sobre el tablero de ajedrez de `?setup`, que
   es donde se queda. */
.overlay-root.is-setup .compact,
.overlay-root.is-setup .banner {
    backdrop-filter: blur(6px);
}
.overlay-root.is-setup .card {
    backdrop-filter: blur(10px);
}

/* ---------- COMPACT ---------- */
.compact-wrap {
    position: absolute;
}
.compact {
    position: relative;
    min-width: 340px;
    padding: 10px 12px 12px 16px;
    /* Flat (owner, 2026-10-19): solid card, hairline border, no shadow — the
       same card language as the app and the web. */
    background: rgba(var(--c-ink-900-rgb), 0.95);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px;
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
    background: rgba(var(--c-ink-950-rgb), 0.96);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-left: 4px solid rgba(255, 255, 255, 0.3);
    border-radius: 14px;
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
/* No room beside/above the bar at its scale (small widget, see `bannerFits`):
   the banner covers the bar for its few seconds instead of being cropped. */
.banner-over {
    left: 0;
    right: 0;
    min-height: 100%;
    z-index: 2;
    justify-content: center;
}
.banner-over-top {
    top: 0;
}
.banner-over-bottom {
    bottom: 0;
}
.banner-over.banner-enter-from,
.banner-over.banner-leave-to {
    opacity: 0;
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
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.18em;
    color: var(--c-slate-400);
    margin-bottom: 8px;
}
.team-row {
    display: grid;
    /* Primera columna = identificador del equipo (escudo o chip de color).
       `idCol` vale 14px —el ancho de siempre— cuando no hay ningún escudo. */
    grid-template-columns: v-bind(idCol) 1fr auto auto;
    /* `idCol` salta de 14px a 30px cuando aparece un escudo (el streamer lo
       sube a mitad de partido, o alguien toca la casilla de `?setup`) y el
       nombre del equipo se desplazaba 16px en seco, en directo. Solo se anima
       ese salto: sin cambio de escudo no hay nada que transicionar. */
    transition: grid-template-columns 0.22s var(--ease-out);
    align-items: center;
    column-gap: 14px;
    padding: 3px 0;
}
/* Team color identifier — always visible regardless of who's serving (see
   .serve-dot below for that indicator, anchored to the points instead). */
.chip {
    /* Centrado en su columna: cuando el OTRO equipo sí tiene escudo la columna
       es más ancha, y el chip debe quedar en el mismo eje que ese escudo. */
    justify-self: center;
    width: 14px;
    height: 14px;
    border-radius: 4px;
}
.team-row .chip {
    border-radius: v-bind(chipRadius);
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
    font-size: 22px;
    font-weight: 700;
    color: var(--c-slate-200);
    min-width: 34px;
    padding: 2px 0;
    text-align: center;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.06);
}
.pts-wrap {
    position: relative;
    display: inline-flex;
    align-items: center;
    /* Reserved slot for .serve-dot so it never crowds the bar's border. */
    padding-right: 15px;
}
/* Each team in its own colour (owner, 2026-10-19): the points sit on a
   solid box of the team colour, with ink picked for contrast (`inkOn`). */
.pts {
    font-family: var(--font-display);
    font-size: 38px;
    font-weight: 700;
    min-width: 60px;
    padding: 4px 6px;
    text-align: center;
    line-height: 1;
    border-radius: 10px;
    background: var(--team);
    color: var(--team-ink);
}
/* Serving-team indicator: a volt dot anchored beside the serving team's
   point number, derived live from the stats stream (see `servingTeam`). */
.serve-dot {
    position: absolute;
    right: 0;
    /* -1px: optical center of the digits sits slightly above the line-box center. */
    top: calc(50% - 1px);
    transform: translateY(-50%);
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--c-volt-400);
}

/* ---------- EXPANDED ---------- */
.expanded {
    position: absolute;
    top: 50%;
    left: 50%;
    /* Natural width, not shrink-to-fit against the half viewport left of
       `left: 50%` — otherwise a narrow widget wraps the team names instead of
       letting `expandedScale` shrink the whole panel. */
    width: max-content;
    text-align: center;
}
/* Three cards with the same look — teams, score, set stats — stacked with a
   gap so the score reads apart from the breakdown (owner, 2026-10-24). */
.panels {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 760px;
}
.card {
    padding: 22px 32px;
    background: rgba(var(--c-ink-900-rgb), 0.96);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 20px;
}
/* VNL-style: team · sets · team. */
.vs-head {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    column-gap: 28px;
}
.vs-team.us {
    justify-content: flex-end;
}
.vs-team.them {
    justify-content: flex-start;
}
.vs-team {
    display: flex;
    align-items: center;
    gap: 18px;
    transition: opacity 0.22s var(--ease-out);
}
/* Match over: the loser steps back, the winner keeps full strength. */
.panels.decided .vs-team:not(.winner) {
    opacity: 0.5;
}
.vs-team .chip {
    width: 22px;
    height: 22px;
    border-radius: v-bind(chipRadiusBig);
}
.bname {
    white-space: nowrap;
    font-family: var(--font-display);
    font-size: 44px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: -0.01em;
}
.score-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding-top: 16px;
    padding-bottom: 16px;
}
.headline {
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    color: var(--c-slate-400);
}
.vs-score {
    display: flex;
    align-items: center;
    gap: 14px;
}
.vs-dash {
    font-family: var(--font-display);
    font-size: 40px;
    font-weight: 700;
    color: var(--c-slate-400);
}
.bsets {
    font-family: var(--font-display);
    font-size: 64px;
    font-weight: 700;
    line-height: 1;
    min-width: 86px;
    padding: 8px 10px;
    text-align: center;
    border-radius: 14px;
    background: var(--team);
    color: var(--team-ink);
}
/* Points of the set that just ended: big plain numbers, each with its
   team's colour as a side flag, so they don't compete with the sets boxes. */
.set-score {
    display: flex;
    align-items: center;
    gap: 18px;
}
.spts {
    display: flex;
    align-items: center;
    gap: 14px;
    font-family: var(--font-display);
    font-size: 60px;
    font-weight: 700;
    line-height: 1;
    color: #fff;
}
.spts-flag {
    width: 8px;
    height: 44px;
    border-radius: 3px;
}

/* Clipeo watermark: compact head (right of "SET n") and score card. */
.brand {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: var(--font-display);
    font-weight: 700;
    letter-spacing: 0.02em;
    text-transform: none;
    color: var(--c-slate-200);
    opacity: 0.75;
}
.brand img {
    width: 1.35em;
    height: 1.35em;
    object-fit: contain;
}
/* Between sets the mark sits in the score card's right corner — the one
   card that is always there — and not on the video, where it read poorly. */
.score-card {
    position: relative;
}
.score-card .brand {
    position: absolute;
    right: 28px;
    bottom: 16px;
    font-size: 18px;
}

/* ---------- SET STATS (expanded panel): both teams, row against row ---------- */
.stats-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 4px;
}
.stats-head .brand {
    font-size: 18px;
}
.stats-title {
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    text-align: left;
    color: var(--c-slate-400);
}
.cmp-row {
    display: grid;
    grid-template-columns: 190px 1fr;
    column-gap: 10px;
    margin-top: 8px;
}
/* Label block spanning both team lines, like the VNL card. */
.cmp-label {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 14px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.06);
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    text-align: center;
    color: #fff;
}
.cmp-lines {
    display: flex;
    flex-direction: column;
    gap: 4px;
}
.cmp-line {
    display: grid;
    grid-template-columns: 8px 52px minmax(320px, 1fr);
    align-items: center;
    column-gap: 8px;
    height: 32px;
}
.cmp-flag {
    width: 8px;
    height: 100%;
    border-radius: 3px;
}
.cmp-num {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.06);
    font-family: var(--font-display);
    font-size: 22px;
    font-weight: 700;
    color: #fff;
}
.cmp-track {
    height: 22px;
}
.cmp-fill {
    height: 100%;
    min-width: 4px;
    border-radius: 0 6px 6px 0;
}

/* ---------- transition between the two states ----------
   Con `mode="out-in"` las dos fases se SUMAN, así que 0.45s + 0.45s dejaban el
   marcador ausente casi un segundo justo al cerrar un set — el momento en que
   más gente lo está mirando. 180ms de salida + 260ms de entrada (440 en total)
   caben en el presupuesto de panel y siguen sin solapar los dos estados, que
   es lo que `out-in` compra. La entrada añade la escala que la declaración
   anterior prometía y nunca aplicaba: `transform` estaba en la lista pero
   ningún `*-from`/`*-to` lo tocaba (media declaración muerta y una entrada que
   era un fundido pelado). Ver `compactStyle`/`expandedStyle` para por qué la
   escala viaja en una custom property. */
.sb-enter-active {
    transition: opacity 0.26s var(--ease-out), transform 0.26s var(--ease-out);
}
.sb-leave-active {
    transition: opacity 0.18s var(--ease-out), transform 0.18s var(--ease-out);
}
.compact-wrap.sb-enter-from,
.compact-wrap.sb-leave-to,
.expanded.sb-enter-from,
.expanded.sb-leave-to {
    opacity: 0;
    --sb-enter-scale: 0.94;
}

/* ---------- banner enter/leave ----------
   Es un aviso momentáneo (un toast): entra con `--ease-out` y dentro del
   presupuesto de 150-250ms, no con `ease` y 350. El desplazamiento de 8px y su
   dirección (entra desde la barra) sí eran correctos y se conservan. */
.banner-enter-active,
.banner-leave-active {
    transition: opacity 0.22s var(--ease-out), transform 0.22s var(--ease-out);
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

/* ---------- side banner: slide out from behind the bar ----------
   MISMO aviso que el de arriba, así que mismo timing: lo que justifica el
   comentario de la geometría (recorrido del 100% para salir de detrás de la
   barra, en vez de 8px) es la GEOMETRÍA, no que este tarde 0.4s y el otro
   0.35s con curvas distintas. La geometría se conserva; el timing se unifica. */
.banner-side-enter-active,
.banner-side-leave-active {
    transition: transform 0.22s var(--ease-out), opacity 0.22s var(--ease-out);
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
