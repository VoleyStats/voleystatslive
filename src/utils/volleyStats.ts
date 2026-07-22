// Fórmulas y constantes de estadísticas compartidas entre el visor de un
// partido (GeneralStats.vue, components/stats/PlayersSection.vue) y las estadísticas agregadas
// de equipo (composables/useTeamStats.ts, TeamMatches.vue). Todo lo que hay
// aquí opera sobre el shape crudo de un doc de `live_matches/{code}/stats`
// (ver contrato en ../../CLAUDE.md y VoleyStatsApp/CLAUDE.md) — no dupliques
// estas constantes/fórmulas en un componente nuevo, impórtalas de aquí.

export type StatDoc = any;

// Stats administrativos (tiempo muerto "0", ajuste "98", cambio "99"):
// llevan `to` != 0 pero no son puntos jugados.
export const ADMIN_IDS = ["0", "98", "99"];

export const KILL_IDS = ["9", "10", "11"];
export const ATTACK_IDS = ["6", "9", "10", "11", "16", "17", "47"];
export const ATTACK_ERR_IDS = ["16", "17"];
export const SERVE_IDS = ["8", "15", "32", "39", "40", "41"];
export const SERVE_ERR_IDS = ["15", "32"];
export const RECEPTION_IDS = ["1", "2", "3", "4", "22"];
// Nota de recepción: id de acción -> nota 0-3 (3 = perfecta).
export const RECEPTION_GRADES: Record<string, number> = { "4": 3, "3": 2, "2": 1, "1": 0, "22": 0 };
// Nota de saque 0-3 (misma fórmula que la app iPad). OJO: `PlayersSection.vue`
// tiene los pesos de 39/41 permutados (bug conocido, no se corrige aquí para
// no cambiar una cifra ya publicada) — código nuevo debe usar estos pesos.
export const SERVE_WEIGHTS: Record<string, number> = { "39": 0.5, "40": 1, "41": 2, "8": 3 };
// Pesos del eje "recepción" del radar de equipo/jugadora (0-3, mismo patrón
// que SERVE_WEIGHTS): ids fuera de este mapa (incl. "22", error) pesan 0.
export const RADAR_RECEIVE_WEIGHTS: Record<string, number> = { "1": 0.5, "2": 1, "3": 2, "4": 3 };
// Ids de acción propia que, si son la última acción propia antes de un punto
// cerrado como "error rival" (captura en cancha), generan un kill/ace
// derivado — ver `deriveCredits`.
export const DERIVED_KILL_SOURCE_IDS = ["6", "47", "9", "10", "11"];

// Claves de i18n `stats.areas.<key>` para `action.area` 0..9 (ActionAreas en
// la app). Las áreas 7/8/9 (ajuste, free ball, down ball) no se mostraban
// hasta ahora en la web.
export const AREA_LABEL_KEYS = [
    "reception",
    "block",
    "defense",
    "setting",
    "serve",
    "attack",
    "fault",
    "adjust",
    "freeball",
    "downhit",
] as const;

export const aid = (s: StatDoc): string => String(s?.action?.id ?? "");
export const isRival = (s: StatDoc): boolean => String(s?.player?.id ?? "") === "0";
export const rivalServing = (s: StatDoc): boolean => String(s?.server?.id ?? "") === "0";
export const isAdmin = (s: StatDoc): boolean => ADMIN_IDS.includes(aid(s));
export const isGameStat = (s: StatDoc): boolean => !isAdmin(s);
export const isPointEnder = (s: StatDoc): boolean => s?.to !== 0;

// ------------------------------------------------------------------------
// A. Motor de kills/aces DERIVADOS (captura en cancha)
// ------------------------------------------------------------------------
// En modo captura "cancha" las jugadas que GANAMOS se registran como error
// del rival (action.id "22"/"23", player.id "0", to==1): la app no vuelve a
// tocar la acción propia que realmente cerró el punto (nuestro remate o
// saque), así que hay que reconstruir ese crédito recorriendo la secuencia
// del partido en orden. `orderedStats` debe ser la secuencia de UN SOLO
// partido (los stats de varios partidos no se deben mezclar: `to`/`order`
// no son comparables entre partidos) y debe venir ya filtrada de acciones
// admin (`isGameStat`) para que no contaminen `rallyOwn`.
export interface DerivedCredits {
    kills: Set<StatDoc>;
    aces: Set<StatDoc>;
    // Sentinel de error rival (to==1, action.id "22"/"23", player.id "0") ->
    // acción propia (saque o ataque) que el motor le acreditó el punto. Deja
    // reatribuir "origen de los puntos"/"puntos por jugadora" a la jugadora
    // real en vez de al sentinel rival — ver GeneralStats.vue.
    creditedBy: Map<StatDoc, StatDoc>;
}

