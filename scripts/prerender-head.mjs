// Prerender del <head> por ruta (post-build).
//
// El problema que resuelve: la app es una SPA y `vercel.json` reescribe todo a
// `/index.html`, así que TODAS las rutas se servían con el head estático de la
// portada — canonical incluido. `src/composables/useSeo.ts` lo corrige, pero
// solo después de ejecutar JS: en la primera pasada del rastreador,
// `/team-code` se autodeclaraba duplicado de `/`. Search Console lo marcaba
// como "Página alternativa con etiqueta canónica adecuada" y no la indexaba,
// pidiera uno la indexación a mano las veces que fuera.
//
// Aquí emitimos un HTML por ruta estática con su title/description/canonical/
// og:* ya escritos en el HTML servido. Vercel resuelve el sistema de ficheros
// ANTES que los `rewrites`, así que `dist/team-code.html` gana a la rewrite
// catch-all sin tocar `vercel.json` (salvo `cleanUrls`, ver abajo).
//
// Fuente de verdad de los textos: `src/i18n/es.json` → sección `seo`, la misma
// que usa `useSeo.ts` en caliente. Si divergieran, cada rastreador se llevaría
// una versión distinta del sitio.
//
// OJO: esto prerenderiza el HEAD, no el BODY. Google (que ejecuta JS) ya no
// tiene excusa para no indexar; los rastreadores de IA siguen viendo el body
// vacío + `llms.txt`. Para eso haría falta SSG real (vite-ssg).
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ORIGIN = process.env.VITE_SITE_ORIGIN ?? 'https://voleystats.vercel.app'

// Rutas ESTÁTICAS indexables. Debe cuadrar con `src/router.ts` (`meta.seo`) y
// con `public/sitemap.xml`. Las dinámicas (`/stats/:id`, `/team/:id`) y las
// `noindex` (`/overlay/:code`) no se prerenderizan. `/` ya es `index.html`.
const ROUTES = [
  { path: '/team-code', file: 'team-code.html', seo: 'teamCode' },
  { path: '/privacy', file: 'privacy.html', seo: 'privacy' },
  { path: '/terms', file: 'terms.html', seo: 'terms' },
  { path: '/delete-account', file: 'delete-account.html', seo: 'deleteAccount' },
  { path: '/contact', file: 'contact.html', seo: 'contact' },
]

const template = readFileSync(resolve(root, 'dist/index.html'), 'utf8')
const seo = JSON.parse(readFileSync(resolve(root, 'src/i18n/es.json'), 'utf8')).seo

// Falla ruidosamente: si alguien reescribe el head de `index.html` y una de
// estas etiquetas deja de existir, prefiero romper el build a publicar en
// silencio páginas que vuelven a apuntar su canonical a la portada.
function replace(html, pattern, replacement, label, file) {
  if (!pattern.test(html)) throw new Error(`prerender: no encuentro ${label} en dist/index.html (ruta ${file})`)
  return html.replace(pattern, replacement)
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')

for (const route of ROUTES) {
  const entry = seo[route.seo]
  if (!entry) throw new Error(`prerender: falta seo.${route.seo} en src/i18n/es.json`)
  const url = ORIGIN + route.path
  const title = esc(entry.title)
  const description = esc(entry.description)

  let html = template
  html = replace(html, /<title>[\s\S]*?<\/title>/, `<title>${title}</title>`, '<title>', route.file)
  html = replace(html, /<meta\s+name="description"[\s\S]*?\/>/, `<meta name="description" content="${description}" />`, 'meta description', route.file)
  html = replace(html, /<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${url}" />`, 'canonical', route.file)
  html = replace(html, /<meta property="og:title"[\s\S]*?\/>/, `<meta property="og:title" content="${title}" />`, 'og:title', route.file)
  html = replace(html, /<meta\s+property="og:description"[\s\S]*?\/>/, `<meta property="og:description" content="${description}" />`, 'og:description', route.file)
  html = replace(html, /<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${url}" />`, 'og:url', route.file)
  html = replace(html, /<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${title}" />`, 'twitter:title', route.file)
  html = replace(html, /<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${description}" />`, 'twitter:description', route.file)

  // El JSON-LD de FAQPage describe el FAQ que solo pinta la portada: dejarlo
  // en las demás páginas sería marcado de contenido que ahí no se muestra.
  html = html.replace(/\n\s*<!-- Structured data: FAQ[\s\S]*?<\/script>/, '')

  writeFileSync(resolve(root, 'dist', route.file), html)
  console.log(`prerender: dist/${route.file}  ${route.path}`)
}
