// Tablas de equipo por destreza (attack/serve/receive/block/dig/fault/set/
// downhit). Paridad numérica con la app (`*TableRows` de StatsCalculator): los
// conteos salen del motor único (`volleyStats.ts`, definiciones en
// ../../VoleyStatsApp/METRICS.md) — aquí solo se da forma de tabla.
//
// Todas las funciones esperan `gameStats` ya filtrado con `isGameStat`
// (sin acciones admin "0"/"98"/"99") y CON las filas del rival (los derivados
// las necesitan). `d` son los créditos derivados (`deriveCredits`) del mismo
// ámbito. Saque: la columna de puntos ganados usa además el array crudo.

import {
    ATTACK_IDS,
    BLOCK_IDS,
    DIG_ERROR_IDS,
    DIG_IDS,
    FAULT_IDS,
    SET_IDS,
    aid,
    attackEfficiency,
    attackTotals,
    blockLine,
    efficiencyLabel,
    isRival,
    ownServes,
    receptionMarkLabel,
    receptionTotals,
    serveBreakdown,
    setLine,
    wonServingByServer,
    type DerivedCredits,
    type StatDoc,
} from "./volleyStats";

export interface SkillColumn {
    key: string;
    labelKey: string;
}

export interface SkillRow {
    id: string;
    name: string;
    values: Record<string, number>;
    mark?: string;
}

export interface SkillTable {
    columns: SkillColumn[];
    rows: SkillRow[];
    total: SkillRow;
    // Clave i18n de la etiqueta de la columna "mark" (nota), si la tabla la tiene.
    markLabelKey?: string;
}

function sumRows(rows: SkillRow[], keys: string[]): Record<string, number> {
    const out: Record<string, number> = {};
    for (const k of keys) out[k] = 0;
    for (const r of rows) for (const k of keys) out[k] += r.values[k] ?? 0;
    return out;
}

// ------------------------------------------------------------------------
// Ataque: columnas [total, puntos, errores]; mark = EFICIENCIA
// `(puntos − errores) / ataques` (% entero con signo, ver `efficiencyLabel`).
// Puntos con `isKill` (incluye los derivados); errores = ids 16/17 (los
// bloqueados van dentro y se restan una sola vez). Intentos = `ATTACK_IDS`.
// ------------------------------------------------------------------------
export function attackSkillTable(gameStats: StatDoc[], d: DerivedCredits): SkillTable {
    const columns: SkillColumn[] = [
        { key: "total", labelKey: "team.colTotal" },
        { key: "kills", labelKey: "team.colKills" },
        { key: "errors", labelKey: "team.colErrors" },
    ];
    const names = new Map<string, string>();
    for (const s of gameStats) {
        const id = String(s.player?.id ?? "");
        if (id && !isRival(s) && ATTACK_IDS.includes(aid(s)) && !names.has(id)) names.set(id, s.player?.name || id);
    }
    const markOf = (t: { attempts: number; kills: number; errors: number }) => (t.attempts ? efficiencyLabel(attackEfficiency(t)) : "—");
    const rows: SkillRow[] = [...names.entries()]
        .map(([id, name]) => {
            const t = attackTotals(gameStats, d, (s) => String(s.player?.id ?? "") === id);
            return { id, name, values: { total: t.attempts, kills: t.kills, errors: t.errors }, mark: markOf(t) };
        })
        .sort((a, b) => b.values.total - a.values.total);
    const team = attackTotals(gameStats, d);
    return {
        columns,
        rows,
        total: { id: "__total__", name: "", values: { total: team.attempts, kills: team.kills, errors: team.errors }, mark: markOf(team) },
        markLabelKey: "team.markEff",
    };
}

