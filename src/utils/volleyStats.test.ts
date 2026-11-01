// Tests del motor único de estadísticas (ver ../../../VoleyStatsApp/METRICS.md).
// Casos difíciles: derivados (ace/kill) por secuencia, falta de pie 32,
// bloqueados, 47, free, filas del rival, errores por fundamento, valoraciones.
import { describe, expect, it } from "vitest";
import {
    areaTotals,
    attackByReceptionGradeForMatch,
    attackByTechnique,
    attackChart,
    attackEfficiency,
    attackTotals,
    breakStats,
    connectionEfficiency,
    deriveCredits,
    efficiencyClass,
    efficiencyLabel,
    efficiencyPercent,
    isAce,
    isGameStat,
    isKill,
    mergeCredits,
    overlaySetsWon,
    ownErrors,
    ownServes,
    pointsOrigin,
    sortChronological,
    radarAxes,
    ratings,
    rotationBreakdown,
    serveChart,
    serveLine,
    serveMark,
    setterConnections,
    sideOutStats,
    unforcedShare,
    wonServingByServer,
    type StatDoc,
} from "./volleyStats";
import { attackSkillTable, serveSkillTable } from "./teamTables";

// --- fábrica de filas --------------------------------------------------------
const ME = { id: "p1", name: "Ana" };
const ME2 = { id: "p2", name: "Bea" };
const RIVAL = { id: "0", name: "" };
let seq = 0;
interface Opts {
    player?: { id: string; name: string };
    server?: { id: string; name: string };
    to?: number;
    stage?: number;
    detail?: string;
    set?: number;
    setter?: { id: string; name: string } | null;
    rot?: number;
    direction?: string;
    order?: number;
}
function st(id: string, o: Opts = {}): StatDoc {
    seq += 1;
    return {
        order: o.order ?? seq,
        to: o.to ?? 0,
        stage: o.stage ?? 2,
        player: o.player ?? ME,
        server: o.server ?? ME,
        set: { id: `s${o.set ?? 1}`, number: o.set ?? 1 },
        action: { id },
        detail: o.detail ?? "",
        setter: o.setter ?? null,
        rotationCount: o.rot ?? 1,
        direction: o.direction ?? "",
        score_us: 0,
        score_them: 0,
    };
}
// Fila del rival en fase K1 (él saca).
const rv = (id: string, o: Opts = {}) => st(id, { player: RIVAL, server: RIVAL, stage: 1, ...o });
const game = (rows: StatDoc[]) => rows.filter(isGameStat);

