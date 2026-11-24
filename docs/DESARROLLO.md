# Desarrollo (para quien programa)

Aplicación de estudio PWA (React + TypeScript + Vite, sin backend). Lee antes `CLAUDE.md`, `docs/PROGRESS.md`, `docs/PLAN.md` y `docs/DECISIONS.md`.

## Requisitos
- Node 22.12 o superior (CI: Node 22). En PowerShell con scripts bloqueados, usa `npm.cmd` y `npx.cmd`.
- Chrome instalado: los E2E usan `channel: 'chrome'` (no se descarga Chromium; ADR-020). En CI: `npx playwright install --with-deps chrome`.

## Comandos
| Comando | Qué hace |
|---|---|
| `npm ci` | Instala las dependencias (versiones exactas). |
| `npm run dev -- --host` | Servidor de desarrollo accesible desde el móvil en la misma Wi-Fi. |
| `npm run check` | `tsc` + ESLint (cero avisos) + Vitest + build. Debe estar en verde antes de cada commit. |
| `npm run e2e` | Compila `dist-e2e` (con `VITE_ENABLE_DEMO=true`: ruta `#/demo` y reloj de pruebas) y ejecuta Playwright en perfil Pixel 7. |
| `npm run build` / `npm run preview` | Compilación de producción (`dist`) y su vista previa en `/app-estudio/`. |
| `npm run schema:export` | Regenera `docs/estudio-pack-1.schema.json` y `docs/estudio-progreso-1.schema.json`. |
| `node scripts/make-icons.mjs` | Regenera los iconos. |

## Estructura (capas sin saltos: `domain/` ← `data/` ← `app/` + `ui/`)
- `src/domain/pack/` — formato `estudio-pack/1`: esquema, validación, diff.
- `src/domain/study/` — FSRS, dominio de bloques, puntos ciegos, sesiones, examen, racha (lógica pura, reloj inyectado).
- `src/domain/render/`, `src/domain/progress/` — Markdown+KaTeX seguro y exportación de progreso.
- `src/data/` — IndexedDB (Dexie): importación atómica, intentos, copias, migraciones con copia previa.
- `src/app/`, `src/ui/` — pantallas y componentes. La UI nunca toca IndexedDB.
- `tests/fixtures/` — datos de prueba fijos; `e2e/` — pruebas de extremo a extremo.

## Reglas que hay que respetar
Ver `CLAUDE.md` y `AGENTS.md`: archivos ≤ 300 líneas, sin BOM (lo vigila `src/repo-hygiene.test.ts`), TypeScript estricto sin `any`, sin valores mágicos (todo en `src/config.ts`), una dependencia nueva exige ADR, y **los datos de Juan no se borran ni sobrescriben**: lo que no se entiende se rechaza.

## Publicación
El workflow `.github/workflows/deploy.yml` ejecuta `check` y `e2e` y publica `dist` en GitHub Pages al enviar a `main` (Pages con origen «GitHub Actions»). No se hace `git push` sin autorización de Juan.
