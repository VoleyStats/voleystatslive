import { computed, markRaw, onUnmounted, reactive, ref, shallowRef, watchEffect } from "vue";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    getDocsFromCache,
    onSnapshot,
    orderBy,
    query,
    type Query,
    type Unsubscribe,
} from "firebase/firestore";
import { useDocument } from "vuefire";
import { db } from "../firebase";
import { isMatchCacheable, isMatchFinished, type StatDoc } from "../utils/volleyStats";

// Capa de datos de estadísticas agregadas de un equipo (multipartido),
// leída desde `teams/{id}` (índice de partidos) + `live_matches/{code}`
// (doc + subcolección `stats`) de cada uno. Solo lectura de Firestore.
//
// Carga en DOS fases, para que la pestaña "Partidos" (que solo necesita el
// doc de cada partido, no sus stats) pueda pintarse casi al instante aunque
// el equipo tenga cientos de partidos compartidos:
//   1. Fase "docs": `getDoc` (one-shot) de cada `live_matches/{code}` del
//      índice, respetando la temporada seleccionada. El partido realmente en
//      directo (si lo hay) se detecta tras su primer `getDoc` y se pasa a
//      `onSnapshot` para que el badge "EN VIVO" se siga actualizando solo.
//   2. Fase "stats" (perezosa, bajo demanda vía `ensureStatsLoaded()`): solo
//      arranca cuando el consumidor la pide (p.ej. al abrir la pestaña
//      "Estadísticas"). Cada partido pide su subcolección `stats`
//      (`getDocs` one-shot, o `onSnapshot` si es el partido en directo),
//      empezando por el más reciente. Si el usuario nunca abre esa pestaña,
//      no se descarga ni una stat.
// Ambas fases respetan la temporada seleccionada y usan la misma
// concurrencia/commit progresivo (throttle) para no invalidar en cascada los
// agregados/gráficas derivados aguas abajo.
//
// Criterio de "partido cacheable" (localStorage + qué se reintenta al
// recargar): `isMatchCacheable()` en volleyStats.ts — más tolerante que
// `isMatchFinished()` (ver comentario allí). El campo `finished` que expone
// cada `TeamMatchData` sigue siendo el estricto `isMatchFinished()`, sin
// cambios: solo `cacheable` (uso interno de esta capa) usa la tolerancia.
//
// Tolerancia a temporada: `teams/{id}` puede llevar `current_season` (id) y
// `seasons` (mapa id -> nombre); cada entrada de `matches[]` puede llevar
// `season` (id). Hoy ningún doc trae estos campos — sin ellos, todo
// funciona igual que antes (sin selector, todos los partidos visibles).

// v2: añade `fingerprint` (sets_scoreboard/current_set) a la entrada
// cacheada. v3: adelgaza los stats cacheados a una proyección "slim" (ver
// `trimStat`) — el objeto `rotation` (~55% del peso de cada stat, con las 6
// posiciones de cancha como `Player.toJSON()` completos) y otros campos que
// la web nunca lee (`player_in`, `rotationTurns`, `date`, `order`) dejaban de
// caber en la cuota de 5 MB de localStorage a partir de ~5-7 partidos
// cacheados (fallo silencioso de `writeCache`, ver más abajo).
const CACHE_SCHEMA_VERSION = 3;
const CACHE_KEY_PREFIX = "vsl-team-match-v";
const CONCURRENCY = 4;

function cacheKey(code: string): string {
    return `${CACHE_KEY_PREFIX}${CACHE_SCHEMA_VERSION}:${code}`;
}

// Borra las entradas de localStorage de versiones de esquema ANTERIORES (las
// del formato "gordo" pre-slim, o de una futura migración): libera cuota en
// vez de dejarlas muertas ocupando espacio para siempre. Se ejecuta una vez
// por carga del módulo (side effect a nivel de módulo, ver abajo).
function pruneOldCacheVersions(): void {
    try {
        const currentPrefix = cacheKey("");
        const stale: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(CACHE_KEY_PREFIX) && !key.startsWith(currentPrefix)) stale.push(key);
        }
        for (const key of stale) localStorage.removeItem(key);
    } catch {
        // localStorage no disponible: nada que limpiar.
    }
}
pruneOldCacheVersions();