describe("derivados (ace / kill) por secuencia", () => {
    it("saque propio + error de recepción rival que cierra el punto = ace derivado, y sale de los grados", () => {
        const serve = st("41"); // fuerte, to 0
        const rivalErr = rv("22", { to: 1, server: ME });
        const rows = [serve, rivalErr];
        const d = deriveCredits(rows);
        expect(isAce(serve, d)).toBe(true);
        expect(d.creditedBy.get(rivalErr)).toBe(serve);
        const chart = serveChart(rows, d);
        expect(chart).toMatchObject({ total: 1, ace: 1, strong: 0 });
        // Nota: un único ace = 3 (no 2 del grado fuerte).
        expect(serveMark(rows, d).mark).toBe(3);
        const table = serveSkillTable(rows, rows, d);
        expect(table.rows[0].values).toMatchObject({ total: 1, aces: 1, g3: 0, errors: 0 });
        expect(table.total.mark).toBe("3.0");
    });

    it("ataque en juego (6) + error de defensa rival (23) = kill derivado; también con 47 y con ids de kill", () => {
        const a6 = st("6");
        const e1 = rv("23", { to: 1 });
        const a47 = st("47");
        const e2 = rv("22", { to: 1 });
        const rows = [a6, e1, a47, e2];
        const d = deriveCredits(rows);
        expect(isKill(a6, d)).toBe(true);
        expect(isKill(a47, d)).toBe(true);
        const t = attackTotals(rows, d);
        expect(t).toMatchObject({ attempts: 2, kills: 2, errors: 0 });
        expect(attackEfficiency(t)).toBe(1);
        // Origen: los dos puntos son ataque, ninguno "error del rival".
        const o = pointsOrigin(rows.filter((s) => s.to !== 0), d);
        expect(o.attack.us).toBe(2);
        expect(o.errors.us).toBe(0);
    });

    it("sin acción propia previa, el error del rival es de verdad un error del rival (no derivado)", () => {
        const rows = [rv("15", { to: 1 })];
        const d = deriveCredits(rows);
        expect(d.creditedBy.size).toBe(0);
        expect(pointsOrigin(rows, d).errors.us).toBe(1);
    });

    it("la falta de pie 32 cuenta como saque: puede ser fuente de ace derivado (ids de saque)", () => {
        const foot = st("32");
        const rows = [foot, rv("22", { to: 1, server: ME })];
        const d = deriveCredits(rows);
        expect(isAce(foot, d)).toBe(true);
    });

    it("un rally no cruza de set ni de acción administrativa", () => {
        const a = st("6", { set: 1 }); // set 1 sin cerrar
        const e = rv("23", { to: 1, set: 2 });
        const d = deriveCredits([a, e]);
        expect(d.kills.size).toBe(0);
        const timeout = st("0", { player: RIVAL });
        const d2 = deriveCredits([st("6"), timeout, rv("23", { to: 1 })]);
        expect(d2.kills.size).toBe(1); // el tiempo muerto no interrumpe ni contamina
    });

    it("mergeCredits combina partidos sin mezclar identidades", () => {
        const m1 = [st("6"), rv("23", { to: 1 })];
        const m2 = [st("8", { to: 0 }), rv("22", { to: 1, server: ME })];
        const merged = mergeCredits([deriveCredits(m1), deriveCredits(m2)]);
        expect(merged.kills.size).toBe(1);
        expect(merged.aces.size).toBe(1);
        expect(merged.creditedBy.size).toBe(2);
    });
});

describe("saque (D1): ids 8,15,32,39,40,41; por server; sin rival; sin K1", () => {
    const rows = [
        st("8", { to: 1 }), // ace explícito
        st("41"),
        st("40"),
        st("39"),
        st("15", { to: 2 }),
        st("32", { to: 2 }), // falta de pie
        st("41", { stage: 1 }), // K1: fuera
        rv("41"), // saque rival: fuera
        st("41", { server: ME2 }),
    ];
    const d = deriveCredits(rows);

    it("universo", () => {
        expect(ownServes(rows)).toHaveLength(7);
        expect(ownServes(rows, "p2")).toHaveLength(1);
    });
    it("errores 15 y 32; aces; % error", () => {
        expect(serveLine(rows, d)).toEqual({ total: 7, aces: 1, errors: 2 });
        expect(serveLine(rows, d, "p1").total).toBe(6);
    });
    it("nota: 39=0.5, 40=1, 41=2, ace=3, errores 0 en el denominador", () => {
        // p1: ace 3 + 41 2 + 40 1 + 39 0.5 + 15 0 + 32 0 = 6.5 / 6
        expect(serveMark(rows, d, "p1").mark).toBeCloseTo(6.5 / 6, 10);
    });
    it("tabla: columnas por jugadora y puntos ganados sin filas administrativas", () => {
        const raw = [...rows, st("98", { to: 1 }), st("13", { to: 1 })];
        const won = wonServingByServer(raw);
        expect(won.get("p1")).toBe(2); // el ace to=1 y el bloqueo to=1; el ajuste 98 no cuenta
        const t = serveSkillTable(game(rows), raw, d);
        const p1 = t.rows.find((r) => r.id === "p1")!;
        expect(p1.values).toMatchObject({ total: 6, aces: 1, g3: 1, g2: 1, g1: 1, errors: 2, wonServing: 2 });
        expect(t.total.values.total).toBe(7);
    });
    it("donut: errores por detalle Net/Out/otro (32 sin detalle va a otros)", () => {
        const r = [st("15", { to: 2, detail: "Net" }), st("15", { to: 2, detail: "Out" }), st("32", { to: 2 })];
        const c = serveChart(r, deriveCredits(r));
        expect(c).toMatchObject({ total: 3, errorNet: 1, errorOut: 1, errorOther: 1, errors: 3 });
    });
});

