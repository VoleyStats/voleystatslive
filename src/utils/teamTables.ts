// Fase 2b — tablas de equipo por destreza (attack/serve/receive/block/dig/
// fault/set/free/downhit). Paridad numérica con la app iOS: ids, universos y
// fórmulas copiados literalmente de la spec de referencia — no "corrijas"
// aparentes inconsistencias (p.ej. el id "32" en errores de saque) sin
// confirmar primero con el contrato de la app (`../VoleyStatsApp/CLAUDE.md`).
//
// Todas las funciones esperan `gameStats` ya filtrado con `isGameStat`
// (sin acciones admin "0"/"98"/"99") salvo donde se indique explícitamente
// lo contrario (saque: última columna sobre el array crudo, sin filtrar).

import { ATTACK_ERR_IDS, ATTACK_IDS, KILL_IDS, aid, isRival, type StatDoc } from "./volleyStats";

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

// ids de acción por destreza, tal como los agrupa la app (actionsByType).
export const BLOCK_IDS = ["7", "13", "20"];
export const SERVE_TABLE_IDS = ["15", "8", "39", "40", "41"];
export const DIG_IDS = ["23", "5", "21", "43", "44", "45", "46"];
export const RECEIVE_TABLE_IDS = ["1", "2", "3", "4", "22"];
export const FAULT_IDS = ["28", "29", "30", "31", "32", "33", "34"];
export const ATTACK_TABLE_IDS = ATTACK_IDS; // ["6","9","10","11","16","17","47"] (mismo conjunto)
export const SET_IDS = ["24", "42"];
export const FREE_IDS = ["25", "35", "36", "37"];
export const DOWNHIT_IDS = ["12", "14", "19"];

function sumRows(rows: SkillRow[], keys: string[]): Record<string, number> {
    const out: Record<string, number> = {};
    for (const k of keys) out[k] = 0;
    for (const r of rows) for (const k of keys) out[k] += r.values[k] ?? 0;
    return out;
}

// ------------------------------------------------------------------------
// Ataque: columnas [total, kills, errores] — kills/errores CRUDOS (ids
// 9/10/11 y 16/17), sin el motor de derivados. mark = kill% (0-100).
// ------------------------------------------------------------------------
export function attackSkillTable(gameStats: StatDoc[]): SkillTable {
    const columns: SkillColumn[] = [
        { key: "total", labelKey: "team.colTotal" },
        { key: "kills", labelKey: "team.colKills" },
        { key: "errors", labelKey: "team.colErrors" },
    ];
    const entries = new Map<string, { name: string; total: number; kills: number; errors: number }>();
    for (const s of gameStats) {
        const a = aid(s);
        if (isRival(s) || !ATTACK_TABLE_IDS.includes(a)) continue;
        const id = String(s.player?.id ?? "");
        if (!id) continue;
        const e = entries.get(id) ?? { name: s.player?.name || id, total: 0, kills: 0, errors: 0 };
        e.total++;
        if (KILL_IDS.includes(a)) e.kills++;
        else if (ATTACK_ERR_IDS.includes(a)) e.errors++;
        entries.set(id, e);
    }
    const markOf = (v: Record<string, number>) => (v.total ? Math.round((v.kills / v.total) * 100) + "%" : "—");
    const rows: SkillRow[] = [...entries.entries()]
        .map(([id, e]) => ({ id, name: e.name, values: { total: e.total, kills: e.kills, errors: e.errors } }))
        .map((r) => ({ ...r, mark: markOf(r.values) }))
        .sort((a, b) => b.values.total - a.values.total);
    const totalValues = sumRows(rows, ["total", "kills", "errors"]);
    return {
        columns,
        rows,
        total: { id: "__total__", name: "", values: totalValues, mark: markOf(totalValues) },
        markLabelKey: "team.markKillPct",
    };
}

