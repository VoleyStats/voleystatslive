// Formas de los documentos de Firestore que esta web LEE (nunca escribe).
//
// El contrato autoritativo, campo a campo, vive en `../VoleyStatsApp/CLAUDE.md`
// y lo producen los `toJSON()` de las apps: un rename allí rompe esto EN
// SILENCIO (en runtime, no en compilación), así que todo es opcional aquí y
// todo consumidor debe tener un fallback.
//
// Estas interfaces son parciales a propósito: declaran solo lo que la web lee
// hoy. Los documentos reales traen bastantes más campos (plantilla, sets,
// temporada…) y el resto del código sigue accediendo a ellos con `?.` sobre
// `DocumentData`.

/** `Team.toJSON()` anidado como `team` dentro de `live_matches/{code}`. */
export interface LiveTeam {
    id?: string;
    name?: string;
    /** Hex sin `#`, o con él en docs antiguos — normalizar antes de usar. */
    color?: string;
    /** Escudo propio. URL pública absoluta con cache-buster `?v=`; `""` si no hay. */
    logo_url?: string;
}

/** Una entrada de `sets_scoreboard[]` en `live_matches/{code}`. */
export interface SetScore {
    number: number;
    score_us: number;
    score_them: number;
}

/** `live_matches/{code}` — solo la parte que consume el marcador/overlay. */
export interface LiveMatch {
    team?: LiveTeam;
    /** Nombre del rival: texto libre, sigue siendo la fuente de display. */
    opponent?: string;
    /**
     * Escudo del rival, ya resuelto por la app desde su ficha (`rival_team`).
     * `""` si el partido no tiene ficha de rival, si la ficha no tiene logo, o
     * si el cliente que publicó es antiguo. Nunca `null`.
     */
    opponent_logo_url?: string;
    n_sets?: number;
    sets_us?: number;
    sets_them?: number;
    current_set?: number;
    set_closed?: boolean;
    sets_scoreboard?: SetScore[];
}

/**
 * `teams/{id}.overlay` — config remota del marcador de OBS, publicada
 * (opcionalmente) por las apps y recargada en caliente. Ver la cascada de
 * prioridad en `Overlay.vue`: sesión > remoto > query param > default.
 */
export interface TeamOverlayConfig {
    pos?: string;
    scale?: number;
    banners?: string;
    /**
     * Mostrar escudos en el overlay. **Ausente = `true`**: un cliente antiguo
     * que nunca escriba este campo no debe apagar la feature.
     */
    logos?: boolean;
}

/** Índice de partidos compartidos que publica `teams/{id}.matches[]`. */
export interface TeamMatchIndexEntry {
    code: string;
    opponent: string;
    date: number;
    season?: string;
}

/** `teams/{id}` — página pública de equipo y config de overlay. */
export interface TeamDoc {
    id?: string;
    name?: string;
    color?: string;
    /** Mismo escudo que `live_matches/{code}.team.logo_url`; `""` si no hay. */
    logo_url?: string;
    current_season?: string;
    /** id de temporada -> nombre. */
    seasons?: Record<string, string>;
    matches?: TeamMatchIndexEntry[];
    overlay?: TeamOverlayConfig;
}