export function deriveCredits(orderedStats: StatDoc[]): DerivedCredits {
    const kills = new Set<StatDoc>();
    const aces = new Set<StatDoc>();
    const creditedBy = new Map<StatDoc, StatDoc>();
    let rallyOwn: StatDoc[] = [];
    for (const s of orderedStats) {
        if (s.to !== 0) {
            if (s.to === 1 && isRival(s) && ["22", "23"].includes(aid(s)) && rallyOwn.length) {
                const prev = rallyOwn[rallyOwn.length - 1];
                if (SERVE_IDS.includes(aid(prev))) {
                    aces.add(prev);
                    creditedBy.set(s, prev);
                } else if (DERIVED_KILL_SOURCE_IDS.includes(aid(prev))) {
                    kills.add(prev);
                    creditedBy.set(s, prev);
                }
            }
            rallyOwn = [];
        } else if (!isRival(s)) {
            rallyOwn.push(s);
        }
    }
    return { kills, aces, creditedBy };
}

// Combina los créditos derivados de varios partidos en un único par de
// `Set` (identidades de objeto — seguro de mezclar entre partidos, a
// diferencia de `stat.id`, que se reinicia en cada partido).
export function mergeCredits(list: DerivedCredits[]): DerivedCredits {
    const kills = new Set<StatDoc>();
    const aces = new Set<StatDoc>();
    const creditedBy = new Map<StatDoc, StatDoc>();
    for (const c of list) {
        for (const s of c.kills) kills.add(s);
        for (const s of c.aces) aces.add(s);
        for (const [k, v] of c.creditedBy) creditedBy.set(k, v);
    }
    return { kills, aces, creditedBy };
}

export const isKill = (s: StatDoc, derivedKills: Set<StatDoc>): boolean =>
    KILL_IDS.includes(aid(s)) || derivedKills.has(s);

export const isAce = (s: StatDoc, derivedAces: Set<StatDoc>): boolean =>
    (aid(s) === "8" && s.to === 1) || derivedAces.has(s);

// Errores no forzados: puntos del rival regalados sin oposición (error de
// saque, ataque fallado sin bloqueo, colocación o free). Ver GeneralStats.vue
// para el contexto de por qué esto sustituye al antiguo "regalados" bruto.
export const isUnforced = (s: StatDoc): boolean =>
    s.to === 2 &&
    !isRival(s) &&
    (SERVE_ERR_IDS.includes(aid(s)) ||
        (ATTACK_ERR_IDS.includes(aid(s)) && s.detail !== "Blocked") ||
        aid(s) === "24" ||
        aid(s) === "25");

export const pct = (won: number, total: number): string =>
    total > 0 ? Math.round((won / total) * 100) + "%" : "—";

export interface WinLoss {
    won: number;
    total: number;
}

// Side-out: puntos jugados con el rival al saque (recepción propia).
export function sideOutStats(pointEnders: StatDoc[]): WinLoss {
    const rec = pointEnders.filter(rivalServing);
    return { total: rec.length, won: rec.filter((s) => s.to === 1).length };
}

// Break: puntos jugados con saque propio.
export function breakStats(pointEnders: StatDoc[]): WinLoss {
    const srv = pointEnders.filter((s) => !rivalServing(s));
    return { total: srv.length, won: srv.filter((s) => s.to === 1).length };
}

export interface AttackTotals {
    attempts: number;
    kills: number;
    errors: number;
    blocked: number;
}