// ------------------------------------------------------------------------
// Saque: universo = stats de juego con ids de saque Y `stage != 1` (excluye
// K1), agrupado por `server.id`. Última columna (puntos ganados sacando)
// sobre el array de stats SIN excluir admin, filtrado `to==1`, agrupado por
// `server.id` — recibe ese array por separado (`allStatsRaw`).
// ------------------------------------------------------------------------
export function serveSkillTable(gameStats: StatDoc[], allStatsRaw: StatDoc[]): SkillTable {
    const columns: SkillColumn[] = [
        { key: "total", labelKey: "team.colTotal" },
        { key: "aces", labelKey: "team.colAces" },
        { key: "g3", labelKey: "team.col3" },
        { key: "g2", labelKey: "team.col2" },
        { key: "g1", labelKey: "team.col1" },
        { key: "errors", labelKey: "team.colErrors" },
        { key: "wonServing", labelKey: "team.colWonServing" },
    ];
    const universe = gameStats.filter((s) => SERVE_TABLE_IDS.includes(aid(s)) && Number(s.stage) !== 1);
    const entries = new Map<string, { name: string; total: number; aces: number; g3: number; g2: number; g1: number; errors: number }>();
    for (const s of universe) {
        const id = String(s.server?.id ?? "");
        if (!id || id === "0") continue; // solo jugadoras propias
        const e = entries.get(id) ?? { name: s.server?.name || id, total: 0, aces: 0, g3: 0, g2: 0, g1: 0, errors: 0 };
        e.total++;
        const a = aid(s);
        if (a === "8") e.aces++;
        else if (a === "41") e.g3++;
        else if (a === "40") e.g2++;
        else if (a === "39") e.g1++;
        else if (a === "15" || a === "32") e.errors++;
        entries.set(id, e);
    }
    const wonServing = new Map<string, number>();
    for (const s of allStatsRaw) {
        if (s.to !== 1) continue;
        const id = String(s.server?.id ?? "");
        if (!id || id === "0") continue;
        wonServing.set(id, (wonServing.get(id) ?? 0) + 1);
    }
    const ids = new Set<string>([...entries.keys(), ...wonServing.keys()]);
    const markOf = (v: Record<string, number>) =>
        v.total ? ((v.g1 * 0.5 + v.g2 * 1 + v.g3 * 2 + v.aces * 3) / v.total).toFixed(1) : "—";
    const rows: SkillRow[] = [...ids]
        .map((id) => {
            const e = entries.get(id) ?? { name: id, total: 0, aces: 0, g3: 0, g2: 0, g1: 0, errors: 0 };
            const values = { total: e.total, aces: e.aces, g3: e.g3, g2: e.g2, g1: e.g1, errors: e.errors, wonServing: wonServing.get(id) ?? 0 };
            return { id, name: e.name, values, mark: markOf(values) };
        })
        .sort((a, b) => b.values.total - a.values.total);
    const totalValues = sumRows(rows, ["total", "aces", "g3", "g2", "g1", "errors", "wonServing"]);
    return {
        columns,
        rows,
        total: { id: "__total__", name: "", values: totalValues, mark: markOf(totalValues) },
        markLabelKey: "team.markServe03",
    };
}

