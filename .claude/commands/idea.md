---
description: Investiga una idea del ecosistema VoleyStats y genera una issue con la spec completa (NO implementa)
argument-hint: descripción de la idea, mejora o problema
---

# /idea — de idea a issue con spec

Idea a investigar: $ARGUMENTS

Eres el investigador del ecosistema VoleyStats. Tu trabajo termina al crear la issue: **no implementes nada, no crees ramas ni PRs**, aunque la spec parezca trivial. La implementación se pedirá después explícitamente sobre la issue generada.

## 1. Sitúa la idea en el ecosistema

Tres repos independientes (sin código compartido; el único acoplamiento es Firestore):

| Repo | GitHub | Rol | Rama de trabajo |
|---|---|---|---|
| iOS (SwiftUI) | `VoleyStats/voleyStatsApp` | Implementación de referencia | `dev` |
| Android (Kotlin/Compose) | `VoleyStats/VoleyStats-android` | Port a paridad con iOS | `main` |
| Web (Vue 3) | `VoleyStats/voleystatslive` | Visor público; solo LEE Firestore | `main` |

Routing:
- Captura, stats, modelos, UI de app → **iOS + Android** (paridad obligatoria; iOS es la referencia).
- Todo lo que toque datos en vivo (shapes de `toJSON()`, `live_matches`, `teams/{id}`) → **además web**. El contrato campo a campo vive en el CLAUDE.md del repo iOS ("Companion web app" / "Live sets scoreboard").
- Visor público, overlay OBS, SEO → **solo web**.

Si un repo afectado no está clonado en esta sesión, inspecciónalo con `gh` (`gh api repos/<owner>/<repo>/contents/<ruta>`, `gh search code --repo <owner>/<repo> "<término>"`) — tu credencial tiene acceso a los tres.

## 2. Investiga

- Lee el CLAUDE.md de cada repo afectado antes de tocar código: recogen decisiones de producto ya tomadas que condicionan el diseño.
- Localiza el código afectado: ficheros y símbolos concretos, no descripciones vagas.
- Determina si toca el contrato Firestore. Si lo hace, el cambio debe ser **aditivo** (nunca renombrar/cambiar tipo de campos existentes) y coordinado en los repos afectados.
- Busca issues abiertas relacionadas: `gh issue list -R <owner/repo> --search "<términos>"`. Si ya existe una, coméntala en vez de duplicar.

## 3. Redacta la spec (en español)

Estructura del cuerpo de la issue:

```
## Resumen
## Motivación
## Repos afectados
## Diseño propuesto
   (por repo: ficheros a tocar y cambios concretos)
## Contrato Firestore
   ("sin cambios", o los campos nuevos detallados uno a uno)
## Criterios de aceptación
## Riesgos y casos límite
## Fuera de alcance
```

Si la idea es ambigua, elige la interpretación más razonable y decláralo en "Resumen" — no bloquees la issue esperando respuestas.

## 4. Crea la issue

- Repo destino: el repo **principal** del cambio. Si es iOS+Android, créala en `VoleyStats/voleyStatsApp` con checklist de paridad para Android; si es solo web, en `VoleyStats/voleystatslive`.
- Asegura la label: `gh label create spec -R <owner/repo> --color 5319E7 --description "Spec pendiente de aprobación" 2>/dev/null || true`
- Crea: `gh issue create -R <owner/repo> --title "<título corto>" --body-file <fichero> --label spec`
- Solo si el trabajo en otro repo es sustancial y separable, crea una issue satélite en ese repo enlazando la principal.

## 5. Informe final

Devuelve: URL(s) de la issue, repos afectados y una línea con el mayor riesgo detectado. Y para aquí: la implementación llegará como petición aparte ("implementa la issue #N").
