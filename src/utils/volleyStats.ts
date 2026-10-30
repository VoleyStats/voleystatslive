// MOTOR ÚNICO de estadísticas de la web. Implementa lo definido en
// ../../VoleyStatsApp/METRICS.md (la app iOS es la referencia; Android y esta
// web remiten allí): una métrica = una función de este fichero. Las páginas,
// gráficas, tablas, insights y el overlay LEEN de aquí; nunca recuentan ids
// por su cuenta (si una pantalla necesita una variante, es otra función con
// otro nombre y su fila en METRICS.md).
//
// Opera sobre el shape crudo de un doc de `live_matches/{code}/stats` (contrato
// en ../../CLAUDE.md y ../VoleyStatsApp/CLAUDE.md). Convenciones:
//  - `game`: filas del ámbito SIN acciones administrativas (`isGameStat`) e
//    INCLUYENDO las del rival (`player.id === "0"`): sin ellas se pierden los
//    puntos del rival y los derivados.
//  - `d` (`DerivedCredits`): resultado de `deriveCredits` sobre UN partido
//    (`mergeCredits` para varios). Todo conteo de aces o kills pasa por
//    `isAce`/`isKill`.
//  - Las funciones con `playerId` acotan a esa jugadora (saque: por `server`;
//    el resto: por `player`).

export type StatDoc = any;

// Stats administrativos (tiempo muerto "0", ajuste "98", cambio "99"):
// llevan `to` != 0 pero no son puntos jugados.
export const ADMIN_IDS = ["0", "98", "99"];

export const KILL_IDS = ["9", "10", "11"];
// Intentos de ataque (D3): fuera el free 12/14/19, el legacy 18 y el ataque
// zaguero 34 (es una falta).
export const ATTACK_IDS = ["6", "47", "9", "10", "11", "16", "17"];
export const ATTACK_ERR_IDS = ["16", "17"];
// Saque (D1): la falta de pie (32) es un saque y un error de saque.
export const SERVE_IDS = ["8", "15", "32", "39", "40", "41"];
export const SERVE_ERR_IDS = ["15", "32"];
export const RECEPTION_IDS = ["1", "2", "3", "4", "22"];
// CATEGORÍA de recepción: id de acción -> 3 (#), 2 (+), 1 (-), -1 (overpass,
// id "1"), 0 (error, id "22"). Es una clave de categoría (histogramas, ataque
// según la recepción, leyendas) — NUNCA se suma: el overpass restaría. Toda
// nota o media usa `RECEPTION_VALUES`.
export const RECEPTION_OVERPASS = -1;
export const RECEPTION_CATEGORIES: Record<string, number> = { "4": 3, "3": 2, "2": 1, "1": RECEPTION_OVERPASS, "22": 0 };
// VALOR de recepción en la escala 0-3 de la nota: # 3, + 2, - 1, overpass
// 0.5, error 0.
export const RECEPTION_VALUES: Record<string, number> = { "4": 3, "3": 2, "2": 1, "1": 0.5, "22": 0 };
// Nota de saque 0-3: débil 0.5, medio 1, fuerte 2, ace 3; el error pesa 0 pero
// sigue en el denominador.
export const SERVE_WEIGHT_WEAK = 0.5;
export const SERVE_WEIGHT_MEDIUM = 1;
export const SERVE_WEIGHT_STRONG = 2;
export const SERVE_WEIGHT_ACE = 3;
// Familias por fundamento (`actionsByType` de la app).
export const BLOCK_IDS = ["7", "13", "20"];
export const DIG_IDS = ["23", "5", "21", "43", "44", "45", "46", "25", "35", "36", "37"];
export const FAULT_IDS = ["28", "29", "30", "31", "32", "33", "34", "48", "49", "50"];
export const SET_IDS = ["24", "42"];
export const DOWNHIT_IDS = ["12", "14", "19"];
// Errores por fundamento (`errorIdsBySkill` de la app) — catálogo canónico del
// reparto de `ownErrors`. Más dos cajones: "fault" (familia falta) y "other".
export const ERROR_IDS_BY_SKILL: { skill: string; ids: string[] }[] = [
    { skill: "attack", ids: ATTACK_ERR_IDS },
    { skill: "serve", ids: SERVE_ERR_IDS },
    { skill: "receive", ids: ["22"] },
    { skill: "set", ids: ["24"] },
    { skill: "dig", ids: ["23", "21", "25"] },
    { skill: "block", ids: ["20"] },
];
// Errores de defensa: 23, 21 ("de quién es") y 25, iguales en la tabla, en la
// valoración y en el reparto de `ownErrors` (METRICS.md, 2026-10-30).
export const DIG_ERROR_IDS = ["23", "21", "25"];
// Paleta única de "nota" 0-3 (recepción: RECEPTION_GRADES; saque: los ids
// 41/40/39 se etiquetan en UI como grado 3/2/1, ver `team.col3/col2/col1` en
// PlayerDetailSection.vue). 3=perfecta, 2=buena, 1=mala, 0=error. Semántica
// pedida por el owner: verde oscuro/verde claro/amarillo/rojo — el verde
// oscuro y el rojo de referencia (#166534/#DC2626) se aclaran un punto en la
// escala Tailwind (mismo hue) para quedar legibles como texto/serie de
// gráfica sobre los fondos `ink` (dark-only); el amarillo y el verde claro
// de referencia ya tenían contraste suficiente y se usan tal cual.
export const GRADE_COLORS: Record<number, string> = {
    3: "#16A34A", // verde oscuro (perfecta) — green-600, ref. #166534 (green-800)
    2: "#4ADE80", // verde claro (buena) — green-400, igual que la referencia
    1: "#EAB308", // amarillo (mala) — yellow-500, igual que la referencia
    0: "#EF4444", // rojo (error) — red-500, ref. #DC2626 (red-600)
    // Overpass de recepción (categoría -1): naranja entre el amarillo de "-" y
    // el rojo de error.
    [-1]: "#F97316", // naranja (overpass) — orange-500
};
// Ids de acción propia que, si son la última acción propia antes de un punto
// cerrado como "error rival" (captura en cancha), generan un kill/ace
// derivado — ver `deriveCredits`.
export const DERIVED_KILL_SOURCE_IDS = ["6", "47", "9", "10", "11"];
// Ids de la fila rival que, con `to == 1`, pueden esconder un ace/kill propio:
// error de recepción (22) o de defensa (23) del rival.
export const DERIVED_RIVAL_ERROR_IDS = ["22", "23"];

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
const playerIdOf = (s: StatDoc): string => String(s?.player?.id ?? "");
const serverIdOf = (s: StatDoc): string => String(s?.server?.id ?? "");
const isOwnOf = (playerId?: string) => (s: StatDoc): boolean =>
    !isRival(s) && (playerId === undefined || playerIdOf(s) === playerId);