// ------------------------------------------------------------------------
// Recepción: columnas [total, 3(id4), 2(id3), 1(id2+id1), errores(id22)].
// mark = (n1*0.5 + n2*1 + n3*2 + n4*3)/total (0-3) — pesos sobre los ids
// crudos 1/2/3/4, NO sobre la columna "1" ya fusionada.
// ------------------------------------------------------------------------
export function receiveSkillTable(gameStats: StatDoc[]): SkillTable {
    const columns: SkillColumn[] = [
        { key: "total", labelKey: "team.colTotal" },
        { key: "g3", labelKey: "team.col3" },
        { key: "g2", labelKey: "team.col2" },
        { key: "g1", labelKey: "team.col1" },
        { key: "errors", labelKey: "team.colErrors" },
    ];
    const entries = new Map<string, { name: string; total: number; g3: number; g2: number; g1: number; errors: number; n1: number; n2: number; n3: number; n4: number }>();
    for (const s of gameStats) {
        const a = aid(s);
        if (isRival(s) || !RECEIVE_TABLE_IDS.includes(a)) continue;
        const id = String(s.player?.id ?? "");
        if (!id) continue;
        const e =
            entries.get(id) ?? { name: s.player?.name || id, total: 0, g3: 0, g2: 0, g1: 0, errors: 0, n1: 0, n2: 0, n3: 0, n4: 0 };
        e.total++;
        if (a === "4") { e.g3++; e.n4++; }
        else if (a === "3") { e.g2++; e.n3++; }
        else if (a === "2") { e.g1++; e.n2++; }
        else if (a === "1") { e.g1++; e.n1++; }
        else if (a === "22") e.errors++;
        entries.set(id, e);
    }
    const rows: SkillRow[] = [...entries.entries()]
        .map(([id, e]) => {
            const values = { total: e.total, g3: e.g3, g2: e.g2, g1: e.g1, errors: e.errors };
            const mark = e.total ? ((e.n1 * 0.5 + e.n2 * 1 + e.n3 * 2 + e.n4 * 3) / e.total).toFixed(1) : "—";
            return { id, name: e.name, values, mark };
        })
        .sort((a, b) => b.values.total - a.values.total);
    // Recalcula el mark del total a partir de los pesos crudos agregados
    // (no se puede derivar solo de las columnas fusionadas g1/g2/g3).
    let n1 = 0, n2 = 0, n3 = 0, n4 = 0;
    for (const e of entries.values()) { n1 += e.n1; n2 += e.n2; n3 += e.n3; n4 += e.n4; }
    const totalValues = sumRows(rows, ["total", "g3", "g2", "g1", "errors"]);
    const totalMark = totalValues.total ? ((n1 * 0.5 + n2 * 1 + n3 * 2 + n4 * 3) / totalValues.total).toFixed(1) : "—";
    return {
        columns,
        rows,
        total: { id: "__total__", name: "", values: totalValues, mark: totalMark },
        markLabelKey: "team.markReceive03",
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
    const entries = new Map<string, { name: string; total: number; blocks: number; errors: number }>();
    for (const s of gameStats) {
        const a = aid(s);
        if (isRival(s) || !BLOCK_IDS.includes(a)) continue;
        const id = String(s.player?.id ?? "");
        if (!id) continue;
        const e = entries.get(id) ?? { name: s.player?.name || id, total: 0, blocks: 0, errors: 0 };
        e.total++;
        if (a === "13") e.blocks++;
        else if (a === "20") e.errors++;
        entries.set(id, e);
    }
    const rows: SkillRow[] = [...entries.entries()]
        .map(([id, e]) => ({ id, name: e.name, values: { total: e.total, blocks: e.blocks, errors: e.errors } }))
        .sort((a, b) => b.values.total - a.values.total);
    return { columns, rows, total: { id: "__total__", name: "", values: sumRows(rows, ["total", "blocks", "errors"]) } };
}

// ------------------------------------------------------------------------
// Defensa: columnas [total, errores(23)]. Sin mark.
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
        if (a === "23") e.errors++;
        entries.set(id, e);
    }
    const rows: SkillRow[] = [...entries.entries()]
        .map(([id, e]) => ({ id, name: e.name, values: { total: e.total, errors: e.errors } }))
        .sort((a, b) => b.values.total - a.values.total);
    return { columns, rows, total: { id: "__total__", name: "", values: sumRows(rows, ["total", "errors"]) } };
}