// Totales de ataque propio (excluye al rival). `filter` permite acotar el
// ámbito (p.ej. solo K1/K2) sin reimplementar el recorrido. `derivedKills`
// es el `Set` que devuelve `deriveCredits`/`mergeCredits` — pasa un `Set`
// vacío si no se dispone del motor de derivados (p.ej. datos sin capturar
// en modo "cancha").
export function attackTotals(
    stats: StatDoc[],
    derivedKills: Set<StatDoc>,
    filter: (s: StatDoc) => boolean = () => true
): AttackTotals {
    const t: AttackTotals = { attempts: 0, kills: 0, errors: 0, blocked: 0 };
    for (const s of stats) {
        if (isRival(s) || !ATTACK_IDS.includes(aid(s)) || !filter(s)) continue;
        t.attempts++;
        if (isKill(s, derivedKills)) t.kills++;
        else if (s.detail === "Blocked") t.blocked++;
        else if (ATTACK_ERR_IDS.includes(aid(s))) t.errors++;
    }
    return t;
}

// Eficiencia de ataque FIVB: (kills - errores - bloqueados) / intentos.
export function attackEfficiency(t: AttackTotals): number {
    return t.attempts > 0 ? Math.round(((t.kills - t.errors - t.blocked) / t.attempts) * 100) : 0;
}

export interface ReceptionTotals {
    total: number;
    sum: number;
    perfect: number;
    good: number;
    bad: number;
    errors: number;
}

// Recepción propia (excluye al rival), con el desglose de notas.
export function receptionTotals(stats: StatDoc[]): ReceptionTotals {
    const r: ReceptionTotals = { total: 0, sum: 0, perfect: 0, good: 0, bad: 0, errors: 0 };
    for (const s of stats) {
        if (isRival(s)) continue;
        const id = aid(s);
        if (!(id in RECEPTION_GRADES)) continue;
        r.total++;
        r.sum += RECEPTION_GRADES[id];
        if (id === "4") r.perfect++;
        else if (id === "3") r.good++;
        else if (id === "2") r.bad++;
        else r.errors++; // "1" (pasada en juego, cuenta como fallo) y "22" (error)
    }
    return r;
}

export function receptionMark(r: ReceptionTotals): string {
    return r.total > 0 ? (r.sum / r.total).toFixed(1) : "0.0";
}

export interface UnforcedShare {
    count: number;
    total: number;
    share: number;
}

// Cuota de errores no forzados sobre los puntos perdidos (pointEnders con
// `to === 2`).
export function unforcedShare(pointEnders: StatDoc[]): UnforcedShare {
    const theirPts = pointEnders.filter((s) => s.to === 2);
    const count = theirPts.filter(isUnforced).length;
    return { count, total: theirPts.length, share: theirPts.length ? count / theirPts.length : 0 };
}

export interface AreaTotals {
    area: number;
    total: number;
    won: number;
    errors: number;
}

// Totales por área de juego (`action.area`, propio equipo) — total de
// acciones, "ganados" (`action.type === "earn"`) y errores
// (`action.type === "error"`).
export function areaTotals(stats: StatDoc[]): AreaTotals[] {
    const map = new Map<number, AreaTotals>();
    for (const s of stats) {
        if (isRival(s) || isAdmin(s)) continue;
        const area = Number(s?.action?.area ?? -1);
        if (area < 0) continue;
        const entry = map.get(area) ?? { area, total: 0, won: 0, errors: 0 };
        entry.total++;
        if (s?.action?.type === "earn") entry.won++;
        else if (s?.action?.type === "error") entry.errors++;
        map.set(area, entry);
    }
    return [...map.values()].sort((a, b) => a.area - b.area);
}

export interface SetsScore {
    us: number;
    them: number;
}

// Sets ganados por cada equipo, incluyendo el set en curso si ya está
// cerrado — mismo criterio que usa el marcador en vivo de la app
// (`Match.updateLiveScoreboard`): los sets_us/sets_them publicados no
// cuentan el set decisivo hasta que existe un set posterior.
export function currentSetsWon(match: StatDoc): SetsScore {
    let us = Number(match?.sets_us ?? 0);
    let them = Number(match?.sets_them ?? 0);
    if (match?.set_closed) {
        const cur = (match?.sets_scoreboard ?? []).find((s: StatDoc) => s.number === match.current_set);
        if (cur) {
            if (cur.score_us > cur.score_them) us++;
            else if (cur.score_them > cur.score_us) them++;
        }
    }
    return { us, them };
}

