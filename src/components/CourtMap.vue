<template>
    <div class="w-full flex flex-col items-center gap-2">
        <svg :viewBox="`0 0 ${W} ${H}`" class="w-full max-w-sm select-none">
            <defs>
                <filter id="heatBlur" x="-80%" y="-80%" width="260%" height="260%">
                    <feGaussianBlur stdDeviation="10" />
                </filter>
            </defs>

            <!-- Fuera (banda) + suelo + líneas: mismo lenguaje visual que la app -->
            <rect :x="0" :y="0" :width="W" :height="H" rx="10" fill="#0d9488" opacity="0.35" />
            <rect :x="M" :y="M" :width="W - 2 * M" :height="H - 2 * M" fill="#c2410c" opacity="0.9" />
            <rect :x="M" :y="M" :width="W - 2 * M" :height="H - 2 * M" fill="none" stroke="#fff" stroke-width="2" />
            <!-- líneas de 3 metros y red -->
            <line :x1="M" :x2="W - M" :y1="netY - third" :y2="netY - third" stroke="#fff" stroke-width="1" opacity="0.7" />
            <line :x1="M" :x2="W - M" :y1="netY + third" :y2="netY + third" stroke="#fff" stroke-width="1" opacity="0.7" />
            <rect :x="M - 6" :y="netY - 3" :width="W - 2 * M + 12" :height="6" fill="#111" rx="2" />

            <!-- retícula de zonas, sutil -->
            <line v-for="i in 2" :key="'v' + i" :x1="M + i * colW" :x2="M + i * colW" :y1="M" :y2="H - M" stroke="#fff" stroke-width="0.5" opacity="0.15" />
            <line :x1="M" :x2="W - M" :y1="M + rowH" :y2="M + rowH" stroke="#fff" stroke-width="0.5" opacity="0.15" />
            <line :x1="M" :x2="W - M" :y1="H - M - rowH" :y2="H - M - rowH" stroke="#fff" stroke-width="0.5" opacity="0.15" />

            <!-- blobs de caída (heat) -->
            <g filter="url(#heatBlur)">
                <circle
                    v-for="(blob, i) in heat"
                    :key="'h' + i"
                    :cx="blob.x"
                    :cy="blob.y"
                    :r="10 + Math.min(blob.count * 3, 18)"
                    :fill="blob.color"
                    :opacity="0.55"
                />
            </g>

            <!-- trayectorias: todas, con la frecuencia en el trazo. La punta
                 es un polígono por flecha (no un <marker> compartido) para que
                 escale con el grosor y para que la línea acabe en su BASE, no
                 debajo de ella. -->
            <g v-for="(a, i) in arrows" :key="'a' + i" :opacity="a.opacity">
                <path :d="a.d" fill="none" :stroke="a.color" :stroke-width="a.width" stroke-linecap="round" />
                <polygon :points="a.head" :fill="a.color" />
            </g>

            <!-- etiqueta del atacante -->
            <text :x="W / 2" :y="H - 6" text-anchor="middle" fill="#94a3b8" font-size="11">
                {{ attackerLabel }}
            </text>
        </svg>

        <p v-if="total === 0" class="text-xs text-slate-500">{{ $t('courtMap.noDirections') }}</p>
        <p v-else class="text-xs text-slate-500">
            {{ $t('courtMap.summary') }}
        </p>
    </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";

// Pista SVG con los corredores de ataque construidos desde el formato de
// dirección de la app ("from#to", zonas "4A", red "N3", fuera "OT2/OL4",
// bloqueo "B3"). El atacante (propio o rival) siempre ataca de abajo hacia
// arriba, igual que registra la app, así el mismo render sirve para ambos.

// `actionIds` acota la familia de acciones a agregar (por defecto ataque,
// como hasta ahora en GeneralStats/PlayerDetailSection). Las estadísticas de
// equipo (TeamMatches.vue) pasan la familia de saque reutilizando el mismo render:
// el saque también codifica `direction` como "S5/S6/S1#<zona-caída>" (ver
// `Capture.swift`), que `fromPoint`/`toPoint` ya interpretan sin cambios.
const props = withDefaults(
    defineProps<{
        stats: any[];
        rival: boolean;
        actionIds?: string[];
    }>(),
    { actionIds: () => ["6", "9", "10", "11", "16", "17", "47"] }
);

const { t } = useI18n();

const W = 320;
const H = 600;
const M = 24;
const netY = H / 2;
const colW = (W - 2 * M) / 3;
const rowH = (netY - M) / 3;
const third = rowH; // línea de 3 metros ≈ primera fila

const aid = (s: any): string => String(s?.action?.id ?? "");

