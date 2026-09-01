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
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ORIGIN = process.env.VITE_SITE_ORIGIN ?? 'https://voleystats.vercel.app'

// Rutas ESTÁTICAS indexables. Debe cuadrar con `src/router.ts` (`meta.seo`) y
// con `public/sitemap.xml`. Las dinámicas (`/stats/:id`, `/team/:id`) y las
// `noindex` (`/overlay/:code`) no se prerenderizan. `/` ya es `index.html`.
const ROUTES = [
  { path: '/team-code', file: 'team-code.html', seo: 'teamCode' },
  { path: '/pricing', file: 'pricing.html', seo: 'pricing', faq: 'pricing' },
  { path: '/privacy', file: 'privacy.html', seo: 'privacy' },
  { path: '/terms', file: 'terms.html', seo: 'terms' },
  { path: '/delete-account', file: 'delete-account.html', seo: 'deleteAccount' },
  { path: '/contact', file: 'contact.html', seo: 'contact' },
]

const template = readFileSync(resolve(root, 'dist/index.html'), 'utf8')
const i18nByLocale = {
  es: JSON.parse(readFileSync(resolve(root, 'src/i18n/es.json'), 'utf8')),
  en: JSON.parse(readFileSync(resolve(root, 'src/i18n/en.json'), 'utf8')),
}
const seoByLocale = { es: i18nByLocale.es.seo, en: i18nByLocale.en.seo }
// Precios: MISMO fichero que lee la web para pintar /pricing (src/data/plans.ts).
// Estaban escritos a mano en el JSON-LD y ese es justo el sitio donde nadie
// mira cuando cambia una tarifa.
const plans = JSON.parse(readFileSync(resolve(root, 'src/data/plans.json'), 'utf8'))
// La portada tambien se prerenderiza: es la unica ruta estatica que no estaba
// en ROUTES porque ya la emite Vite como `index.html`, pero necesita su
// `hreflang` igual que las demas.
const ALL = [{ path: '/', file: 'index.html', seo: 'home', faq: 'home' }, ...ROUTES]

// Falla ruidosamente: si alguien reescribe el head de `index.html` y una de
// estas etiquetas deja de existir, prefiero romper el build a publicar en
// silencio páginas que vuelven a apuntar su canonical a la portada.
function replace(html, pattern, replacement, label, file) {
  if (!pattern.test(html)) throw new Error(`prerender: no encuentro ${label} en dist/index.html (ruta ${file})`)
  return html.replace(pattern, replacement)
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')

// JSON-LD de FAQPage, generado desde `home.faq` del MISMO JSON de i18n que
// pinta el acordeón de la portada — antes se mantenía a mano en `index.html` y
// acabó describiendo unos planes que ya no existían. Solo se inyecta en la
// portada (`/` y `/en`): es el único sitio donde ese FAQ se muestra, y marcar
// contenido no visible es exactamente lo que Google penaliza.
const FAQ_MARKER = '<!-- @faq-jsonld -->'
// `index.html` deja el array vacio y aqui se rellena: asi el HTML fuente no
// tiene precios que puedan quedarse viejos.
const OFFERS_ANCHOR = '"offers": []'

function offersJson(locale) {
  const label = (id) => plain(i18nByLocale[locale].pricing[`plans${id[0].toUpperCase()}${id.slice(1)}Name`])
  const offers = []
  for (const plan of plans.plans) {
    if (plan.year === undefined) {
      offers.push({ '@type': 'Offer', name: label(plan.id), price: '0', priceCurrency: plans.currency })
      continue
    }
    for (const [amount, duration, periodKey] of [[plan.year, 'P1Y', 'yearly'], [plan.month, 'P1M', 'monthly']]) {
      offers.push({
        '@type': 'Offer',
        name: `${label(plan.id)} (${plain(i18nByLocale[locale].pricing[periodKey])})`,
        price: amount.toFixed(2),
        priceCurrency: plans.currency,
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: amount.toFixed(2),
          priceCurrency: plans.currency,
          billingDuration: duration,
        },
      })
    }
  }
  offers.push({
    '@type': 'Offer',
    name: plain(i18nByLocale[locale].pricing.matchPassName),
    price: plans.matchPass.price.toFixed(2),
    priceCurrency: plans.currency,
  })
  // Indentado a 8 espacios para que encaje donde vive el ancla dentro del bloque.
  return `"offers": ${JSON.stringify(offers, null, 2).replace(/\n/g, '\n        ')}`
}

// vue-i18n usa `{...}` para interpolar y `{'@'}` para escapar literales; en el
// JSON-LD queremos el texto plano que lee el usuario.
const plain = (s) => s.replace(/\{'(.*?)'\}/g, '$1')