// Criterio de "partido terminado" (también usado para decidir qué partidos
// son cacheables, ver useTeamStats.ts): la app publica `live=false` al
// desactivar el directo o al cerrar el set decisivo. Como red de seguridad
// para docs antiguos que nunca actualizan `live`, también se considera
// terminado si el último set está cerrado y algún equipo alcanzó la mayoría.
export function isMatchFinished(match: StatDoc): boolean {
    if (!match) return false;
    if (match.live === false) return true;
    if (match.set_closed !== true) return false;
    const nSets = Number(match.n_sets ?? 5);
    const majority = Math.floor(nSets / 2) + 1;
    const { us, them } = currentSetsWon(match);
    return us >= majority || them >= majority;
}

// ------------------------------------------------------------------------
// B/C. Radar de equipo / por jugadora (5 ejes, 0-100)
// ------------------------------------------------------------------------
export interface RadarAxes {
    attack: number;
    serve: number;
    block: number;
    dig: number;
    receive: number;
}

// 100 * (count(type earn) + 0.5*count(type in.play)) / count(*) — usado por
// los ejes ataque y bloqueo. Se basa en `action.type` tal cual lo publica la
// app (no en `isKill`): en captura "cancha" esto puede infravalorar el
// ataque respecto al KPI de eficiencia FIVB, es la fórmula pedida para el radar.
function earnInPlayScore(items: StatDoc[]): number {
    if (!items.length) return 0;
    let score = 0;
    for (const s of items) {
        if (s?.action?.type === "earn") score += 1;
        else if (s?.action?.type === "in.play") score += 0.5;
    }
    return Math.round((100 * score) / items.length);
}

// 100 * Σweight(action.id) / count(*) / 3 — usado por los ejes saque y
// recepción (pesos 0-3, ids fuera del mapa pesan 0).
function gradedScore(items: StatDoc[], weights: Record<string, number>): number {
    if (!items.length) return 0;
    let sum = 0;
    for (const s of items) sum += weights[aid(s)] ?? 0;
    return Math.round((100 * sum) / items.length / 3);
}

export interface RadarOwnFilters {
    attack: (s: StatDoc) => boolean;
    block: (s: StatDoc) => boolean;
    dig: (s: StatDoc) => boolean;
    serve: (s: StatDoc) => boolean;
    receive: (s: StatDoc) => boolean;
}

// Filtro "propio equipo" por defecto (`player.id != "0"`) — el radar de
// EQUIPO usa este mismo filtro en los 5 ejes, incluido el de saque (a
// diferencia del radar por jugadora, que en el eje de saque filtra por
// `server.id`, ver `playerRadarFilters`).
export const TEAM_RADAR_FILTERS: RadarOwnFilters = {
    attack: (s) => !isRival(s),
    block: (s) => !isRival(s),
    dig: (s) => !isRival(s),
    serve: (s) => !isRival(s),
    receive: (s) => !isRival(s),
};

// Filtros del radar de UNA jugadora: attack/block/dig/receive por
// `player.id`; saque por `server.id` (más fiable que `player.id` para esa
// acción concreta).
export function playerRadarFilters(playerId: string): RadarOwnFilters {
    return {
        attack: (s) => String(s?.player?.id ?? "") === playerId,
        block: (s) => String(s?.player?.id ?? "") === playerId,
        dig: (s) => String(s?.player?.id ?? "") === playerId,
        receive: (s) => String(s?.player?.id ?? "") === playerId,
        serve: (s) => String(s?.server?.id ?? "") === playerId,
    };
}

export function radarAxes(stats: StatDoc[], filters: RadarOwnFilters): RadarAxes {
    const byArea = (area: number, filter: (s: StatDoc) => boolean) =>
        stats.filter((s) => Number(s?.action?.area ?? -1) === area && filter(s));

    const digItems = byArea(2, filters.dig);
    const dig = digItems.length ? Math.round((100 * digItems.filter((s) => aid(s) === "5").length) / digItems.length) : 0;

    return {
        attack: earnInPlayScore(byArea(5, filters.attack)),
        serve: gradedScore(byArea(4, filters.serve), SERVE_WEIGHTS),
        block: earnInPlayScore(byArea(1, filters.block)),
        dig,
        receive: gradedScore(byArea(0, filters.receive), RADAR_RECEIVE_WEIGHTS),
    };
}