// Distribución de zonas idéntica a la app (DirectionsCourt):
// mitad propia (abajo, de la red hacia fuera) y mitad rival (arriba).
const OWN_ROWS = [["4", "3", "2"], ["7", "8", "9"], ["5", "6", "1"]];
const RIVAL_ROWS = [["2", "3", "4"], ["9", "8", "7"], ["1", "6", "5"]];
// Cada zona se parte en 4 subzonas: mitad de red (A/B) vs mitad de fondo
// (D/C), izquierda/derecha, SIEMPRE en el marco de visión del equipo que
// actúa. La rejilla rival está girada 180º (crece hacia la red y el rival
// mira al revés), así que usa la matriz rotada — mismo criterio que
// `CourtGeometry.rivalSubzones` en iOS y `CourtRows.rivalSubzones` en Android.
const OWN_SUBZONES = [["A", "B"], ["D", "C"]];
const RIVAL_SUBZONES = [["C", "D"], ["B", "A"]];

// Centro de una celda: un token completo ("6B") cae en su cuarto de zona, un
// dígito suelto ("6") en el centro de la zona. Las apps agregan las
// trayectorias por SUBZONA, así que dos rutas distintas de la misma zona
// tienen que salir de puntos distintos y no apilarse en el centro.
function cellCenter(token: string, top: boolean): { x: number; y: number } | null {
    const rows = top ? RIVAL_ROWS : OWN_ROWS;
    const zone = token[0];
    for (let r = 0; r < 3; r++) {
        const c = rows[r].indexOf(zone);
        if (c < 0) continue;
        const sub = top ? RIVAL_SUBZONES : OWN_SUBZONES;
        let dc = 0.5;
        let dr = 0.5;
        const letter = token[1];
        if (letter) {
            for (let sr = 0; sr < 2; sr++) {
                const sc = sub[sr].indexOf(letter);
                if (sc >= 0) {
                    dc = sc * 0.5 + 0.25;
                    dr = sr * 0.5 + 0.25;
                    break;
                }
            }
        }
        const x = M + (c + dc) * colW;
        const y = top ? netY - (r + dr) * rowH : netY + (r + dr) * rowH;
        return { x, y };
    }
    return null;
}

// Origen del ataque (token from): celda propia, saque S* o desconocido.
function fromPoint(token: string): { x: number; y: number } | null {
    if (!token || token === "-") return null;
    if (token.startsWith("S")) {
        const cols: Record<string, number> = { "5": 0, "6": 1, "1": 2 };
        const c = cols[token.slice(1)] ?? 1;
        return { x: M + c * colW + colW / 2, y: H - M / 2 };
    }
    return cellCenter(token, false);
}

// Caída (token to): celda rival, red N*, fuera O*, bloqueo B*.
function toPoint(token: string): { x: number; y: number } | null {
    if (!token || token === "-") return null;
    if (token.startsWith("N")) {
        const cols: Record<string, number> = { "4": 0, "3": 1, "2": 2 };
        const c = cols[token.slice(1)] ?? 1;
        return { x: M + c * colW + colW / 2, y: netY };
    }
    if (token.startsWith("B")) {
        const cols: Record<string, number> = { "2": 2, "3": 1, "4": 0 };
        const c = cols[token.slice(1)] ?? 1;
        return { x: M + c * colW + colW / 2, y: netY - 8 };
    }
    if (token.startsWith("OT")) {
        const c = (Number(token.slice(2)) || 2) - 1;
        return { x: M + c * colW + colW / 2, y: M / 2 };
    }
    if (token.startsWith("OB")) {
        const c = (Number(token.slice(2)) || 2) - 1;
        return { x: M + c * colW + colW / 2, y: H - M / 2 };
    }
    if (token.startsWith("OL") || token.startsWith("OR")) {
        const r = (Number(token.slice(2)) || 3) - 1;
        const x = token.startsWith("OL") ? M / 2 : W - M / 2;
        return { x, y: M + (r + 0.5) * ((H - 2 * M) / 6) };
    }
    return cellCenter(token, true);
}

interface Corridor {
    x1: number; y1: number; x2: number; y2: number;
    count: number; wins: number; fails: number;
    color: string;
    // Curva cuadrática: la flecha se arquea SIEMPRE hacia el mismo lado del
    // sentido de la marcha, así una ruta A→B y su vuelta B→A se separan en
    // dos arcos en vez de taparse. Igual que en las apps (`flowGeometry`).
    d: string;
    head: string;
    width: number;
    opacity: number;
}

// Semiángulo de apertura de la punta, medido hacia atrás desde el sentido de
// la marcha. HEAD_SIZE mantiene la punta claramente más ancha que el trazo
// (si no, un trazo grueso se la come) y su longitud sale de la propia forma.
const HEAD_SPREAD = Math.PI * 0.85;
const HEAD_AXIAL = -Math.cos(HEAD_SPREAD);
// Nunca dejar que la punta se coma más del 45% de una ruta corta, para que un
// salto entre subzonas vecinas siga enseñando algo de línea.
const headSize = (width: number, distance: number) =>
    Math.min(1.5 + 2.5 * width, (distance * 0.45) / HEAD_AXIAL);