// ------------------------------------------------------------------------
// Faltas: columnas [total, red(28), dobles(29), fuera de rotación(33),
// invasión bajo red(30)]. Los ids 31/32/34 cuentan en el total pero sin
// columna propia. Sin mark.
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
// `stat.setter.id` (crédito de colocación). Columnas [total, errores(24)].
// Sin mark. Fila total = stats de colocación propias + ataques con
// `setter.id != "0"`.
// ------------------------------------------------------------------------
export function setSkillTable(gameStats: StatDoc[]): SkillTable {
    const columns: SkillColumn[] = [
        { key: "total", labelKey: "team.colTotal" },
        { key: "errors", labelKey: "team.colErrors" },
    ];
    const entries = new Map<string, { name: string; total: number; errors: number }>();
    const bump = (id: string, name: string | undefined, isErr: boolean) => {
        if (!id) return;
        const e = entries.get(id) ?? { name: name || id, total: 0, errors: 0 };
        e.total++;
        if (isErr) e.errors++;
        entries.set(id, e);
    };
    for (const s of gameStats) {
        const a = aid(s);
        if (!isRival(s) && SET_IDS.includes(a)) {
            bump(String(s.player?.id ?? ""), s.player?.name, a === "24");
        } else if (!isRival(s) && ATTACK_TABLE_IDS.includes(a)) {
            const st = s.setter;
            const setterId = String(st?.id ?? "");
            if (st && setterId !== "0") bump(setterId, st.name, false);
        }
    }
    const rows: SkillRow[] = [...entries.entries()]
        .map(([id, e]) => ({ id, name: e.name, values: { total: e.total, errors: e.errors } }))
        .sort((a, b) => b.values.total - a.values.total);
    return { columns, rows, total: { id: "__total__", name: "", values: sumRows(rows, ["total", "errors"]) } };
}

// ------------------------------------------------------------------------
// Free ball: columnas [total, 3(37), 2(36), 1(35), errores(25)].
// mark = (n35*1 + n36*2 + n37*3)/total (0-3).
// ------------------------------------------------------------------------
export function freeSkillTable(gameStats: StatDoc[]): SkillTable {
    const columns: SkillColumn[] = [
        { key: "total", labelKey: "team.colTotal" },
        { key: "g3", labelKey: "team.col3" },
        { key: "g2", labelKey: "team.col2" },
        { key: "g1", labelKey: "team.col1" },
        { key: "errors", labelKey: "team.colErrors" },
    ];
    const entries = new Map<string, { name: string; total: number; g3: number; g2: number; g1: number; errors: number }>();
    for (const s of gameStats) {
        const a = aid(s);
        if (isRival(s) || !FREE_IDS.includes(a)) continue;
        const id = String(s.player?.id ?? "");
        if (!id) continue;
        const e = entries.get(id) ?? { name: s.player?.name || id, total: 0, g3: 0, g2: 0, g1: 0, errors: 0 };
        e.total++;
        if (a === "37") e.g3++;
        else if (a === "36") e.g2++;
        else if (a === "35") e.g1++;
        else if (a === "25") e.errors++;
        entries.set(id, e);
    }
    const markOf = (v: Record<string, number>) => (v.total ? ((v.g1 * 1 + v.g2 * 2 + v.g3 * 3) / v.total).toFixed(1) : "—");
    const rows: SkillRow[] = [...entries.entries()]
        .map(([id, e]) => ({ id, name: e.name, values: { total: e.total, g3: e.g3, g2: e.g2, g1: e.g1, errors: e.errors } }))
        .map((r) => ({ ...r, mark: markOf(r.values) }))
        .sort((a, b) => b.values.total - a.values.total);
    const totalValues = sumRows(rows, ["total", "g3", "g2", "g1", "errors"]);
    return {
        columns,
        rows,
        total: { id: "__total__", name: "", values: totalValues, mark: markOf(totalValues) },
        markLabelKey: "team.markFree03",
    };
}

// ------------------------------------------------------------------------
// Down ball: SOLO card de equipo (la app tampoco desglosa por jugadora).
// ------------------------------------------------------------------------
export interface DownhitTotals {
    total: number;
    won: number;
    errors: number;
}

export function downhitTotals(gameStats: StatDoc[]): DownhitTotals {
    let total = 0;
    let won = 0;
    let errors = 0;
    for (const s of gameStats) {
        const a = aid(s);
        if (isRival(s) || !DOWNHIT_IDS.includes(a)) continue;
        total++;
        if (a === "12") won++;
        else if (a === "19") errors++;
    }
    return { total, won, errors };
}