// Redondeo "half away from zero" (Swift `.rounded()`): `Math.round` redondea
// los .5 negativos hacia +inf (-12.5 -> -12) y la app da -13.
export const roundHalfAway = (x: number): number => (x < 0 ? -Math.round(-x) : Math.round(x));

// ------------------------------------------------------------------------
// A. Motor de kills/aces DERIVADOS (en cualquier modo de captura)
// ------------------------------------------------------------------------
// Un punto nuestro puede grabarse como error del rival (action.id "22"/"23",
// player.id "0", to==1) con nuestra acción real (saque o ataque) en una fila
// anterior del mismo rally: la app no vuelve a tocar esa acción. La detección
// no mira el modo de captura, solo esa SECUENCIA de filas. `orderedStats` debe
// ser la secuencia de UN SOLO partido (los stats de varios partidos no se deben
// mezclar: `to`/`order` no son comparables entre partidos).
export interface DerivedCredits {
    kills: Set<StatDoc>;
    aces: Set<StatDoc>;
    // Sentinel de error rival (to==1, action.id "22"/"23", player.id "0") ->
    // acción propia (saque o ataque) que el motor le acreditó el punto. Deja
    // reatribuir "origen de los puntos"/"puntos por jugadora" a la jugadora
    // real en vez de al sentinel rival — ver GeneralStats.vue.
    creditedBy: Map<StatDoc, StatDoc>;
}

export const NO_CREDITS: DerivedCredits = { kills: new Set(), aces: new Set(), creditedBy: new Map() };