function faqJsonLd(locale, section) {
  // `home` guarda su FAQ en `home.faq`; `/pricing` la tiene en `pricing` junto
  // al resto de su copy. Cada pagina publica SOLO las preguntas que pinta.
  const faq = section === 'home' ? i18nByLocale[locale].home?.faq : i18nByLocale[locale][section]
  if (!faq) throw new Error(`prerender: falta la seccion de FAQ "${section}" en src/i18n/${locale}.json`)
  const mainEntity = []
  for (let n = 1; faq[`q${n}`]; n++) {
    const answer = faq[`a${n}`]
    if (!answer) throw new Error(`prerender: home.faq.q${n} sin a${n} en src/i18n/${locale}.json`)
    mainEntity.push({
      '@type': 'Question',
      name: plain(faq[`q${n}`]),
      acceptedAnswer: { '@type': 'Answer', text: plain(answer) },
    })
  }
  if (!mainEntity.length) throw new Error(`prerender: home.faq sin preguntas en src/i18n/${locale}.json`)
  const json = JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity }, null, 2)
    // Un `</script>` dentro de una cadena cerraría el bloque; escaparlo es la
    // única forma segura de meter texto libre en un <script>.
    .replace(/</g, '\\u003c')
  return `<script type="application/ld+json">\n${json}\n    </script>`
}

// El ingles vive bajo `/en` (ver src/router.ts): mismas paginas, otra URL, y
// cada una declarando a la otra con `hreflang`. Sin esto las dos versiones
// comparten direccion y el buscador solo ve una.
const localePath = (locale, path) => (locale === 'es' ? path : path === '/' ? '/en' : `/en${path}`)

for (const locale of ['es', 'en']) {
for (const route of ALL) {
  const seo = seoByLocale[locale]
  const entry = seo[route.seo]
  if (!entry) throw new Error(`prerender: falta seo.${route.seo} en src/i18n/${locale}.json`)
  const path = localePath(locale, route.path)
  const url = ORIGIN + path
  const alternates = [
    `<link rel="alternate" hreflang="es" href="${ORIGIN}${localePath('es', route.path)}" />`,
    `<link rel="alternate" hreflang="en" href="${ORIGIN}${localePath('en', route.path)}" />`,
    `<link rel="alternate" hreflang="x-default" href="${ORIGIN}${localePath('es', route.path)}" />`,
  ].join('\n    ')
  const title = esc(entry.title)
  const description = esc(entry.description)

  let html = template
  html = replace(html, /<title>[\s\S]*?<\/title>/, `<title>${title}</title>`, '<title>', route.file)
  html = replace(html, /<meta\s+name="description"[\s\S]*?\/>/, `<meta name="description" content="${description}" />`, 'meta description', route.file)
  html = replace(html, /<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${url}" />\n    ${alternates}`, 'canonical', route.file)
  html = replace(html, /<html lang="[a-z-]+"/, `<html lang="${locale}"`, '<html lang>', route.file)
  html = html.replace(/<meta property="og:locale" content="[^"]*"/, `<meta property="og:locale" content="${locale === 'es' ? 'es_ES' : 'en_US'}"`)
  html = replace(html, /<meta property="og:title"[\s\S]*?\/>/, `<meta property="og:title" content="${title}" />`, 'og:title', route.file)
  html = replace(html, /<meta\s+property="og:description"[\s\S]*?\/>/, `<meta property="og:description" content="${description}" />`, 'og:description', route.file)
  html = replace(html, /<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${url}" />`, 'og:url', route.file)
  html = replace(html, /<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${title}" />`, 'twitter:title', route.file)
  html = replace(html, /<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${description}" />`, 'twitter:description', route.file)

  // El JSON-LD de FAQPage describe el FAQ que solo pinta la portada: se inyecta
  // ahí (en su idioma) y se borra el marcador en las demás páginas, donde ese
  // contenido no se muestra.
  // Exactamente UNA aparición: `replace` con cadena sustituye solo la primera,
  // así que una segunda (p. ej. citada en un comentario del propio HTML) haría
  // que el JSON-LD se quedara con las ofertas vacías sin que nadie lo notara.
  const anchorHits = html.split(OFFERS_ANCHOR).length - 1
  if (anchorHits !== 1) throw new Error(`prerender: esperaba 1 aparición de ${OFFERS_ANCHOR} en dist/index.html, encontradas ${anchorHits} (ruta ${route.file})`)
  html = html.replace(OFFERS_ANCHOR, offersJson(locale))

  if (!html.includes(FAQ_MARKER)) throw new Error(`prerender: no encuentro ${FAQ_MARKER} en dist/index.html (ruta ${route.file})`)
  html = html.replace(FAQ_MARKER, route.faq ? faqJsonLd(locale, route.faq) : '')

  const outFile = locale === 'es' ? route.file : `en/${route.file}`
  mkdirSync(dirname(resolve(root, 'dist', outFile)), { recursive: true })
  writeFileSync(resolve(root, 'dist', outFile), html)
  console.log(`prerender: dist/${outFile}  ${path}`)
}
}