describe("ataque (D2/D3): solo eficiencia; bloqueado dentro de errores y restado una vez", () => {
    it("bloqueado: es un error con marca; eficiencia = (kills-errores)/ataques", () => {
        const rows = [st("9", { to: 1 }), st("16", { to: 2, detail: "Blocked" }), st("17", { to: 2 }), st("6")];
        const d = deriveCredits(rows);
        const t = attackTotals(rows, d);
        expect(t).toEqual({ attempts: 4, kills: 1, errors: 2, blocked: 1 });
        expect(attackEfficiency(t)).toBe((1 - 2) / 4);
        expect(efficiencyLabel(attackEfficiency(t))).toBe("-25%");
    });
    it("intentos = 6,47,9,10,11,16,17; fuera 18, 34 y free 12/14/19", () => {
        const rows = ["6", "47", "9", "10", "11", "16", "17", "18", "34", "12", "14", "19"].map((id) => st(id));
        expect(attackTotals(rows, deriveCredits(rows)).attempts).toBe(7);
    });
    it("un 16/17 del rival no es ataque propio", () => {
        const rows = [rv("16", { to: 1 }), st("9", { to: 1 })];
        expect(attackTotals(rows, deriveCredits(rows)).attempts).toBe(1);
    });
    it("porcentaje entero con signo, .5 negativo redondea alejándose de cero (Swift)", () => {
        expect(efficiencyPercent(-0.125)).toBe(-13);
        expect(efficiencyPercent(0.125)).toBe(13);
        expect(efficiencyLabel(-0.12)).toBe("-12%");
        expect(efficiencyLabel(0)).toBe("0%");
    });
    it("bandas: verde >=25%, ámbar >=10%, rojo debajo", () => {
        expect(efficiencyClass(0.25)).toBe("text-green-400");
        expect(efficiencyClass(0.249)).toBe("text-amber-400");
        expect(efficiencyClass(0.1)).toBe("text-amber-400");
        expect(efficiencyClass(0.099)).toBe("text-red-400");
        expect(efficiencyClass(-0.3)).toBe("text-red-400");
    });
    it("tabla de ataque: kills con derivados, columna de nota = eficiencia", () => {
        const rows = [st("6"), rv("23", { to: 1 }), st("9", { to: 1 }), st("16", { to: 2, detail: "Blocked" }), st("12"), st("34", { to: 2 })];
        const d = deriveCredits(rows);
        const t = attackSkillTable(rows, d);
        expect(t.rows[0].values).toEqual({ total: 4 - 1, kills: 2, errors: 1 });
        expect(t.rows[0].mark).toBe("33%");
        expect(t.total.mark).toBe("33%");
    });
    it("gráfica de ataque: errores 16/17 por detail; total == intentos", () => {
        const rows = [st("16", { detail: "Blocked", to: 2 }), st("16", { detail: "Out", to: 2 }), st("17", { detail: "Net", to: 2 }), st("17", { to: 2 }), st("9", { to: 1 })];
        const c = attackChart(rows, deriveCredits(rows));
        expect(c).toEqual({ total: 5, kills: 1, errorBlocked: 1, errorOut: 1, errorNet: 1, errorOther: 1, errors: 4 });
    });
    it("técnica: blockout = kills 11 + bloqueados directos; eficiencia (kills-errores)/intentos", () => {
        const rows = [st("11", { to: 1 }), st("11", { to: 1 }), st("16", { to: 2, detail: "Blocked" }), st("9", { to: 1 }), st("12", { to: 1 })];
        const b = attackByTechnique(rows, deriveCredits(rows));
        const bo = b.find((x) => x.key === "blockout")!;
        expect(bo).toMatchObject({ attempts: 3, kills: 2, errors: 1 });
        expect(bo.eff).toBeCloseTo(1 / 3, 10);
        expect(b.map((x) => x.key)).toEqual(["spike", "blockout", "downhit"]);
    });
    it("ataque por nota de recepción: derivados y errores; el puntero se reinicia al cerrar punto", () => {
        const rows = [st("4"), st("6"), rv("23", { to: 1 }), st("3"), st("16", { to: 2 }), st("6")];
        const d = deriveCredits(rows);
        const m = attackByReceptionGradeForMatch(rows, d);
        expect(m.get(3)).toMatchObject({ attempts: 1, kills: 1 });
        expect(m.get(2)).toMatchObject({ attempts: 1, errors: 1 });
        expect(m.size).toBe(2); // el último 6 queda sin recepción previa
    });
});