const attacks = computed(() =>
    props.stats.filter(
        (s) =>
            props.actionIds.includes(aid(s)) &&
            (String(s.player?.id) === "0") === props.rival &&
            typeof s.direction === "string" &&
            s.direction.includes("#")
    )
);

const total = computed(() => attacks.value.length);

function corridorColor(wins: number, fails: number): string {
    const decided = wins + fails;
    if (decided === 0) return "#e2e8f0";
    const r = wins / decided;
    return r >= 0.66 ? "#4ade80" : r >= 0.4 ? "#facc15" : "#f87171";
}

const aggregated = computed(() => {
    const map = new Map<string, Corridor>();
    for (const s of attacks.value) {
        const parts = String(s.direction).split("#");
        const from = fromPoint(parts[0]);
        const to = toPoint(parts[parts.length - 1]);
        if (!from || !to) continue;
        const key = `${parts[0]}→${parts[parts.length - 1]}`;
        const win = props.rival ? s.to === 2 : s.to === 1;
        const fail = props.rival ? s.to === 1 : s.to === 2;
        const entry: Corridor = map.get(key) ??
            { x1: from.x, y1: from.y, x2: to.x, y2: to.y, count: 0, wins: 0, fails: 0, color: "", d: "", head: "", width: 0, opacity: 0 };
        entry.count++;
        if (win) entry.wins++;
        if (fail) entry.fails++;
        map.set(key, entry);
    }
    const list = [...map.values()];
    const maxC = Math.max(...list.map((c) => c.count), 1);
    for (const c of list) {
        c.color = corridorColor(c.wins, c.fails);
        // Peso 0..1 dentro del rango de frecuencias de este mapa. Si todas las
        // rutas valen lo mismo (lo habitual con subzonas) se pintan todas a
        // peso medio en vez de todas finas o todas gruesas.
        const t = maxC <= 1 ? 0.5 : (c.count - 1) / (maxC - 1);
        c.width = 1 + 5 * t;
        c.opacity = 0.35 + 0.6 * t;
        const dx = c.x2 - c.x1;
        const dy = c.y2 - c.y1;
        const len = Math.max(Math.hypot(dx, dy), 0.001);
        const bow = Math.min(len * 0.12, 22);
        const cx = (c.x1 + c.x2) / 2 + (-dy / len) * bow;
        const cy = (c.y1 + c.y2) / 2 + (dx / len) * bow;
        const at = (u: number) => {
            const v = 1 - u;
            return {
                x: v * v * c.x1 + 2 * v * u * cx + u * u * c.x2,
                y: v * v * c.y1 + 2 * v * u * cy + u * u * c.y2,
            };
        };
        // La línea para en la BASE de la punta: se recorre la curva hacia
        // atrás hasta que la distancia al vértice es la longitud de la punta y
        // se parte ahí (de Casteljau: la mitad izquierda de una cuadrática
        // conserva p1 y toma lerp(p1, control, u) como control).
        const size = headSize(c.width, len);
        const hLen = HEAD_AXIAL * size;
        // Bisección: la distancia al vértice decrece de forma monótona al
        // crecer u. Un barrido a pasos fijos dejaba un hueco visible entre el
        // final de la línea y la base de la punta.
        let lo = 0;
        let hi = 1;
        for (let i = 0; i < 20; i++) {
            const mid = (lo + hi) / 2;
            const q = at(mid);
            if (Math.hypot(c.x2 - q.x, c.y2 - q.y) > hLen) lo = mid;
            else hi = mid;
        }
        const end = at(hi);
        const qx = c.x1 + (cx - c.x1) * hi;
        const qy = c.y1 + (cy - c.y1) * hi;
        c.d = `M ${c.x1} ${c.y1} Q ${qx} ${qy} ${end.x} ${end.y}`;
        // Vértice en el punto de caída real, apertura hacia atrás siguiendo la
        // tangente de la curva en ese extremo.
        const angle = Math.atan2(c.y2 - cy, c.x2 - cx);
        const corner = (a: number) =>
            `${c.x2 + Math.cos(a) * size},${c.y2 + Math.sin(a) * size}`;
        c.head = `${c.x2},${c.y2} ${corner(angle + HEAD_SPREAD)} ${corner(angle - HEAD_SPREAD)}`;
    }
    return list;
});

// Todas las rutas, sin tope: un `slice` oculto hacía que el dibujo no
// cuadrara con los números. La frecuencia va en el trazo (grosor + opacidad).
// De menor a mayor para que las rutas dominantes queden encima.
const arrows = computed(() =>
    [...aggregated.value].sort((a, b) => a.count - b.count)
);

const heat = computed(() =>
    aggregated.value.map((c) => ({
        x: c.x2,
        y: c.y2,
        count: c.count,
        color: c.wins >= c.fails ? (c.wins > 0 ? "#4ade80" : "#38bdf8") : "#f87171",
    }))
);

const attackerLabel = computed(() =>
    props.rival ? t("courtMap.attackUpRival") : t("courtMap.attackUpUs")
);
</script>