interface CachedMatch {
    match: StatDoc;
    stats: StatDoc[];
    fingerprint: string;
}

// Huella del marcador: si `sets_scoreboard`/`current_set` cambian (p.ej. el
// usuario corrige el partido y re-sincroniza desde el móvil), la huella deja
// de coincidir y la entrada cacheada se invalida aunque el doc siguiera
// siendo "cacheable".
function scoreboardFingerprint(match: StatDoc): string {
    const board: StatDoc[] = Array.isArray(match?.sets_scoreboard) ? match.sets_scoreboard : [];
    const parts = board.map((s: StatDoc) => `${s?.number}:${s?.score_us ?? ""}-${s?.score_them ?? ""}`).join(",");
    return `${match?.current_set ?? ""}|${parts}`;
}

function readCache(code: string): CachedMatch | null {
    try {
        const raw = localStorage.getItem(cacheKey(code));
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.stats)) return null;
        return { match: parsed.match, stats: parsed.stats, fingerprint: String(parsed.fingerprint ?? "") };
    } catch {
        return null; // localStorage no disponible (Safari privado, cuota...): se ignora.
    }
}

function writeCache(code: string, data: CachedMatch): void {
    try {
        localStorage.setItem(cacheKey(code), JSON.stringify(data));
    } catch {
        // Cuota de localStorage excedida u otro fallo: no es crítico, se sigue
        // sin caché para ese partido.
    }
}

// Solo se conservan los campos que consume esta capa (marcador de sets,
// metadatos del partido) — evita inflar la caché con campos que la web no usa.
function trimMatch(match: StatDoc): StatDoc {
    return {
        opponent: match.opponent,
        team: match.team,
        league: match.league ?? null,
        tournament: match.tournament ?? null,
        n_sets: match.n_sets,
        sets_us: match.sets_us,
        sets_them: match.sets_them,
        current_set: match.current_set,
        set_closed: match.set_closed ?? false,
        sets_scoreboard: match.sets_scoreboard ?? [],
        live: match.live,
        date: match.date ?? null,
    };
}

// Proyección slim de un doc de stat para la caché localStorage: SOLO los
// campos que consume esta capa (verificado con grep sobre volleyStats.ts,
// teamTables.ts y los componentes de team stats — Rotations360Section,
// PlayerDetailSection, DirectionsSection, SkillTablesSection). Se descartan,
// entre otros: `rotation` (objeto pesado de `Rotation.toJSON()` con las 6
// posiciones de cancha, cada una un `Player.toJSON()` completo — nunca leído
// por la web), `player_in`, `rotationTurns`, `date` (del stat, no del
// partido) y `order` (el array ya llega ordenado por la query `orderBy`,
// ningún consumidor relee ese campo tras la carga). `action.name` tampoco se
// incluye: solo se usa como fallback de texto en GeneralStats.vue, que no
// pasa por esta caché (hace su propio `onSnapshot`/one-shot directo).
function trimStat(s: StatDoc): StatDoc {
    return {
        to: s?.to,
        score_us: s?.score_us,
        score_them: s?.score_them,
        stage: s?.stage,
        set: { number: s?.set?.number },
        action: { id: s?.action?.id, area: s?.action?.area, type: s?.action?.type },
        player: s?.player ? { id: s.player.id, name: s.player.name } : s?.player ?? null,
        server: s?.server ? { id: s.server.id, name: s.server.name } : s?.server ?? null,
        setter: s?.setter ? { id: s.setter.id, name: s.setter.name } : s?.setter ?? null,
        detail: s?.detail,
        direction: s?.direction,
        rotationCount: s?.rotationCount,
    };
}

