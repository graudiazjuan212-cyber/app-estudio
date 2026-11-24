# RESULTADO M0 — Andamiaje

Estado: **cerrado** (commits `bd1835b`, `75c4de1`). Verificado por Claude en disco, no por el informe de Codex (Codex no pudo ejecutar npm: sandbox sin red, ver `docs/diario-friccion.md`).

## Qué se hizo
- Vite 7 + React 19 + TypeScript estricto, ESLint (typescript-eslint estricto, react-hooks, `no-explicit-any`), Vitest, Playwright (perfil Pixel 7 con el Chrome instalado, `channel: 'chrome'`).
- Enrutado por hash propio (`src/domain/router.ts`) con pantallas Inicio y Ajustes y ruta desconocida → Inicio.
- Layout móvil con tema claro/oscuro por `prefers-color-scheme`; constantes en `src/config.ts`.
- PWA mínima (`vite-plugin-pwa`, `registerType: 'prompt'`, base `/app-estudio/`), iconos generados por `scripts/make-icons.mjs`.
- Workflow de Pages (`.github/workflows/deploy.yml`): `npm ci` → `playwright install --with-deps chrome` → `check` → `e2e` → publicar `dist`. **No se ha ejecutado** (no hay push hasta M9).

## Verificaciones (ejecutadas por Claude)
| Comprobación | Resultado |
|---|---|
| `npm run check` (tsc + eslint `--max-warnings 0` + vitest + build) | verde, 37 tests unitarios (`router.test.ts`) |
| `npm run e2e` | 1/1 en verde (Chrome 158, Pixel 7) |
| `npm ls --depth=0` | solo las dependencias de la lista, versiones exactas |
| `dist/` | `manifest.webmanifest`, `sw.js`, iconos, rutas con `/app-estudio/` |

## Fallos que encontró el E2E (no el informe de Codex) y su corrección
1. `vite preview` usaba `base '/'` (lo decidía `command === 'build'`) → página en blanco con 404 en los scripts. Corregido en `vite.config.ts` con `isPreview`.
2. Faltaba `<link rel="icon">` → 404 de favicon en consola. Corregido en `index.html`.

## No hecho / diferido
- Repo en GitHub, Pages y Lighthouse PWA: requieren push (M9). Lighthouse queda para M7/M9.
- Test de que los 37 casos del router salen de `tests/fixtures/router.ts` (datos fijos): revisado por encima; ver PARA-REVISAR.