// ------------------------------------------------------------------------
// Saque (D1): universo = `ownServes` (ids 8/15/32/39/40/41, agrupado por
// `server`, sin servidor rival y sin stage K1). Aces con `isAce` (el ace
// derivado SALE de los grados). Nota = (0.5·débil + 1·medio + 2·fuerte +
// 3·ace)/saques, errores con peso 0. Última columna (puntos ganados sacando):
// filas no administrativas con `to == 1` por `server` del array CRUDO.
// ------------------------------------------------------------------------
export function serveSkillTable(gameStats: StatDoc[], allStatsRaw: StatDoc[], d: DerivedCredits): SkillTable {
    const columns: SkillColumn[] = [
        { key: "total", labelKey: "team.colTotal" },
        { key: "aces", labelKey: "team.colAces" },
        { key: "g3", labelKey: "team.col3" },
        { key: "g2", labelKey: "team.col2" },
        { key: "g1", labelKey: "team.col1" },
        { key: "errors", labelKey: "team.colErrors" },
        { key: "wonServing", labelKey: "team.colWonServing" },
    ];
    const serves = ownServes(gameStats);
    const won = wonServingByServer(allStatsRaw);
    const names = new Map<string, string>();
    for (const s of serves) {
        const id = String(s.server?.id ?? "");
        if (id && !names.has(id)) names.set(id, s.server?.name || id);
    }
    const markOf = (mark: number, total: number) => (total ? mark.toFixed(1) : "—");
    const rows: SkillRow[] = [...names.entries()]
        .map(([id, name]) => {
            const b = serveBreakdown(ownServes(gameStats, id), d);
            const values = { total: b.total, aces: b.aces, g3: b.strong, g2: b.medium, g1: b.weak, errors: b.errors, wonServing: won.get(id) ?? 0 };
            return { id, name, values, mark: markOf(b.mark, b.total) };
        })
        .sort((a, b) => b.values.total - a.values.total);
    const team = serveBreakdown(serves, d);
    let teamWon = 0;
    for (const v of won.values()) teamWon += v;
    return {
        columns,
        rows,
        total: {
            id: "__total__",
            name: "",
            values: { total: team.total, aces: team.aces, g3: team.strong, g2: team.medium, g1: team.weak, errors: team.errors, wonServing: teamWon },
            mark: markOf(team.mark, team.total),
        },
        markLabelKey: "team.markServe03",
    };
}

// ------------------------------------------------------------------------
// Recepción: columnas [total, 3(id4), 2(id3), 1(id2), overpass(id1), errores(id22)].
// mark = etiqueta canónica "NN% (MM%)" (`receptionMarkLabel`): NN = nota 0-3
// (# 3, + 2, - 1, overpass 0.5, error 0) como %, MM = % de perfectas.
// ------------------------------------------------------------------------
export function receiveSkillTable(gameStats: StatDoc[]): SkillTable {
    const columns: SkillColumn[] = [
        { key: "total", labelKey: "team.colTotal" },
        { key: "g3", labelKey: "team.col3" },
        { key: "g2", labelKey: "team.col2" },
        { key: "g1", labelKey: "team.col1" },
        { key: "overpass", labelKey: "team.colOverpass" },
        { key: "errors", labelKey: "team.colErrors" },
    ];
    const names = new Map<string, string>();
    for (const s of gameStats) {
        const id = String(s.player?.id ?? "");
        if (id && !isRival(s) && ["1", "2", "3", "4", "22"].includes(aid(s)) && !names.has(id)) names.set(id, s.player?.name || id);
    }
    const rowOf = (r: ReturnType<typeof receptionTotals>) => ({
        values: { total: r.total, g3: r.perfect, g2: r.good, g1: r.bad, overpass: r.overpass, errors: r.errors },
        mark: r.total ? receptionMarkLabel(r.sum / r.total, Math.round((r.perfect / r.total) * 100)) : "—",
    });
    const rows: SkillRow[] = [...names.entries()]
        .map(([id, name]) => ({ id, name, ...rowOf(receptionTotals(gameStats, id)) }))
        .sort((a, b) => b.values.total - a.values.total);
    return {
        columns,
        rows,
        total: { id: "__total__", name: "", ...rowOf(receptionTotals(gameStats)) },
        markLabelKey: "team.markReceivePct",
    };
}

// ------------------------------------------------------------------------
// Bloqueo: columnas [total, bloqueos(13), errores(20)]. Sin mark.
// ------------------------------------------------------------------------
export function blockSkillTable(gameStats: StatDoc[]): SkillTable {
    const columns: SkillColumn[] = [
        { key: "total", labelKey: "team.colTotal" },
        { key: "blocks", labelKey: "team.colBlocks" },
        { key: "errors", labelKey: "team.colErrors" },
    ];
    const names = new Map<string, string>();
    for (const s of gameStats) {
        const id = String(s.player?.id ?? "");
        if (id && !isRival(s) && BLOCK_IDS.includes(aid(s)) && !names.has(id)) names.set(id, s.player?.name || id);
    }
    const valuesOf = (id?: string) => {
        const b = blockLine(gameStats, id);
        return { total: b.total, blocks: b.points, errors: b.errors };
    };
    const rows: SkillRow[] = [...names.entries()]
        .map(([id, name]) => ({ id, name, values: valuesOf(id) }))
        .sort((a, b) => b.values.total - a.values.total);
    return { columns, rows, total: { id: "__total__", name: "", values: valuesOf() } };
}