describe("errores (D4): ownErrors cuadra con el total y reparte por fundamento", () => {
    const rows = [
        st("16", { to: 2, detail: "Blocked" }), // bloqueado cuenta como error propio
        st("15", { to: 2 }),
        st("32", { to: 2 }),
        st("22", { to: 2 }),
        st("24", { to: 2 }),
        st("23", { to: 2 }),
        st("28", { to: 2 }), // red: falta
        st("48", { to: 2 }), // tarjeta: falta
        st("19", { to: 2 }), // free error: otros
        st("21", { to: 2 }), // de quién es: otros
        st("20", { to: 2 }),
        rv("9", { to: 2 }), // punto del rival por ataque suyo: no es error propio
        st("9", { to: 1 }),
    ];
    const e = ownErrors(rows);
    it("count = filas propias con to==2", () => expect(e.count).toBe(11));
    it("la suma de bySkill == count", () => expect(e.bySkill.reduce((a, b) => a + b.count, 0)).toBe(e.count));
    it("cajones fault/other y orden por cantidad desc y nombre", () => {
        expect(e.bySkill).toEqual([
            // El 21 ("de quién es") es error de defensa: dig = 23 + 21.
            { skill: "dig", count: 2 },
            { skill: "fault", count: 2 },
            { skill: "serve", count: 2 },
            { skill: "attack", count: 1 },
            { skill: "block", count: 1 },
            { skill: "other", count: 1 },
            { skill: "receive", count: 1 },
            { skill: "set", count: 1 },
        ]);
    });
    it("por jugadora", () => {
        expect(ownErrors([st("15", { to: 2 }), st("15", { to: 2, player: ME2, server: ME2 })], "p2").count).toBe(1);
    });
    it("no forzados = saque (15,32) + ataque NO bloqueado + colocación (24) + free (25)", () => {
        const r = [
            st("15", { to: 2 }),
            st("32", { to: 2 }),
            st("16", { to: 2 }),
            st("16", { to: 2, detail: "Blocked" }),
            st("24", { to: 2 }),
            st("25", { to: 2 }),
            st("22", { to: 2 }),
            st("28", { to: 2 }),
        ];
        const u = unforcedShare(r);
        expect(u).toMatchObject({ count: 5, total: 8 });
    });
    it("puntos por error del rival NO incluyen los derivados", () => {
        const r = [st("6"), rv("23", { to: 1 }), rv("22", { to: 1 }), rv("15", { to: 1 })];
        const d = deriveCredits(r);
        const o = pointsOrigin(r.filter((s) => s.to !== 0), d);
        // 23 derivado por el 6 -> ataque; 22 sin derivar -> ace; 15 -> error.
        expect(o.errors.us).toBe(1);
        expect(o.ace.us).toBe(1);
        expect(o.attack.us).toBe(1);
    });
    it("origen simétrico, lado nuestro (fila rival to=1 no derivada)", () => {
        const r = [
            rv("16", { to: 1, detail: "Blocked" }),
            rv("22", { to: 1 }),
            rv("23", { to: 1 }),
            rv("21", { to: 1 }),
            rv("25", { to: 1 }),
            rv("20", { to: 1 }),
            rv("17", { to: 1 }),
            rv("15", { to: 1 }),
        ];
        const o = pointsOrigin(r, deriveCredits(r));
        expect(o.block.us).toBe(1);
        expect(o.ace.us).toBe(1);
        expect(o.attack.us).toBe(4);
        expect(o.errors.us).toBe(2);
        expect(o.attack.us + o.block.us + o.ace.us + o.errors.us).toBe(r.length);
    });
    it("origen simétrico, lado rival (fila propia to=2)", () => {
        const r = [
            st("16", { to: 2, detail: "Blocked" }),
            st("22", { to: 2 }),
            st("23", { to: 2 }),
            st("21", { to: 2 }),
            st("25", { to: 2 }),
            st("20", { to: 2 }),
            st("17", { to: 2 }),
            st("15", { to: 2 }),
            st("24", { to: 2 }),
            st("28", { to: 2 }),
        ];
        const o = pointsOrigin(r, deriveCredits(r));
        expect(o.block.them).toBe(1);
        expect(o.ace.them).toBe(1);
        expect(o.attack.them).toBe(4);
        expect(o.errors.them).toBe(4);
        expect(o.attack.them + o.block.them + o.ace.them + o.errors.them).toBe(r.length);
    });
    it("conceded: bloqueado propio va a bloqueo del rival; fila rival 8/13/otro", () => {
        const r = [st("16", { to: 2, detail: "Blocked" }), st("15", { to: 2 }), rv("8", { to: 2 }), rv("13", { to: 2 }), rv("9", { to: 2 })];
        const o = pointsOrigin(r, deriveCredits(r));
        expect(o.block.them).toBe(2);
        expect(o.errors.them).toBe(1);
        expect(o.ace.them).toBe(1);
        expect(o.attack.them).toBe(1);
    });
});