// ------------------------------------------------------------------------
// D. Rotations 360 — heatmap por rotación
// ------------------------------------------------------------------------
export interface RotationRow {
    n: number;
    soWon: number;
    soTotal: number;
    brWon: number;
    brTotal: number;
    recSum: number;
    recTotal: number;
    atkKills: number;
    atkTotal: number;
    ourErrors: number;
    rallies: number;
    netDiff: number;
}

// `gameStats` debe venir ya sin acciones admin (`isGameStat`). Solo se
// devuelven las rotaciones con `rallies > 0` (regla de UI aplicada aquí
// para que también acote la media de errores "de las rotaciones visibles").
export function rotationBreakdown(gameStats: StatDoc[], derivedKills: Set<StatDoc>): RotationRow[] {
    const map = new Map<number, RotationRow>();
    for (const s of gameStats) {
        const r = Number(s?.rotationCount);
        if (!Number.isFinite(r) || r < 1 || r > 6) continue;
        const e =
            map.get(r) ??
            ({ n: r, soWon: 0, soTotal: 0, brWon: 0, brTotal: 0, recSum: 0, recTotal: 0, atkKills: 0, atkTotal: 0, ourErrors: 0, rallies: 0, netDiff: 0 } as RotationRow);
        if (s.to !== 0) {
            if (rivalServing(s)) {
                e.soTotal++;
                if (s.to === 1) e.soWon++;
            } else {
                e.brTotal++;
                if (s.to === 1) e.brWon++;
            }
            if (s.to === 2 && !isRival(s)) e.ourErrors++;
        }
        if (!isRival(s)) {
            const id = aid(s);
            if (id in RECEPTION_GRADES) {
                e.recSum += RECEPTION_GRADES[id];
                e.recTotal++;
            }
            if (ATTACK_IDS.includes(id)) {
                e.atkTotal++;
                if (isKill(s, derivedKills)) e.atkKills++;
            }
        }
        map.set(r, e);
    }
    for (const e of map.values()) {
        e.rallies = e.soTotal + e.brTotal;
        e.netDiff = (e.soWon + e.brWon) * 2 - e.rallies;
    }
    return [...map.values()]
        .filter((e) => e.rallies > 0)
        .sort((a, b) => a.n - b.n);
}

// ------------------------------------------------------------------------
// E. Ataque por fase K1/K2, por grado de recepción y por técnica
// ------------------------------------------------------------------------

// K1 = rival al saque (side-out), K2 = resto (break/transición).
export function attackPhaseTotals(gameStats: StatDoc[], derivedKills: Set<StatDoc>): { k1: AttackTotals; k2: AttackTotals } {
    return {
        k1: attackTotals(gameStats, derivedKills, rivalServing),
        k2: attackTotals(gameStats, derivedKills, (s) => !rivalServing(s)),
    };
}

export type GradeBucket = AttackTotals;

// Ataque propio agrupado por la nota de la última recepción propia (puntero
// que se actualiza con cada recepción y se limpia al cerrarse el punto).
// `orderedGameStats` debe ser la secuencia de UN SOLO partido, en orden, sin
// acciones admin — mezclar partidos rompería el reinicio del puntero entre
// sets con el mismo número (p.ej. el set 3 de un partido y el set 3 del
// siguiente). Usa `mergeGradeBuckets` para combinar varios partidos.
export function attackByReceptionGradeForMatch(orderedGameStats: StatDoc[], derivedKills: Set<StatDoc>): Map<number, GradeBucket> {
    const buckets = new Map<number, GradeBucket>();
    let lastGrade: number | null = null;
    let lastSetN: number | null = null;
    for (const s of orderedGameStats) {
        const n = Number(s.set?.number ?? 0);
        if (n !== lastSetN) {
            lastSetN = n;
            lastGrade = null;
        }
        const id = aid(s);
        if (!isRival(s) && id in RECEPTION_GRADES) {
            lastGrade = RECEPTION_GRADES[id];
        } else if (!isRival(s) && ATTACK_IDS.includes(id) && lastGrade !== null) {
            const b = buckets.get(lastGrade) ?? { attempts: 0, kills: 0, errors: 0, blocked: 0 };
            b.attempts++;
            if (isKill(s, derivedKills)) b.kills++;
            else if (s.detail === "Blocked") b.blocked++;
            else if (ATTACK_ERR_IDS.includes(id)) b.errors++;
            buckets.set(lastGrade, b);
        }
        if (s.to !== 0) lastGrade = null;
    }
    return buckets;
}

