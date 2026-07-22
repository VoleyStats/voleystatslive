import { computed, reactive, ref, watchEffect } from "vue";
import { collection, doc, getDoc, getDocs, orderBy, query } from "firebase/firestore";
import { useDocument } from "vuefire";
import { db } from "../firebase";
import { isMatchFinished, type StatDoc } from "../utils/volleyStats";

// Capa de datos de estadísticas agregadas de un equipo (multipartido),
// leída desde `teams/{id}` (índice de partidos) + `live_matches/{code}`
// (doc + subcolección `stats`) de cada uno. Solo lectura de Firestore.
//
// Criterio de "partido cacheable" (inmutable): `isMatchFinished()` en
// volleyStats.ts — la app publica `live=false` al desactivar el directo o al
// cerrar el set decisivo. Los partidos en vivo nunca se cachean en
// localStorage y se vuelven a comprobar cada vez que cambia el doc del
// equipo (nuevo partido añadido, etc.).
//
// Tolerancia a temporada: `teams/{id}` puede llevar `current_season` (id) y
// `seasons` (mapa id -> nombre); cada entrada de `matches[]` puede llevar
// `season` (id). Hoy ningún doc trae estos campos — sin ellos, todo
// funciona igual que antes (sin selector, todos los partidos visibles).

const CACHE_SCHEMA_VERSION = 1;
const CONCURRENCY = 4;

function cacheKey(code: string): string {
    return `vsl-team-match-v${CACHE_SCHEMA_VERSION}:${code}`;
}

interface CachedMatch {
    match: StatDoc;
    stats: StatDoc[];
}

function readCache(code: string): CachedMatch | null {
    try {
        const raw = localStorage.getItem(cacheKey(code));
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.stats)) return null;
        return { match: parsed.match, stats: parsed.stats };
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
    finished: boolean;
    found: boolean;
    match: StatDoc | null;
    stats: StatDoc[];
}

async function loadMatch(entry: TeamMatchIndexEntry): Promise<TeamMatchData> {
    const code = entry.code;
    const cached = readCache(code);
    if (cached) {
        return {
            code,
            opponent: entry.opponent || cached.match?.opponent || "",
            date: entry.date,
            season: entry.season ?? null,
            finished: true,
            found: true,
            match: cached.match,
            stats: cached.stats,
        };
    }

    const matchSnap = await getDoc(doc(db, "live_matches", code));
    if (!matchSnap.exists()) {
        return {
            code,
            opponent: entry.opponent,
            date: entry.date,
            season: entry.season ?? null,
            finished: false,
            found: false,
            match: null,
            stats: [],
        };
    }
    const rawMatch = matchSnap.data() as StatDoc;
    const statsSnap = await getDocs(query(collection(db, "live_matches", code, "stats"), orderBy("order")));
    const stats = statsSnap.docs.map((d) => d.data());
    const trimmed = trimMatch(rawMatch);
    const finished = isMatchFinished(rawMatch);
    if (finished) writeCache(code, { match: trimmed, stats });

    return {
        code,
        opponent: entry.opponent || rawMatch.opponent || "",
        date: entry.date,
        season: entry.season ?? null,
        finished,
        found: true,
        match: trimmed,
        stats,
    };
}

export function useTeamStats(teamId: string) {
    const team = useDocument(doc(db, "teams", teamId));

    const matchesByCode = reactive(new Map<string, TeamMatchData>());
    const matches = computed(() => [...matchesByCode.values()].sort((a, b) => b.date - a.date));

    const progress = reactive({ loading: false, done: 0, total: 0 });

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

    const hasUnseasonedMatches = computed(() => matches.value.some((m) => !m.season));

    const filteredMatches = computed(() => {
        if (!hasSeasons.value || selectedSeason.value === "all") return matches.value;
        if (selectedSeason.value === "__none__") return matches.value.filter((m) => !m.season);
        return matches.value.filter((m) => m.season === selectedSeason.value);
    });

    // --- carga ---------------------------------------------------------
    watchEffect(async () => {
        const index = (team.value?.matches ?? []) as StatDoc[];
        if (!index.length) return;

        const pending = index.filter((e) => {
            const code = String(e?.code ?? "");
            if (!code) return false;
            const existing = matchesByCode.get(code);
            return !existing || !existing.finished; // en vivo: se reintenta.
        });
        if (!pending.length) return;

        progress.loading = true;
        progress.total = index.length;
        progress.done = index.length - pending.length;

        await mapWithConcurrency(
            pending,
            CONCURRENCY,
            async (raw) => {
                const entry: TeamMatchIndexEntry = {
                    code: String(raw.code ?? ""),
                    opponent: String(raw.opponent ?? ""),
                    date: Number(raw.date ?? 0),
                    season: raw.season != null ? String(raw.season) : undefined,
                };
                const data = await loadMatch(entry);
                matchesByCode.set(entry.code, data);
                return data;
            },
            (done) => {
                progress.done = index.length - pending.length + done;
            }
        );

        progress.loading = false;
    });

    return {
        team,
        matches,
        filteredMatches,
        progress,
        hasSeasons,
        seasonsMap,
        seasonIds,
        currentSeasonId,
        selectedSeason,
        hasUnseasonedMatches,
    };
}
