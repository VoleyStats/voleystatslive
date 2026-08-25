// Escudos de equipo (logo): única fuente de imágenes REMOTAS de todo el sitio.
//
// Las apps suben el PNG a un bucket público de Supabase Storage y publican la
// URL pública absoluta en Firestore (`live_matches/{code}.team.logo_url`,
// `live_matches/{code}.opponent_logo_url`, `teams/{id}.logo_url`). Este repo
// solo lee esa cadena y la pinta; nunca sube, valida ni borra nada.
//
// Como la URL viene de un documento de Firestore (dato externo que esta web no
// controla), se filtra por origen antes de meterla en un `<img src>`: así un
// documento manipulado no puede convertir el visor en un baliza de tracking
// hacia un host arbitrario. El mismo host es el único externo permitido en la
// cabecera `img-src` de la CSP (ver `vercel.json`) — si cambia el proyecto de
// Supabase hay que tocar LOS DOS sitios.
export const TEAM_LOGO_ORIGIN = "https://nannsjtfivbszbrjhjij.supabase.co";

// Endpoint público de Supabase Storage. No se comprueba el nombre del bucket:
// el límite de seguridad real es el origen, y el bucket es un detalle del lado
// app que puede cambiar sin que esto sea una brecha.
const REMOTE_PREFIX = `${TEAM_LOGO_ORIGIN}/storage/v1/object/public/`;

/**
 * Devuelve la URL si es utilizable como escudo, o `""` si no lo es (ausente,
 * cadena vacía —el valor que publican las apps cuando no hay logo— o de un
 * host inesperado). El llamante debe tratar `""` como "no hay escudo" y caer
 * al chip de color de siempre.
 *
 * IMPORTANTE: la cadena se devuelve TAL CUAL, sin normalizar ni recortar la
 * query string. Las apps añaden un cache-buster `?v=<epoch>` que cambia al
 * reemplazar un logo; tocarlo dejaría el escudo viejo pegado en el CDN y en la
 * caché del navegador.
 */
export function safeLogoUrl(url: unknown): string {
    const raw = typeof url === "string" ? url.trim() : "";
    if (!raw) return "";
    // Same-origin (`/icon-192.png`): assets propios de `public/`, usados por el
    // modo demo del overlay. `//host/...` es protocol-relative (otro origen) y
    // queda fuera a propósito.
    if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
    return raw.startsWith(REMOTE_PREFIX) ? raw : "";
}
