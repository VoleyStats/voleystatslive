<template>
    <div class="w-full flex flex-col items-center gap-2">
        <svg :viewBox="`0 0 ${W} ${H}`" class="w-full max-w-sm select-none">
            <defs>
                <filter id="heatBlur" x="-80%" y="-80%" width="260%" height="260%">
                    <feGaussianBlur stdDeviation="10" />
                </filter>
                <marker id="arrowHead" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                    <path d="M 0 0 L 6 3 L 0 6 z" fill="context-stroke" />
                </marker>
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

            <!-- flechas de corredores (top 6 por volumen) -->
            <line
                v-for="(a, i) in arrows"
                :key="'a' + i"
                :x1="a.x1"
                :y1="a.y1"
                :x2="a.x2"
                :y2="a.y2"
                :stroke="a.color"
                :stroke-width="1.5 + Math.min(a.count, 6)"
                stroke-linecap="round"
                marker-end="url(#arrowHead)"
                opacity="0.9"
            />

            <!-- etiqueta del atacante -->
            <text :x="W / 2" :y="H - 6" text-anchor="middle" fill="#94a3b8" font-size="11">
                {{ attackerLabel }}
            </text>
        </svg>

        <p v-if="total === 0" class="text-xs text-slate-500">{{ $t('courtMap.noDirections') }}</p>
        <p v-else class="text-xs text-slate-500">
            {{ $t('courtMap.summary', { n: total }) }}
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
// como hasta ahora en GeneralStats/PlayersSection). Las estadísticas de equipo
// (TeamMatches.vue) pasan la familia de saque reutilizando el mismo render:
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

function zoneCenter(zone: string, top: boolean): { x: number; y: number } | null {
    const rows = top ? RIVAL_ROWS : OWN_ROWS;
    for (let r = 0; r < 3; r++) {
        const c = rows[r].indexOf(zone);
        if (c >= 0) {
            const x = M + c * colW + colW / 2;
            const y = top ? netY - (r + 0.5) * rowH : netY + (r + 0.5) * rowH;
            return { x, y };
        }
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
    const zone = token[0];
    return zoneCenter(zone, false);
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
    const zone = token[0];
    return zoneCenter(zone, true);
}

interface Corridor {
    x1: number; y1: number; x2: number; y2: number;
    count: number; wins: number; fails: number;
    color: string;
}

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
        const entry = map.get(key) ?? { x1: from.x, y1: from.y, x2: to.x, y2: to.y, count: 0, wins: 0, fails: 0, color: "" };
        entry.count++;
        if (win) entry.wins++;
        if (fail) entry.fails++;
        map.set(key, entry);
    }
    const list = [...map.values()];
    for (const c of list) c.color = corridorColor(c.wins, c.fails);
    return list;
});

const arrows = computed(() =>
    [...aggregated.value].sort((a, b) => b.count - a.count).slice(0, 6)
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