describe("valoraciones / radar (D5)", () => {
    it("saque y recepción = nota/3·100; ataque = (eficiencia+1)/2·100; bloqueo; defensa", () => {
        const rows = [
            st("8", { to: 1 }), // ace 3
            st("40"), // medio 1  -> nota (3+1)/2 = 2 -> 66.67
            st("4"),
            st("2"), // recepción (3+1)/2 = 2 -> 66.67
            st("9", { to: 1 }),
            st("16", { to: 2 }),
            st("6"),
            st("9", { to: 1 }), // ataque: 2 kills, 1 error, 4 intentos -> eff .25 -> 62.5
            st("13", { to: 1 }),
            st("7"),
            st("7"),
            st("20", { to: 2 }), // bloqueo: (1+0.5*2)/4 = 50
            st("5"),
            st("23", { to: 2 }),
            st("21", { to: 2 }),
            st("25", { to: 2 }), // defensa: 1 sin error de 4 -> 25
        ];
        const d = deriveCredits(rows);
        const r = ratings(rows, d);
        expect(r.serve).toBeCloseTo(((3 + 1) / 2 / 3) * 100, 10);
        expect(r.receive).toBeCloseTo((2 / 3) * 100, 10);
        expect(r.attack).toBeCloseTo(62.5, 10);
        expect(r.block).toBeCloseTo(50, 10);
        expect(r.dig).toBeCloseTo(25, 10);
    });
    it("sin datos = null y radar 0; radar de 5 ejes redondeado", () => {
        const d = deriveCredits([]);
        expect(ratings([], d)).toEqual({ serve: null, receive: null, attack: null, block: null, dig: null, set: null });
        expect(radarAxes([], d)).toEqual({ attack: 0, serve: 0, block: 0, dig: 0, receive: 0 });
        const rows = [st("9", { to: 1 })];
        expect(Object.keys(radarAxes(rows, deriveCredits(rows))).sort()).toEqual(["attack", "block", "dig", "receive", "serve"]);
        expect(radarAxes(rows, deriveCredits(rows)).attack).toBe(100);
    });
    it("por jugadora: saque por server, resto por player", () => {
        const rows = [st("8", { to: 1, server: ME2, player: ME }), st("9", { to: 1, player: ME2 })];
        const d = deriveCredits(rows);
        expect(ratings(rows, d, "p2").serve).toBe(100);
        expect(ratings(rows, d, "p1").serve).toBeNull();
        expect(ratings(rows, d, "p1").attack).toBeNull();
        expect(ratings(rows, d, "p2").attack).toBe(100);
    });
    it("donuts por fundamento: errores de ownErrors, totales de las mismas líneas", () => {
        const rows = [st("8", { to: 1 }), st("15", { to: 2 }), st("32", { to: 2 }), st("9", { to: 1 }), st("16", { to: 2 }), st("4"), st("22", { to: 2 })];
        const a = areaTotals(rows, deriveCredits(rows));
        const by = (n: number) => a.find((x) => x.area === n)!;
        expect(by(4)).toMatchObject({ total: 3, won: 1, errors: 2 });
        expect(by(5)).toMatchObject({ total: 2, won: 1, errors: 1 });
        expect(by(0)).toMatchObject({ total: 2, errors: 1 });
    });
});