export function mergeGradeBuckets(maps: Map<number, GradeBucket>[]): Map<number, GradeBucket> {
    const out = new Map<number, GradeBucket>();
    for (const m of maps) {
        for (const [g, b] of m) {
            const e = out.get(g) ?? { attempts: 0, kills: 0, errors: 0, blocked: 0 };
            e.attempts += b.attempts;
            e.kills += b.kills;
            e.errors += b.errors;
            e.blocked += b.blocked;
            out.set(g, e);
        }
    }
    return out;
}

export interface TechniqueDef {
    key: string;
    ids: string[];
    killId: string;
    errId: string | null;
}

// spike (6/9/16), tip (10/17/47), blockout (11, sin error) y downhit
// (12/14/19 — área `downhit`, fuera de `ATTACK_IDS`). El kill de cada bucket
// es `action.id === killId` UNIDO a `isKill` (necesario para blockout,
// derivados de spike/tip, y para que el downhit directo con id "12" cuente
// aunque no sea un id derivable).
export const TECHNIQUE_DEFS: TechniqueDef[] = [
    { key: "spike", ids: ["6", "9", "16"], killId: "9", errId: "16" },
    { key: "tip", ids: ["10", "17", "47"], killId: "10", errId: "17" },
    { key: "blockout", ids: ["11"], killId: "11", errId: null },
    { key: "downhit", ids: ["12", "14", "19"], killId: "12", errId: "19" },
];

export interface TechniqueBucket extends AttackTotals {
    key: string;
    eff: number;
}

export function attackByTechnique(stats: StatDoc[], derivedKills: Set<StatDoc>): TechniqueBucket[] {
    const out: TechniqueBucket[] = [];
    for (const def of TECHNIQUE_DEFS) {
        const t: AttackTotals = { attempts: 0, kills: 0, errors: 0, blocked: 0 };
        for (const s of stats) {
            if (isRival(s) || !def.ids.includes(aid(s))) continue;
            t.attempts++;
            if (aid(s) === def.killId || isKill(s, derivedKills)) t.kills++;
            else if (s.detail === "Blocked") t.blocked++;
            else if (def.errId && aid(s) === def.errId) t.errors++;
        }
        if (t.attempts > 0) out.push({ key: def.key, ...t, eff: attackEfficiency(t) });
    }
    return out;
}

// ------------------------------------------------------------------------
// F. Colocadora → atacante
// ------------------------------------------------------------------------

// Jugadoras propias con al menos una acción en el ámbito (para descartar
// colocadoras "fantasma" que no pertenecen al roster visible).
export function activePlayerIds(stats: StatDoc[]): Set<string> {
    const set = new Set<string>();
    for (const s of stats) {
        if (!isRival(s)) {
            const id = String(s?.player?.id ?? "");
            if (id) set.add(id);
        }
    }
    return set;
}

export interface SetterConnection {
    key: string;
    setterId: string;
    setterName: string;
    attackerId: string;
    attackerName: string;
    attempts: number;
    kills: number;
}

export function setterConnections(
    stats: StatDoc[],
    derivedKills: Set<StatDoc>,
    activeIds: Set<string>
): SetterConnection[] {
    const map = new Map<string, SetterConnection>();
    for (const s of stats) {
        if (isRival(s) || !ATTACK_IDS.includes(aid(s))) continue;
        const st = s.setter;
        if (!st) continue;
        const setterId = String(st.id ?? "");
        const attackerId = String(s.player?.id ?? "");
        if (setterId === "0" || setterId === attackerId || !activeIds.has(setterId)) continue;
        const key = `${setterId}|${attackerId}`;
        const e = map.get(key) ?? {
            key,
            setterId,
            setterName: st.name ?? "",
            attackerId,
            attackerName: s.player?.name ?? "",
            attempts: 0,
            kills: 0,
        };
        e.attempts++;
        if (isKill(s, derivedKills)) e.kills++;
        map.set(key, e);
    }
    return [...map.values()];
}

// Estimador bayesiano simple (shrinkage hacia la media del grupo) para no
// sobrevalorar parejas colocadora/atacante con pocos intentos.
export function shrinkRate(kills: number, attempts: number, base: number, k = 12): number {
    return attempts + k > 0 ? (kills + k * base) / (attempts + k) : base;
}