async function mapWithConcurrency<T, R>(
    items: T[],
    limit: number,
    fn: (item: T) => Promise<R>,
    onProgress?: (done: number) => void
): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let next = 0;
    let done = 0;
    async function worker(): Promise<void> {
        for (;;) {
            const i = next++;
            if (i >= items.length) return;
            results[i] = await fn(items[i]);
            done++;
            onProgress?.(done);
        }
    }
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
    return results;
}

export interface TeamMatchIndexEntry {
    code: string;
    opponent: string;
    date: number;
    season?: string;
}

export interface TeamMatchData {
    code: string;
    opponent: string;
    date: number;
    season: string | null;
    finished: boolean; // criterio estricto (isMatchFinished) — sin cambios de comportamiento.
    cacheable: boolean; // criterio tolerante (isMatchCacheable) — uso interno de esta capa.
    found: boolean;
    match: StatDoc | null;
    stats: StatDoc[];
    statsLoaded: boolean; // fase "stats" resuelta para este partido (aunque sea con 0 stats).
    live: boolean; // partido realmente en directo (con onSnapshot activo).
}

// `markRaw` sobre el doc de partido y cada doc de stat: son árboles de datos
// grandes (cientos/miles de stats por equipo) que solo se leen para derivar
// agregados con `Map`/`Set` de identidad de objeto (`deriveCredits`, tablas
// por destreza…) — no necesitan (ni deben) pasar por el proxy reactivo de
// Vue. Evita el coste de proxificación profunda y garantiza que la identidad
// de objeto se conserva intacta desde la carga hasta el consumo.
function rawStats(stats: StatDoc[]): StatDoc[] {
    return stats.map((s) => markRaw(s));
}

// Cuánto se espacian, como mínimo, los commits del agregado `matches`
// durante una carga progresiva (varios partidos resolviéndose en paralelo).
// Con `CONCURRENCY` partidos en vuelo, sin este throttle cada partido que
// llega dispara su propio commit -> invalida todos los computeds derivados
// (KPIs, radar, rotaciones, tablas…) y todas las gráficas ApexCharts se
// vuelven a montar/recalcular una vez por partido (O(n²) para n partidos).
const COMMIT_THROTTLE_MS = 300;