describe("side-out / break por server; rotaciones", () => {
    const rows = [
        rv("9", { to: 1, rot: 1 }), // el rival sacaba, ganamos: side-out
        rv("9", { to: 2, rot: 1 }),
        st("9", { to: 1, rot: 2, stage: 2 }), // sacamos, ganamos: break
        st("16", { to: 2, rot: 2, stage: 3 }), // sacamos (server propio) aunque stage 3: break perdido
    ];
    it("por server, no por stage", () => {
        expect(sideOutStats(rows)).toEqual({ total: 2, won: 1 });
        expect(breakStats(rows)).toEqual({ total: 2, won: 1 });
    });
    it("rotaciones: side-out/break por server y eficiencia con errores 16/17", () => {
        const d = deriveCredits(rows);
        const r = rotationBreakdown(rows, d);
        expect(r).toHaveLength(2);
        expect(r[1]).toMatchObject({ n: 2, brTotal: 2, brWon: 1, atkTotal: 2, atkKills: 1, atkErrors: 1, ourErrors: 1 });
    });
});

describe("conexiones colocadora → atacante (shrinkage k=12 sobre kills−errores)", () => {
    it("usa kills − errores y la eficiencia del equipo como base", () => {
        const setter = { id: "p9", name: "Cris" };
        const rows: StatDoc[] = [st("1", { player: setter })]; // para ser "activa"
        for (let i = 0; i < 6; i++) rows.push(st(i < 3 ? "9" : i < 5 ? "16" : "6", { to: i < 3 ? 1 : i < 5 ? 2 : 0, setter, player: ME }));
        const d = deriveCredits(rows);
        const [c] = setterConnections(rows, d, new Set(["p9", "p1"]));
        expect(c).toMatchObject({ attempts: 6, kills: 3, errors: 2 });
        const base = 0.1;
        expect(connectionEfficiency(c, base)).toBeCloseTo((1 + 12 * base) / (6 + 12), 10);
    });
});