// ------------------------------------------------------------------------
// Defensa: columnas [total, errores (DIG_ERROR_IDS: 23, 21 "de quién es" y 25
// de los históricos de free ball plegados aquí — ver DIG_IDS)]. Sin mark.
// ------------------------------------------------------------------------
export function digSkillTable(gameStats: StatDoc[]): SkillTable {
    const columns: SkillColumn[] = [
        { key: "total", labelKey: "team.colTotal" },
        { key: "errors", labelKey: "team.colErrors" },
    ];
    const entries = new Map<string, { name: string; total: number; errors: number }>();
    for (const s of gameStats) {
        const a = aid(s);
        if (isRival(s) || !DIG_IDS.includes(a)) continue;
        const id = String(s.player?.id ?? "");
        if (!id) continue;
        const e = entries.get(id) ?? { name: s.player?.name || id, total: 0, errors: 0 };
        e.total++;
        if (DIG_ERROR_IDS.includes(a)) e.errors++;
        entries.set(id, e);
    }
    const rows: SkillRow[] = [...entries.entries()]
        .map(([id, e]) => ({ id, name: e.name, values: { total: e.total, errors: e.errors } }))
        .sort((a, b) => b.values.total - a.values.total);
    return { columns, rows, total: { id: "__total__", name: "", values: sumRows(rows, ["total", "errors"]) } };
}

// ------------------------------------------------------------------------
// Faltas: columnas [total, red(28), dobles(29), fuera de rotación(33),
// invasión bajo red(30)]. El resto de la familia (31/32/34/48-50) cuenta en el
// total sin columna propia. Sin mark.
// ------------------------------------------------------------------------
export function faultSkillTable(gameStats: StatDoc[]): SkillTable {
    const columns: SkillColumn[] = [
        { key: "total", labelKey: "team.colTotal" },
        { key: "net", labelKey: "team.colNet" },
        { key: "handling", labelKey: "team.colHandling" },
        { key: "rotation", labelKey: "team.colRotationFault" },
        { key: "underNet", labelKey: "team.colUnderNet" },
    ];
    const entries = new Map<string, { name: string; total: number; net: number; handling: number; rotation: number; underNet: number }>();
    for (const s of gameStats) {
        const a = aid(s);
        if (isRival(s) || !FAULT_IDS.includes(a)) continue;
        const id = String(s.player?.id ?? "");
        if (!id) continue;
        const e = entries.get(id) ?? { name: s.player?.name || id, total: 0, net: 0, handling: 0, rotation: 0, underNet: 0 };
        e.total++;
        if (a === "28") e.net++;
        else if (a === "29") e.handling++;
        else if (a === "33") e.rotation++;
        else if (a === "30") e.underNet++;
        entries.set(id, e);
    }
    const rows: SkillRow[] = [...entries.entries()]
        .map(([id, e]) => ({ id, name: e.name, values: { total: e.total, net: e.net, handling: e.handling, rotation: e.rotation, underNet: e.underNet } }))
        .sort((a, b) => b.values.total - a.values.total);
    return { columns, rows, total: { id: "__total__", name: "", values: sumRows(rows, ["total", "net", "handling", "rotation", "underNet"]) } };
}

// ------------------------------------------------------------------------
// Colocación: fila por jugadora = sus acciones propias de colocación
// (24/42) MÁS todas las acciones de ataque en las que ella es
// `stat.setter.id` (`setLine`). Columnas [total, errores(24)]. Sin mark.
// ------------------------------------------------------------------------
export function setSkillTable(gameStats: StatDoc[]): SkillTable {
    const columns: SkillColumn[] = [
        { key: "total", labelKey: "team.colTotal" },
        { key: "errors", labelKey: "team.colErrors" },
    ];
    const names = new Map<string, string>();
    for (const s of gameStats) {
        const a = aid(s);
        if (!isRival(s) && SET_IDS.includes(a)) {
            const id = String(s.player?.id ?? "");
            if (id && !names.has(id)) names.set(id, s.player?.name || id);
        } else if (!isRival(s) && ATTACK_IDS.includes(a)) {
            const st = s.setter;
            const id = String(st?.id ?? "");
            if (st && id && id !== "0" && !names.has(id)) names.set(id, st.name || id);
        }
    }
    const valuesOf = (id?: string) => {
        const l = setLine(gameStats, id);
        return { total: l.total, errors: l.errors };
    };
    const rows: SkillRow[] = [...names.entries()]
        .map(([id, name]) => ({ id, name, values: valuesOf(id) }))
        .sort((a, b) => b.values.total - a.values.total);
    return { columns, rows, total: { id: "__total__", name: "", values: valuesOf() } };
}