export function useTeamStats(teamId: string) {
    const team = useDocument(doc(db, "teams", teamId));

    // Map plano (NO reactive()): se mutan sus objetos en el sitio (docs y
    // stats se rellenan progresivamente sobre la MISMA instancia por código,
    // nunca se reemplaza) y solo se lee/escribe desde los efectos de carga de
    // abajo. Si fuera `reactive()`, cada `.get()` durante el cálculo de
    // `pending` trackearía esa entrada como dependencia, y el `.set()`
    // posterior (tras el `await`) volvería a disparar el mismo watchEffect en
    // bucle por cada partido resuelto — puro trabajo desperdiciado y una
    // fuente más de proxificación profunda de los stats. La única fuente de
    // reactividad hacia el resto de la app es el `shallowRef` `matches`, que
    // se reemplaza en bloque (nunca se muta) vía `commitMatches()`.
    const matchesByCode = new Map<string, TeamMatchData>();
    const matches = shallowRef<TeamMatchData[]>([]);

    function commitMatches(): void {
        matches.value = [...matchesByCode.values()].sort((a, b) => b.date - a.date);
    }

    function ensureEntry(entry: TeamMatchIndexEntry): TeamMatchData {
        let data = matchesByCode.get(entry.code);
        if (!data) {
            data = {
                code: entry.code,
                opponent: entry.opponent,
                date: entry.date,
                season: entry.season ?? null,
                finished: false,
                cacheable: false,
                found: false,
                match: null,
                stats: [],
                statsLoaded: false,
                live: false,
            };
            matchesByCode.set(entry.code, data);
        }
        return data;
    }

    const progress = reactive({ loading: false, done: 0, total: 0 }); // fase "docs" (pestaña Partidos)
    const statsProgress = reactive({ loading: false, done: 0, total: 0 }); // fase "stats" (pestaña Estadísticas)

    // --- temporada ---------------------------------------------------
    const seasonsMap = computed<Record<string, string> | null>(() => team.value?.seasons ?? null);
    const currentSeasonId = computed<string | null>(() => team.value?.current_season ?? null);
    const hasSeasons = computed(() => !!currentSeasonId.value);
    const seasonIds = computed<string[]>(() => (seasonsMap.value ? Object.keys(seasonsMap.value) : []));

    const selectedSeason = ref<string>("all");
    let seasonInitialized = false;
    watchEffect(() => {
        if (!seasonInitialized && currentSeasonId.value) {
            selectedSeason.value = currentSeasonId.value;
            seasonInitialized = true;
        }
    });

    // Calculado sobre el índice CRUDO (no sobre `matches`, que solo contiene
    // lo ya cargado): así el botón "Sin temporada" aparece aunque esos
    // partidos aún no se hayan pedido a Firestore (ver `requestedIndex`).
    const hasUnseasonedMatches = computed(() => ((team.value?.matches ?? []) as StatDoc[]).some((e) => !e?.season));

    // Subconjunto del índice que hace falta pedir a Firestore para la
    // temporada seleccionada. Si se elige una temporada concreta, los
    // partidos de OTRAS temporadas ni siquiera se piden (docs ni stats) —
    // esto es lo que evita "cada carga de la página de equipo baja las stats
    // de TODOS los partidos". Cambiar de temporada solo añade lo que falte;
    // lo ya cargado se conserva en `matchesByCode` (no se purga).
    const requestedIndex = computed<StatDoc[]>(() => {
        const idx = (team.value?.matches ?? []) as StatDoc[];
        if (!hasSeasons.value || selectedSeason.value === "all") return idx;
        if (selectedSeason.value === "__none__") return idx.filter((e) => !e?.season);
        return idx.filter((e) => String(e?.season ?? "") === selectedSeason.value);
    });

    const filteredMatches = computed(() => {
        if (!hasSeasons.value || selectedSeason.value === "all") return matches.value;
        if (selectedSeason.value === "__none__") return matches.value.filter((m) => !m.season);
        return matches.value.filter((m) => m.season === selectedSeason.value);
    });

    // --- fase 1: docs ----------------------------------------------------
    const docLiveUnsubs = new Map<string, Unsubscribe>();
    const docsInFlight = new Set<string>();

    function applyMatchDoc(entry: TeamMatchData, rawMatch: StatDoc | null): void {
        if (!rawMatch) {
            entry.found = false;
            entry.match = null;
            entry.finished = false;
            entry.cacheable = false;
            entry.live = false;
            return;
        }
        entry.found = true;
        entry.opponent = entry.opponent || rawMatch.opponent || "";
        entry.match = markRaw(trimMatch(rawMatch));
        entry.finished = isMatchFinished(rawMatch);
        entry.cacheable = isMatchCacheable(rawMatch, Date.now(), entry.date);
        entry.live = rawMatch.live === true && !entry.cacheable;
    }

    watchEffect(async () => {
        const idx = requestedIndex.value;
        if (!idx.length) return;

        const pending = idx.filter((raw) => {
            const code = String(raw?.code ?? "");
            if (!code || docsInFlight.has(code)) return false;
            const existing = matchesByCode.get(code);
            if (!existing) return true;
            if (docLiveUnsubs.has(code)) return false; // ya se mantiene fresco con onSnapshot.
            return !existing.cacheable; // no estable todavía -> reintentar.
        });
        if (!pending.length) return;

        pending.sort((a, b) => Number(b?.date ?? 0) - Number(a?.date ?? 0)); // más nuevo primero.

        progress.loading = true;
        progress.total = idx.length;
        progress.done = idx.length - pending.length;
        for (const raw of pending) docsInFlight.add(String(raw?.code ?? ""));

        let lastCommit = 0;
        await mapWithConcurrency(
            pending,
            CONCURRENCY,
            async (raw) => {
                const code = String(raw?.code ?? "");
                const entry = ensureEntry({
                    code,
                    opponent: String(raw?.opponent ?? ""),
                    date: Number(raw?.date ?? 0),
                    season: raw?.season != null ? String(raw.season) : undefined,
                });

                const snap = await getDoc(doc(db, "live_matches", code));
                const rawMatch = snap.exists() ? (snap.data() as StatDoc) : null;
                applyMatchDoc(entry, rawMatch);
                docsInFlight.delete(code);

                // Partido realmente en directo (no solo "live:true" heredado
                // de un doc antiguo/obsoleto, ver isMatchCacheable): se pasa
                // a onSnapshot para que el badge "EN VIVO" y el marcador se
                // actualicen solos mientras dure el partido.
                if (rawMatch && entry.live && !docLiveUnsubs.has(code)) {
                    const unsub = onSnapshot(doc(db, "live_matches", code), (liveSnap) => {
                        const liveEntry = matchesByCode.get(code);
                        if (!liveEntry) return;
                        applyMatchDoc(liveEntry, liveSnap.exists() ? (liveSnap.data() as StatDoc) : null);
                        commitMatches();
                    });
                    docLiveUnsubs.set(code, unsub);
                }
            },
            (done) => {
                progress.done = idx.length - pending.length + done;
                const now = Date.now();
                if (now - lastCommit >= COMMIT_THROTTLE_MS) {
                    lastCommit = now;
                    commitMatches();
                }
            }
        );

        commitMatches(); // commit final: asegura que el último lote se ve.
        progress.loading = false;
    });

    // --- fase 2: stats (perezosa) -----------------------------------------
    const statsLiveUnsubs = new Map<string, Unsubscribe>();
    const statsInFlight = new Set<string>();
    const statsRequested = ref(false);

    function ensureStatsLoaded(): void {
        statsRequested.value = true;
    }

    interface CacheProbeResult {
        applied: boolean;
        // Había una entrada en localStorage para este partido pero con una
        // huella distinta (el marcador cambió: re-sincronización/corrección
        // desde el móvil) — señal de que la caché offline de Firestore
        // (IndexedDB) también podría estar desactualizada, ver
        // `fetchStatsCacheFirst`.
        knownStale: boolean;
    }

    // Intenta resolver un partido desde la caché localStorage (síncrono, sin
    // red) comparando la huella del marcador.
    function tryApplyCache(entry: TeamMatchData): CacheProbeResult {
        if (!entry.cacheable || !entry.match) return { applied: false, knownStale: false };
        const fp = scoreboardFingerprint(entry.match);
        const cached = readCache(entry.code);
        if (!cached) return { applied: false, knownStale: false };
        if (cached.fingerprint !== fp) return { applied: false, knownStale: true };
        entry.stats = rawStats(cached.stats);
        entry.statsLoaded = true;
        return { applied: true, knownStale: false };
    }

    // Fase "stats" cache-first para partidos cacheables: intenta resolver la
    // subcolección desde la caché local de Firestore (IndexedDB,
    // `getDocsFromCache` — sin red) antes de pedirla al servidor. Si la
    // consulta lanza (sin caché local para ella) o viene vacía, cae a
    // `getDocs` normal (server-first). No se usa si ya sabemos que la huella
    // cambió (`knownStale`): en ese caso la caché local podría reflejar el
    // estado ANTERIOR a la corrección, así que se va directo a servidor.
    async function fetchStatsCacheFirst(code: string): Promise<StatDoc[]> {
        const q: Query = query(collection(db, "live_matches", code, "stats"), orderBy("order"));
        try {
            const cacheSnap = await getDocsFromCache(q);
            if (!cacheSnap.empty) return rawStats(cacheSnap.docs.map((d) => d.data()));
        } catch {
            // Sin caché local (IndexedDB) para esta consulta todavía: cae a servidor.
        }
        const serverSnap = await getDocs(q);
        return rawStats(serverSnap.docs.map((d) => d.data()));
    }

    watchEffect(async () => {
        if (!statsRequested.value) return;

        // Dependencia reactiva: reruns cuando cambia la temporada
        // seleccionada o cuando la fase "docs" resuelve más partidos.
        const scope = filteredMatches.value;
        const candidates = scope.filter(
            (m) => m.found && !m.statsLoaded && !statsInFlight.has(m.code) && !statsLiveUnsubs.has(m.code)
        );
        if (!candidates.length) return;

        const stillPending: TeamMatchData[] = [];
        const staleFingerprint = new Set<string>();
        let cacheHits = 0;
        for (const m of candidates) {
            const probe = tryApplyCache(m);
            if (probe.applied) {
                cacheHits++;
            } else {
                stillPending.push(m);
                if (probe.knownStale) staleFingerprint.add(m.code);
            }
        }
        if (cacheHits) commitMatches(); // que se vean ya los resueltos por caché, sin esperar red.
        if (!stillPending.length) return;

        stillPending.sort((a, b) => b.date - a.date); // más nuevo -> más antiguo.

        const totalFound = scope.filter((m) => m.found).length;
        statsProgress.loading = true;
        statsProgress.total = totalFound;
        statsProgress.done = totalFound - stillPending.length;
        for (const m of stillPending) statsInFlight.add(m.code);

        let lastCommit = 0;
        await mapWithConcurrency(
            stillPending,
            CONCURRENCY,
            async (m) => {
                // Cache-first (IndexedDB local, sin red) solo para partidos
                // cacheables cuya huella NO se sabe cambiada respecto a lo
                // conocido (localStorage) — si cambió, o si el partido no es
                // cacheable (en directo/incierto), va directo a servidor.
                const stats =
                    m.cacheable && !staleFingerprint.has(m.code)
                        ? await fetchStatsCacheFirst(m.code)
                        : rawStats(
                              (
                                  await getDocs(query(collection(db, "live_matches", m.code, "stats"), orderBy("order")))
                              ).docs.map((d) => d.data())
                          );
                m.stats = stats;
                m.statsLoaded = true;
                statsInFlight.delete(m.code);

                if (m.cacheable && m.match) {
                    writeCache(m.code, {
                        match: m.match,
                        stats: stats.map(trimStat),
                        fingerprint: scoreboardFingerprint(m.match),
                    });
                } else if (m.live && !statsLiveUnsubs.has(m.code)) {
                    // Partido realmente en directo: mantener sus stats al día.
                    const unsub = onSnapshot(
                        query(collection(db, "live_matches", m.code, "stats"), orderBy("order")),
                        (q) => {
                            m.stats = rawStats(q.docs.map((d) => d.data()));
                            commitMatches();
                        }
                    );
                    statsLiveUnsubs.set(m.code, unsub);
                }
            },
            (done) => {
                statsProgress.done = totalFound - stillPending.length + done;
                const now = Date.now();
                if (now - lastCommit >= COMMIT_THROTTLE_MS) {
                    lastCommit = now;
                    commitMatches();
                }
            }
        );

        commitMatches();
        statsProgress.loading = false;
    });

    onUnmounted(() => {
        for (const unsub of docLiveUnsubs.values()) unsub();
        docLiveUnsubs.clear();
        for (const unsub of statsLiveUnsubs.values()) unsub();
        statsLiveUnsubs.clear();
    });

    return {
        team,
        matches,
        filteredMatches,
        progress,
        statsProgress,
        ensureStatsLoaded,
        hasSeasons,
        seasonsMap,
        seasonIds,
        currentSeasonId,
        selectedSeason,
        hasUnseasonedMatches,
    };
}