export function deriveCredits(orderedStats: StatDoc[]): DerivedCredits {
    const kills = new Set<StatDoc>();
    const aces = new Set<StatDoc>();
    const creditedBy = new Map<StatDoc, StatDoc>();
    let rallyOwn: StatDoc[] = [];
    let lastSet: unknown = null;
    for (const s of orderedStats) {
        if (isAdmin(s)) continue; // tiempo muerto / ajuste / cambio no son juego
        // Un rally no cruza de set: lo que quede sin cerrar no se arrastra.
        const setKey = s?.set?.number ?? s?.set?.id ?? null;
        if (setKey !== lastSet) {
            lastSet = setKey;
            rallyOwn = [];
        }
        if (s.to !== 0) {
            if (s.to === 1 && isRival(s) && DERIVED_RIVAL_ERROR_IDS.includes(aid(s)) && rallyOwn.length) {
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

// Combina los créditos derivados de varios partidos en un único objeto
// (identidades de objeto — seguro de mezclar entre partidos, a diferencia de
// `stat.id`, que se reinicia en cada partido).
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

// Kill normalizado: ids de kill explícitos + golpes en juego que cerraron un
// punto vía error del rival. Los intentos NO cambian (el golpe ya contaba).
export const isKill = (s: StatDoc, d: DerivedCredits): boolean => KILL_IDS.includes(aid(s)) || d.kills.has(s);

// Ace normalizado: id 8 que cerró el punto + saques que ganaron el punto vía
// error de recepción del rival. Un id 8 que no cerró ningún punto (reescritura
// colgada de un grado) no es ace.
export const isAce = (s: StatDoc, d: DerivedCredits): boolean => (aid(s) === "8" && s.to === 1) || d.aces.has(s);

// ------------------------------------------------------------------------
// B. Marcador: origen de los puntos, side-out/break, no forzados, errores
// ------------------------------------------------------------------------
export interface PointsOriginRow {
    us: number;
    them: number;
}

// "Origen de los puntos" por equipo: ataque / bloqueo / ace / errores del
// rival. `us` = `pointSources()` de la app (suma `score_us`), `them` =
// `concededSources()` (suma `score_them`). `pointEnders` son los stats de
// cierre de punto (`to !== 0`) del ámbito ya filtrados de acciones admin y
// CON las filas del rival; `d` los derivados del MISMO ámbito.
// `errors.us` = "puntos por error del rival" SIN los derivados (que cuentan
// como ace/ataque propio); `errors.them` = errores propios.
export interface PointsOrigin {
    attack: PointsOriginRow;
    block: PointsOriginRow;
    ace: PointsOriginRow;
    errors: PointsOriginRow;
}

export function pointsOrigin(pointEnders: StatDoc[], d: DerivedCredits): PointsOrigin {
    const rows: PointsOrigin = {
        attack: { us: 0, them: 0 },
        block: { us: 0, them: 0 },
        ace: { us: 0, them: 0 },
        errors: { us: 0, them: 0 },
    };
    for (const p of pointEnders) {
        const id = aid(p);
        const rival = isRival(p);
        if (p.to === 1) {
            const credit = d.creditedBy.get(p);
            if (credit) {
                if (d.aces.has(credit)) rows.ace.us++;
                else rows.attack.us++;
            } else if (rival) rows.errors.us++;
            else if (KILL_IDS.includes(id) || id === "12") rows.attack.us++;
            else if (id === "13") rows.block.us++;
            else if (id === "8") rows.ace.us++;
            else rows.errors.us++;
        } else if (p.to === 2) {
            if (!rival) {
                // Ataque bloqueado: es el punto de bloqueo del rival guardado en nuestro lado.
                if (ATTACK_ERR_IDS.includes(id) && p.detail === "Blocked") rows.block.them++;
                else rows.errors.them++;
            } else if (id === "8") rows.ace.them++;
            else if (id === "13") rows.block.them++;
            else rows.attack.them++;
        }
    }
    return rows;
}

// Errores no forzados: puntos del rival regalados sin oposición (error de
// saque, ataque fallado sin bloqueo, colocación o free).
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

// Side-out: puntos jugados con el rival al saque (por `server`, no por stage).
export function sideOutStats(pointEnders: StatDoc[]): WinLoss {
    const rec = pointEnders.filter(rivalServing);
    return { total: rec.length, won: rec.filter((s) => s.to === 1).length };
}

// Break: puntos jugados con saque propio (por `server`).
export function breakStats(pointEnders: StatDoc[]): WinLoss {
    const srv = pointEnders.filter((s) => !rivalServing(s));
    return { total: srv.length, won: srv.filter((s) => s.to === 1).length };
}

// Puntos largos: ganados / puntos con `stage == 3` (K3).
export function longRallies(pointEnders: StatDoc[]): WinLoss {
    const k3 = pointEnders.filter((s) => Number(s.stage) === 3);
    return { total: k3.length, won: k3.filter((s) => s.to === 1).length };
}

export interface ErrorsBySkill {
    count: number;
    bySkill: { skill: string; count: number }[];
}

// "Errores" totales (D4): todo punto que perdemos por acción PROPIA = filas
// propias de los puntos con `to == 2` (incluye faltas, tarjeta roja y ataques
// bloqueados). `bySkill` reparte ESAS mismas filas con `ERROR_IDS_BY_SKILL` y
// añade los cajones "fault" (familia falta) y "other" (ids sin catálogo: free
// 19, "de quién es" 21, custom), así que su suma es SIEMPRE `count`. Solo
// cajones con filas, por cantidad desc y, a igualdad, por nombre del cajón.
export function ownErrors(game: StatDoc[], playerId?: string): ErrorsBySkill {
    const own = isOwnOf(playerId);
    const rows = game.filter((s) => s.to === 2 && own(s));
    const counts = new Map<string, number>();
    for (const s of rows) {
        const id = aid(s);
        const skill = ERROR_IDS_BY_SKILL.find((e) => e.ids.includes(id))?.skill ?? (FAULT_IDS.includes(id) ? "fault" : "other");
        counts.set(skill, (counts.get(skill) ?? 0) + 1);
    }
    const bySkill = [...counts.entries()]
        .map(([skill, count]) => ({ skill, count }))
        .sort((a, b) => b.count - a.count || (a.skill < b.skill ? -1 : a.skill > b.skill ? 1 : 0));
    return { count: rows.length, bySkill };
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

// ------------------------------------------------------------------------
// C. Saque (D1): por `server`, sin servidor rival, sin stage K1
// ------------------------------------------------------------------------
// Conjunto canónico de saques propios (`ownServes`). NO es el catálogo de
// captura (sin 32).
export function ownServes(game: StatDoc[], serverId?: string): StatDoc[] {
    return game.filter(
        (s) =>
            Number(s.stage) !== 1 &&
            !rivalServing(s) &&
            SERVE_IDS.includes(aid(s)) &&
            (serverId === undefined || serverIdOf(s) === serverId)
    );
}

export function serveLine(game: StatDoc[], d: DerivedCredits, playerId?: string): { total: number; aces: number; errors: number } {
    const serves = ownServes(game, playerId);
    return {
        total: serves.length,
        aces: serves.filter((s) => isAce(s, d)).length,
        errors: serves.filter((s) => SERVE_ERR_IDS.includes(aid(s))).length,
    };
}

// Peso 0-3 de UN saque. El ace (incluido el derivado, que conserva su grado
// 39/40/41) pesa 3; el resto, por su grado; el error y un 8 colgado, 0.
export function serveWeight(s: StatDoc, d: DerivedCredits): number {
    if (isAce(s, d)) return SERVE_WEIGHT_ACE;
    switch (aid(s)) {
        case "39": return SERVE_WEIGHT_WEAK;
        case "40": return SERVE_WEIGHT_MEDIUM;
        case "41": return SERVE_WEIGHT_STRONG;
        default: return 0;
    }
}

// Nota de saque 0-3: `(0.5·débil + 1·medio + 2·fuerte + 3·ace) / saques`.
export function serveMark(game: StatDoc[], d: DerivedCredits, playerId?: string): { mark: number; total: number } {
    const serves = ownServes(game, playerId);
    if (!serves.length) return { mark: 0, total: 0 };
    let sum = 0;
    for (const s of serves) sum += serveWeight(s, d);
    return { mark: sum / serves.length, total: serves.length };
}

// Desglose de saques de un conjunto ya filtrado (`ownServes`): el ace derivado
// SALE de los grados (se clasifica una sola vez).
export interface ServeBreakdown {
    total: number;
    aces: number;
    strong: number; // 41
    medium: number; // 40
    weak: number; // 39
    errors: number; // 15 / 32
    mark: number; // 0-3
}
export function serveBreakdown(serves: StatDoc[], d: DerivedCredits): ServeBreakdown {
    const b: ServeBreakdown = { total: serves.length, aces: 0, strong: 0, medium: 0, weak: 0, errors: 0, mark: 0 };
    let sum = 0;
    for (const s of serves) {
        const id = aid(s);
        if (isAce(s, d)) b.aces++;
        else if (id === "41") b.strong++;
        else if (id === "40") b.medium++;
        else if (id === "39") b.weak++;
        if (SERVE_ERR_IDS.includes(id)) b.errors++;
        sum += serveWeight(s, d);
    }
    b.mark = b.total ? sum / b.total : 0;
    return b;
}

export interface ServeChart {
    total: number;
    ace: number;
    strong: number;
    medium: number;
    weak: number;
    errorNet: number;
    errorOut: number;
    errorOther: number;
    errors: number;
}

// Gráfica de saque (donut): mismos buckets que la tabla; su total es el de
// `ownServes`.
export function serveChart(game: StatDoc[], d: DerivedCredits, playerId?: string): ServeChart {
    const serves = ownServes(game, playerId);
    const c: ServeChart = { total: serves.length, ace: 0, strong: 0, medium: 0, weak: 0, errorNet: 0, errorOut: 0, errorOther: 0, errors: 0 };
    for (const s of serves) {
        const id = aid(s);
        if (isAce(s, d)) {
            c.ace++;
            continue;
        }
        if (id === "41") c.strong++;
        else if (id === "40") c.medium++;
        else if (id === "39") c.weak++;
        else if (SERVE_ERR_IDS.includes(id)) {
            if (s.detail === "Net") c.errorNet++;
            else if (s.detail === "Out") c.errorOut++;
            else c.errorOther++;
        }
    }
    c.errors = c.errorNet + c.errorOut + c.errorOther;
    return c;
}

// Puntos ganados sacando: filas NO administrativas con `to == 1` agrupadas por
// `server` (sin servidor rival). `rawStats` es el ámbito sin filtrar.
export function wonServingByServer(rawStats: StatDoc[]): Map<string, number> {
    const out = new Map<string, number>();
    for (const s of rawStats) {
        if (s.to !== 1 || isAdmin(s) || rivalServing(s)) continue;
        const id = serverIdOf(s);
        if (!id) continue;
        out.set(id, (out.get(id) ?? 0) + 1);
    }
    return out;
}

// ------------------------------------------------------------------------
// D. Recepción
// ------------------------------------------------------------------------
export interface ReceptionTotals {
    total: number;
    sum: number;
    perfect: number;
    good: number;
    bad: number;
    overpass: number;
    errors: number;
}

// Recepción propia (excluye al rival), con el desglose de notas.
export function receptionTotals(stats: StatDoc[], playerId?: string): ReceptionTotals {
    const r: ReceptionTotals = { total: 0, sum: 0, perfect: 0, good: 0, bad: 0, overpass: 0, errors: 0 };
    const own = isOwnOf(playerId);
    for (const s of stats) {
        if (!own(s)) continue;
        const id = aid(s);
        if (!(id in RECEPTION_VALUES)) continue;
        r.total++;
        r.sum += RECEPTION_VALUES[id];
        if (id === "4") r.perfect++;
        else if (id === "3") r.good++;
        else if (id === "2") r.bad++;
        else if (id === "1") r.overpass++; // pasada en juego: categoría propia, valor 0.5
        else r.errors++; // "22" (error)
    }
    return r;
}

export function receptionMark(r: ReceptionTotals): string {
    return r.total > 0 ? (r.sum / r.total).toFixed(1) : "0.0";
}

// Misma nota 0-3 (`receptionMark`/`r.sum / r.total`) expresada como
// porcentaje — paridad de presentación con las apps. El cálculo interno (la
// media 0-3) no cambia, esto es solo una capa de formato sobre ese número.
export function receptionMarkPercent(avg: number): string {
    return Math.round((avg / 3) * 100) + "%";
}

// % de recepciones "perfectas" (nota 3, id "4") sobre el total de intentos
// de recepción (ids 1/2/3/4/22). `null` si no hay recepciones — el llamador
// decide el fallback ("—").
export function perfectReceptionPercent(r: ReceptionTotals): number | null {
    return r.total > 0 ? Math.round((r.perfect / r.total) * 100) : null;
}

// Etiqueta canónica de nota de recepción "NN% (MM%)" — NN = nota 0-3
// expresada como % (`receptionMarkPercent`), MM = % de recepciones
// perfectas (`perfectReceptionPercent`). Paridad con
// `StatsCalculator.receptionMarkLabel` (app iOS).
export function receptionMarkLabel(avg: number, perfectPercent: number): string {
    return `${receptionMarkPercent(avg)} (${perfectPercent}%)`;
}

// ------------------------------------------------------------------------
// E. Ataque (D2/D3): SOLO eficiencia, nunca kill%
// ------------------------------------------------------------------------
export interface AttackTotals {
    attempts: number;
    kills: number;
    // Ids 16/17. INCLUYE los bloqueados.
    errors: number;
    // `detail == "Blocked"`: SUBCONJUNTO de `errors` (mismo id de error + marca),
    // nunca una categoría aparte — por eso la eficiencia lo resta una sola vez.
    blocked: number;
}

export const newAttackTotals = (): AttackTotals => ({ attempts: 0, kills: 0, errors: 0, blocked: 0 });

function addAttack(t: AttackTotals, s: StatDoc, d: DerivedCredits): void {
    t.attempts++;
    if (isKill(s, d)) t.kills++;
    if (ATTACK_ERR_IDS.includes(aid(s))) t.errors++;
    if (s.detail === "Blocked") t.blocked++;
}

// Eficiencia de ataque: `(puntos − errores) / ataques` (ratio, -1..1; puede ser
// negativa). Los bloqueados están dentro de `errors` y se restan UNA vez.
export function attackEfficiency(t: { attempts: number; kills: number; errors: number }): number {
    return t.attempts > 0 ? (t.kills - t.errors) / t.attempts : 0;
}
// % entero con signo ("-12%"): ÚNICA forma de mostrar la eficiencia.
export const efficiencyPercent = (eff: number): number => roundHalfAway(eff * 100);
export const efficiencyLabel = (eff: number): string => `${efficiencyPercent(eff)}%`;
// Bandas de color: verde ≥25%, ámbar ≥10%, rojo por debajo.
export const EFF_GREEN = 0.25;
export const EFF_AMBER = 0.1;
export function efficiencyClass(eff: number): string {
    return eff >= EFF_GREEN ? "text-green-400" : eff >= EFF_AMBER ? "text-amber-400" : "text-red-400";
}
export function efficiencyHex(eff: number): string {
    return eff >= EFF_GREEN ? "#4ade80" : eff >= EFF_AMBER ? "#fbbf24" : "#f87171";
}

// Totales de ataque propio (excluye al rival; intentos = `ATTACK_IDS`). `filter`
// permite acotar el ámbito (p.ej. una jugadora, o solo K1/K2) sin reimplementar
// el recorrido.
export function attackTotals(stats: StatDoc[], d: DerivedCredits, filter: (s: StatDoc) => boolean = () => true): AttackTotals {
    const t = newAttackTotals();
    for (const s of stats) {
        if (isRival(s) || !ATTACK_IDS.includes(aid(s)) || !filter(s)) continue;
        addAttack(t, s, d);
    }
    return t;
}

export interface AttackChart {
    total: number;
    kills: number;
    errorBlocked: number;
    errorOut: number;
    errorNet: number;
    errorOther: number;
    errors: number;
}

// Gráfica de ataque: total == intentos de la tabla; errores 16/17 repartidos
// por `detail`.
export function attackChart(game: StatDoc[], d: DerivedCredits, playerId?: string): AttackChart {
    const c: AttackChart = { total: 0, kills: 0, errorBlocked: 0, errorOut: 0, errorNet: 0, errorOther: 0, errors: 0 };
    const own = isOwnOf(playerId);
    for (const s of game) {
        if (!own(s) || !ATTACK_IDS.includes(aid(s))) continue;
        c.total++;
        if (isKill(s, d)) c.kills++;
        if (ATTACK_ERR_IDS.includes(aid(s))) {
            c.errors++;
            if (s.detail === "Blocked") c.errorBlocked++;
            else if (s.detail === "Out") c.errorOut++;
            else if (s.detail === "Net") c.errorNet++;
            else c.errorOther++;
        }
    }
    return c;
}

// Distribución del ataque por atacante (insight de concentración).
export function attackDistribution(game: StatDoc[]): { name: string; count: number }[] {
    const counts = new Map<string, number>();
    for (const s of game) {
        if (isRival(s) || !ATTACK_IDS.includes(aid(s))) continue;
        const name = s.player?.name ?? "";
        counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

// ------------------------------------------------------------------------
// F. Bloqueo, defensa, colocación (líneas propias)
// ------------------------------------------------------------------------
export function blockLine(game: StatDoc[], playerId?: string): { total: number; points: number; inPlay: number; errors: number } {
    const own = isOwnOf(playerId);
    const rows = game.filter((s) => own(s) && BLOCK_IDS.includes(aid(s)));
    return {
        total: rows.length,
        points: rows.filter((s) => aid(s) === "13").length,
        inPlay: rows.filter((s) => aid(s) === "7").length,
        errors: rows.filter((s) => aid(s) === "20").length,
    };
}

// Familia dig (incluye las pelotas free históricas). Para la valoración los
// errores son 23, 21 ("de quién es") y 25.
export function digLine(game: StatDoc[], playerId?: string): { total: number; errors: number } {
    const own = isOwnOf(playerId);
    const rows = game.filter((s) => own(s) && DIG_IDS.includes(aid(s)));
    return { total: rows.length, errors: rows.filter((s) => DIG_ERROR_IDS.includes(aid(s))).length };
}

// Familia set (42, error 24) + los ataques cuyo `setter` es ella (equipo: los
// de cualquier colocadora propia), igual que la tabla de colocación.
export function setLine(game: StatDoc[], playerId?: string): { total: number; errors: number } {
    const own = isOwnOf(playerId);
    let total = 0;
    let errors = 0;
    for (const s of game) {
        const id = aid(s);
        if (SET_IDS.includes(id) && own(s)) {
            total++;
            if (id === "24") errors++;
        }
        if (ATTACK_IDS.includes(id)) {
            const setterId = String(s.setter?.id ?? "0");
            if (playerId === undefined ? setterId !== "0" : setterId === playerId) total++;
        }
    }
    return { total, errors };
}

// ------------------------------------------------------------------------
// G. Valoraciones 0-100 (D5) y radar
// ------------------------------------------------------------------------
export interface SkillRatings {
    serve: number | null;
    receive: number | null;
    attack: number | null;
    block: number | null;
    dig: number | null;
    set: number | null;
}

// `null` = sin datos (nunca 0). Sin `playerId` es la valoración del equipo.
//  saque/recepción = nota/3·100; ataque = (eficiencia+1)/2·100;
//  bloqueo = (puntos + 0.5·en juego)/total·100;
//  defensa = defensas sin error/defensas·100; colocación = sin error/total·100.
export function ratings(game: StatDoc[], d: DerivedCredits, playerId?: string): SkillRatings {
    const r: SkillRatings = { serve: null, receive: null, attack: null, block: null, dig: null, set: null };
    const serve = serveMark(game, d, playerId);
    if (serve.total > 0) r.serve = (serve.mark / 3) * 100;
    const rec = receptionTotals(game, playerId);
    if (rec.total > 0) r.receive = (rec.sum / rec.total / 3) * 100;
    const atk = attackTotals(game, d, playerId === undefined ? undefined : (s) => playerIdOf(s) === playerId);
    if (atk.attempts > 0) r.attack = ((attackEfficiency(atk) + 1) / 2) * 100;
    const block = blockLine(game, playerId);
    if (block.total > 0) r.block = ((block.points + 0.5 * block.inPlay) / block.total) * 100;
    const dig = digLine(game, playerId);
    if (dig.total > 0) r.dig = ((dig.total - dig.errors) / dig.total) * 100;
    const set = setLine(game, playerId);
    if (set.total > 0) r.set = ((set.total - set.errors) / set.total) * 100;
    return r;
}

export interface RadarAxes {
    attack: number;
    serve: number;
    block: number;
    dig: number;
    receive: number;
}

// Radar de 5 ejes (attack, block, dig, receive, serve); sin datos = 0. La
// colocación no se dibuja.
export function radarAxes(game: StatDoc[], d: DerivedCredits, playerId?: string): RadarAxes {
    const r = ratings(game, d, playerId);
    const v = (x: number | null) => (x === null ? 0 : Math.round(x));
    return { attack: v(r.attack), serve: v(r.serve), block: v(r.block), dig: v(r.dig), receive: v(r.receive) };
}

// ------------------------------------------------------------------------
// H. Totales por fundamento (donuts "datos absolutos")
// ------------------------------------------------------------------------
export interface AreaTotals {
    area: number;
    total: number;
    won: number;
    errors: number;
}

// Un donut por fundamento, con `action.area` (4 saque, 0 recepción, 1 bloqueo,
// 2 defensa, 3 colocación, 5 ataque): total y ganados salen de las MISMAS líneas
// que las tablas (`serveLine`, `receptionTotals`, `attackTotals`, `blockLine`,
// `digLine`, `setLine`); los errores, de `ownErrors().bySkill`. Los históricos
// de free ball (25/35/36/37) ya cuentan en defensa (`DIG_IDS`).
export function areaTotals(game: StatDoc[], d: DerivedCredits, playerId?: string): AreaTotals[] {
    const errors = ownErrors(game, playerId).bySkill;
    const err = (skill: string) => errors.find((e) => e.skill === skill)?.count ?? 0;
    const serve = serveLine(game, d, playerId);
    const atk = attackTotals(game, d, playerId === undefined ? undefined : (s) => playerIdOf(s) === playerId);
    const block = blockLine(game, playerId);
    return [
        { area: 0, total: receptionTotals(game, playerId).total, won: 0, errors: err("receive") },
        { area: 1, total: block.total, won: block.points, errors: err("block") },
        { area: 2, total: digLine(game, playerId).total, won: 0, errors: err("dig") },
        { area: 3, total: setLine(game, playerId).total, won: 0, errors: err("set") },
        { area: 4, total: serve.total, won: serve.aces, errors: err("serve") },
        { area: 5, total: atk.attempts, won: atk.kills, errors: err("attack") },
    ];
}

// Card de equipo "free" (down ball): intentos, ganados (12) y errores (19).
export function downhitTotals(game: StatDoc[]): { total: number; won: number; errors: number } {
    let total = 0;
    let won = 0;
    let errors = 0;
    for (const s of game) {
        const id = aid(s);
        if (isRival(s) || !DOWNHIT_IDS.includes(id)) continue;
        total++;
        if (id === "12") won++;
        else if (id === "19") errors++;
    }
    return { total, won, errors };
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

// Ventana de tolerancia usada solo por `isMatchCacheable` (ver abajo).
const STALE_LIVE_MATCH_MS = 24 * 60 * 60 * 1000;

// Criterio de "partido cacheable/estable" para la capa de caché de
// useTeamStats.ts (localStorage + qué se reintenta al recargar) — NO
// sustituye a `isMatchFinished()`, que sigue siendo el criterio "estricto"
// usado en el resto de la app (p.ej. `matchOver` en GeneralStats.vue, o los
// récords/rachas agregados de equipo).
//
// Motivo: hay docs `live_matches/{code}` publicados con `live:true` y
// `set_closed:false` de forma permanente por un bug ya corregido del
// backfill de la app (`Match.backfillLiveStats()`); esos partidos son en
// realidad partidos históricos, pero `isMatchFinished()` nunca los marca
// como terminados hasta que el usuario re-sincroniza desde el móvil. Sin
// tolerancia, useTeamStats.ts los trataría como "en vivo" para siempre y
// volvería a descargar doc + stats en cada recarga de la página de equipo.
// Como red de seguridad adicional, si el partido lleva más de 24h desde su
// `date` se asume terminado a efectos de caché (ningún partido real dura
// tanto) — se acepta `fallbackDateSec` (p.ej. la fecha del índice
// `teams/{id}.matches[]`) por si el doc no llegase a publicar `date`.
export function isMatchCacheable(match: StatDoc, now: number = Date.now(), fallbackDateSec?: number): boolean {
    if (isMatchFinished(match)) return true;
    const dateSec = Number(match?.date ?? fallbackDateSec ?? 0);
    if (!dateSec) return false;
    return now - dateSec * 1000 > STALE_LIVE_MATCH_MS;
}

// Suma de puntos publicados en `sets_scoreboard` (todos los sets, incluido el
// que está en curso): la app recalcula y republica ese array en cada punto
// anotado (`Match.updateLiveScoreboard`, ver VoleyStatsApp/CLAUDE.md), así
// que 0 aquí implica de forma fiable que ningún punto se ha jugado todavía
// (puede haber, aun así, alguna stat administrativa — tiempo muerto —
// capturada). Proxy barato (sin leer la subcolección `stats`) para
// `isMatchNotStarted` cuando el llamador no tiene el recuento real de stats
// cargado (listados de equipo, ver useTeamStats.ts/TeamMatches.vue).
export function publishedPointsTotal(match: StatDoc): number {
    const board: StatDoc[] = Array.isArray(match?.sets_scoreboard) ? match.sets_scoreboard : [];
    return board.reduce((sum: number, s: StatDoc) => sum + Number(s?.score_us ?? 0) + Number(s?.score_them ?? 0), 0);
}

// "Partido programado, aún no ha empezado": la app permite activar el
// directo (generar `code` + publicar `live_matches/{code}`) con días de
// antelación, para poder compartir el enlace antes del partido — así que
// `live === true` por sí solo NO implica que haya juego en curso. Se
// considera "no empezado" cuando, además de `live === true`, no se ha
// anotado ningún punto todavía Y la `date` (fecha/hora del partido,
// `Match.toJSON()`) está en el futuro respecto a `now`. Sin `date` (docs
// antiguos que nunca la publicaron) o con `date` ya pasada, se cae siempre
// al criterio "en vivo" habitual — evita ocultar un partido real que
// arrancó tarde, sin `date`, o con el reloj del dispositivo capturador
// desincronizado.
// `statsCount`: nº exacto de stats ya cargadas si se conoce (GeneralStats.vue,
// subcolección ya leída) — `0` es entonces el criterio literal "cero stats".
// `null`: usa el proxy barato `publishedPointsTotal` (listados de equipo, la
// subcolección no se pide solo para listar).
export function isMatchNotStarted(match: StatDoc, statsCount: number | null, now: number = Date.now()): boolean {
    if (!match || match.live !== true) return false;
    const dateSec = Number(match?.date ?? 0);
    if (!dateSec || dateSec * 1000 <= now) return false;
    return (statsCount === null ? publishedPointsTotal(match) : statsCount) === 0;
}


// ------------------------------------------------------------------------
// I. Rotations 360 — heatmap por rotación (side-out/break por `server`)
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
    atkErrors: number;
    atkTotal: number;
    ourErrors: number;
    rallies: number;
    netDiff: number;
}

// Eficiencia de ataque de una rotación: `(puntos − errores) / ataques`.
export const rotationAttackEfficiency = (r: RotationRow): number =>
    attackEfficiency({ attempts: r.atkTotal, kills: r.atkKills, errors: r.atkErrors });

// `gameStats` debe venir ya sin acciones admin (`isGameStat`). Solo se
// devuelven las rotaciones con `rallies > 0` (regla de UI aplicada aquí
// para que también acote la media de errores "de las rotaciones visibles").
export function rotationBreakdown(gameStats: StatDoc[], d: DerivedCredits): RotationRow[] {
    const map = new Map<number, RotationRow>();
    for (const s of gameStats) {
        const r = Number(s?.rotationCount);
        if (!Number.isFinite(r) || r < 1 || r > 6) continue;
        const e =
            map.get(r) ??
            ({ n: r, soWon: 0, soTotal: 0, brWon: 0, brTotal: 0, recSum: 0, recTotal: 0, atkKills: 0, atkErrors: 0, atkTotal: 0, ourErrors: 0, rallies: 0, netDiff: 0 } as RotationRow);
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
            if (id in RECEPTION_VALUES) {
                e.recSum += RECEPTION_VALUES[id];
                e.recTotal++;
            }
            if (ATTACK_IDS.includes(id)) {
                e.atkTotal++;
                if (isKill(s, d)) e.atkKills++;
                if (ATTACK_ERR_IDS.includes(id)) e.atkErrors++;
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
// J. Ataque por fase K1/K2, por grado de recepción y por técnica
// ------------------------------------------------------------------------

// K1 = rival al saque (side-out), K2 = resto (break/transición), por `server`.
export function attackPhaseTotals(gameStats: StatDoc[], d: DerivedCredits): { k1: AttackTotals; k2: AttackTotals } {
    return {
        k1: attackTotals(gameStats, d, rivalServing),
        k2: attackTotals(gameStats, d, (s) => !rivalServing(s)),
    };
}

export type GradeBucket = AttackTotals;

// Ataque propio agrupado por la nota de la última recepción propia (puntero
// que se actualiza con cada recepción y se limpia al cerrarse el punto).
// `orderedGameStats` debe ser la secuencia de UN SOLO partido, en orden, sin
// acciones admin — mezclar partidos rompería el reinicio del puntero entre
// sets con el mismo número. Usa `mergeGradeBuckets` para combinar varios
// partidos. `attackerFilter` acota qué SWINGS cuentan (p.ej. una sola
// jugadora) sin tocar el puntero de "última recepción", que debe seguir
// avanzando con la recepción de CUALQUIER compañera.
export function attackByReceptionGradeForMatch(
    orderedGameStats: StatDoc[],
    d: DerivedCredits,
    attackerFilter: (s: StatDoc) => boolean = () => true
): Map<number, GradeBucket> {
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
        if (!isRival(s) && id in RECEPTION_CATEGORIES) {
            lastGrade = RECEPTION_CATEGORIES[id];
        } else if (!isRival(s) && ATTACK_IDS.includes(id) && lastGrade !== null && attackerFilter(s)) {
            const b = buckets.get(lastGrade) ?? newAttackTotals();
            addAttack(b, s, d);
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
            const e = out.get(g) ?? newAttackTotals();
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
    errId: string;
}

// spike (6/9/16), tip (10/17/47) y downhit (12/14/19 — familia free, fuera de
// `ATTACK_IDS`: se enseña aquí para que la tabla de técnica cubra todo golpe).
// El blockout se construye aparte (ver `attackByTechnique`): el id 11 es SIEMPRE
// un kill, así que su denominador son los kills de blockout + los bloqueados
// directos.
export const TECHNIQUE_DEFS: TechniqueDef[] = [
    { key: "spike", ids: ["6", "9", "16"], killId: "9", errId: "16" },
    { key: "tip", ids: ["10", "17", "47"], killId: "10", errId: "17" },
    { key: "downhit", ids: ["12", "14", "19"], killId: "12", errId: "19" },
];

export interface TechniqueBucket extends AttackTotals {
    key: string;
    // Eficiencia (ratio) = `(puntos − errores) / intentos`.
    eff: number;
}

export function attackByTechnique(stats: StatDoc[], d: DerivedCredits): TechniqueBucket[] {
    const own = stats.filter((s) => !isRival(s));
    const out: TechniqueBucket[] = [];
    const push = (key: string, t: AttackTotals) => {
        if (t.attempts > 0) out.push({ key, ...t, eff: attackEfficiency(t) });
    };
    for (const def of TECHNIQUE_DEFS) {
        if (def.key === "downhit") {
            // Blockout entre tip y downhit, como en la app.
            const boKills = own.filter((s) => aid(s) === "11").length;
            const blockedDirect = own.filter((s) => ATTACK_ERR_IDS.includes(aid(s)) && s.detail === "Blocked").length;
            push("blockout", { attempts: boKills + blockedDirect, kills: boKills, errors: blockedDirect, blocked: blockedDirect });
        }
        const swings = own.filter((s) => def.ids.includes(aid(s)));
        push(def.key, {
            attempts: swings.length,
            kills: swings.filter((s) => aid(s) === def.killId || isKill(s, d)).length,
            errors: swings.filter((s) => aid(s) === def.errId).length,
            blocked: swings.filter((s) => s.detail === "Blocked").length,
        });
    }
    return out;
}

// ------------------------------------------------------------------------
// K. Colocadora → atacante
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
    errors: number;
}

export function setterConnections(
    stats: StatDoc[],
    d: DerivedCredits,
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
            errors: 0,
        };
        e.attempts++;
        if (isKill(s, d)) e.kills++;
        if (ATTACK_ERR_IDS.includes(aid(s))) e.errors++;
        map.set(key, e);
    }
    return [...map.values()];
}

// Estimador bayesiano simple (shrinkage hacia la base del grupo) para no
// sobrevalorar parejas colocadora/atacante con pocos intentos.
export function shrinkRate(count: number, attempts: number, base: number, k = 12): number {
    return attempts + k > 0 ? (count + k * base) / (attempts + k) : base;
}

// Eficiencia "encogida" de una conexión: shrinkage (k=12) sobre `kills − errores`
// hacia la eficiencia del equipo (`base`).
export const connectionEfficiency = (c: SetterConnection, base: number): number =>
    shrinkRate(c.kills - c.errors, c.attempts, base, 12);

// ------------------------------------------------------------------------
// L. Corredores del rival y claves del partido
// ------------------------------------------------------------------------
export interface Corridor {
    key: string; // "<zona origen> → <zona destino>"
    count: number;
    kills: number;
    errors: number;
}

// Ataques del rival con dirección, agrupados por corredor (zona origen →
// zona destino final). Kills = ids 9/10/11 y errores = 16/17 del PROPIO
// ataque rival; eficiencia = `attackEfficiency(corridor)`.
export function rivalCorridors(game: StatDoc[]): Corridor[] {
    const map = new Map<string, Corridor>();
    for (const s of game) {
        if (!isRival(s) || !ATTACK_IDS.includes(aid(s)) || !String(s.direction ?? "").includes("#")) continue;
        const parts = String(s.direction).split("#");
        const from = parts[0]?.[0];
        const to = parts[parts.length - 1]?.[0];
        if (!from || !to || !/\d/.test(from) || !/\d/.test(to)) continue;
        const key = `${from} → ${to}`;
        const c = map.get(key) ?? { key, count: 0, kills: 0, errors: 0 };
        c.count++;
        if (KILL_IDS.includes(aid(s))) c.kills++;
        if (ATTACK_ERR_IDS.includes(aid(s))) c.errors++;
        map.set(key, c);
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
}

// Ataques directos del rival con blockout (id 11 en fila rival).
export const rivalBlockouts = (game: StatDoc[]): number => game.filter((s) => isRival(s) && aid(s) === "11").length;

// Corredores/direcciones de un golpe con eficiencia propia: agrupa por el
// par de tokens "origen#destino" tal cual lo dibuja el mapa de pista. Kills
// con `isKill` (derivados incluidos) para el lado propio; para el rival,
// el id 9/10/11 de su fila.
export function directionEfficiency(rows: StatDoc[], d: DerivedCredits): AttackTotals {
    const t = newAttackTotals();
    for (const s of rows) addAttack(t, s, d);
    return t;
}