describe("sortChronological: order se reinicia por set", () => {
    it("desintercala los sets y conserva el orden dentro de cada set", () => {
        const a = st("6", { order: 0, set: 1 });
        const b = st("6", { order: 0, set: 2 });
        const c = st("13", { order: 1, set: 1, to: 1 });
        const d = st("13", { order: 1, set: 2, to: 1 });
        expect(sortChronological([a, b, c, d])).toEqual([a, c, b, d]);
    });
    it("deriveCredits no pierde el derivado con dos sets intercalados", () => {
        const swing = st("6", { order: 0, set: 1 });
        const other = st("9", { order: 0, set: 2, to: 1 });
        const err = rv("23", { order: 1, set: 1, to: 1 });
        const mixed = [swing, other, err]; // orden de Firestore: por order
        expect(deriveCredits(mixed).kills.size).toBe(0);
        expect(deriveCredits(sortChronological(mixed)).kills.has(swing)).toBe(true);
    });
});

describe("pointsOrigin: pares complementarios de la captura en rejilla", () => {
    const origin = (rows: StatDoc[]) => {
        const sorted = sortChronological(rows);
        return pointsOrigin(sorted.filter((s) => s.to !== 0), deriveCredits(sorted));
    };
    const total = (o: ReturnType<typeof pointsOrigin>, side: "us" | "them") =>
        o.attack[side] + o.block[side] + o.ace[side] + o.errors[side];

    it("(a) ace propio 8 to=1 + 22 rival to=0: un solo ace nuestro", () => {
        const o = origin([st("8", { to: 1, order: 1 }), rv("22", { to: 0, order: 2 })]);
        expect(o.ace.us).toBe(1);
        expect(o.attack.us + o.block.us + o.errors.us).toBe(0);
        expect(total(o, "us")).toBe(1);
        expect(total(o, "them")).toBe(0);
    });
    it("(b) 22 propio to=2 + 8 rival to=0: un solo ace del rival, sin error nuestro", () => {
        const o = origin([st("22", { to: 2, order: 1 }), rv("8", { to: 0, order: 2 })]);
        expect(o.ace.them).toBe(1);
        expect(o.errors.them).toBe(0);
        expect(total(o, "them")).toBe(1);
        expect(total(o, "us")).toBe(0);
    });
    it("(c) K2: 8 propio to=0 + 22 rival to=1 (order +0.5): ace nuestro, sin error del rival", () => {
        const o = origin([st("8", { to: 0, order: 4 }), rv("22", { to: 1, order: 4.5 })]);
        expect(o.ace.us).toBe(1);
        expect(o.errors.us).toBe(0);
        expect(total(o, "us")).toBe(1);
    });
    it("(d) Rally Map: 8 propio to=0 + 22 rival to=1: ace nuestro", () => {
        const o = origin([st("8", { to: 0, order: 1 }), rv("22", { to: 1, order: 2 })]);
        expect(o.ace.us).toBe(1);
        expect(o.errors.us).toBe(0);
        expect(total(o, "us")).toBe(1);
    });
});

describe("overlaySetsWon", () => {
    const sb = [
        { number: 1, score_us: 25, score_them: 20 },
        { number: 2, score_us: 22, score_them: 25 },
        { number: 3, score_us: 25, score_them: 18 },
    ];
    it("partido terminado (current_set = último+1): no suma nada", () => {
        expect(overlaySetsWon({ sets_us: 2, sets_them: 1, current_set: 4, sets_scoreboard: sb }, true)).toEqual({ us: 2, them: 1 });
    });
    it("fin de set en juego: suma el set recién cerrado", () => {
        expect(overlaySetsWon({ sets_us: 1, sets_them: 1, current_set: 3, sets_scoreboard: sb }, true)).toEqual({ us: 2, them: 1 });
    });
    it("set en juego: solo sets_*", () => {
        expect(overlaySetsWon({ sets_us: 1, sets_them: 1, current_set: 3, sets_scoreboard: sb }, false)).toEqual({ us: 1, them: 1 });
    });
    it("sin datos", () => {
        expect(overlaySetsWon({}, true)).toEqual({ us: 0, them: 0 });
    });
});
