# PROGRESS

Arranque de sesión nueva: `CLAUDE.md` → este archivo → `docs/PLAN.md`. **Proyecto terminado y PUBLICADO (2026-11-24, autorizado por Juan):** https://graudiazjuan212-cyber.github.io/app-estudio/ — repo público `graudiazjuan212-cyber/app-estudio`, rama `main`; cada `git push` a `main` despliega (Actions: check + e2e + Pages; ejecutor `ubuntu-24.04`). Último despliegue verde: `cad14ee`.

## Estado por hito
| Hito | Estado | Commit de cierre | Verificación |
|---|---|---|---|
| M0 Andamiaje | **Cerrado** | `75c4de1` | 37 tests |
| M1 Paquetes (`estudio-pack/1`) | **Cerrado** (2 revisiones adversariales) | `42abbc6` | 252 tests |
| M2 Dominio (FSRS, dominio, sesión) | **Cerrado** (adversarial) | `f89cd6b` | 669 tests |
| M3 Almacenamiento y copias | **Cerrado** (adversarial) | `11824bc` | 901 tests |
| M4 Renderizado de preguntas | **Cerrado** | `7fe50c9` | 963 tests + 24 E2E |
| M5 Pantallas y flujo de estudio | **Cerrado** | `d455e40` | 1180 tests + 44 E2E |
| M6 Exportación de progreso | **Cerrado** (adversarial) | `af6ce0c` | 1232 tests + 51 E2E |
| M7 Offline / actualización / instalación | **Cerrado** | `909b475` | 56 E2E (5 de PWA con dos builds reales) |
| M8 README para Juan + prueba móvil | **Cerrado por Claude** (documentos revisados contra la UI final); la **prueba en el Android de Juan** es suyo | ver `RESULTADO-M8.md` | revisión estática + capturas |
| M9 Pulido (a11y, rendimiento, integridad, capturas) | **Cerrado** (adversarial de M9-3: aprobado, sin hallazgos) | `c2598ce` (M9-2), `459dde0` (M9-3), `7dbe6c4` | `npm run check`: 1340 tests; E2E 149 |
| M10-1 Duración de sesión al empezar (1/5/10/15/30 min, 10 por defecto) | **Cerrado** | `6b0a265` | `npm run check`: 1379 tests + 16 node + 4 dist; E2E: 153 pasan, 2 omitidos, 0 fallos |

Informes: `docs/results/RESULTADO-M0…M9.md`, `PARA-REVISAR-*.md`, `RESULTADO-FINAL.md`, `M9-1.md` (informe de Codex), `capturas/` (PNG claro/oscuro).

## Qué falta
Nada de código pendiente salvo la **pregunta 7** de `docs/QUESTIONS.md` (sesión sin terminar: hoy las respuestas cuentan al momento; propuesta de que cuenten solo al terminar). Si Juan dice «sí», es la tarea M10-2 (domino/repasos: revisar con `adversarial-review` antes de publicar). Y Juan (ver `docs/PENDIENTE-JUAN.md` y `docs/QUESTIONS.md`):
1. (Hecho) Publicación: Juan autorizó el push y Pages está activo con origen «GitHub Actions».
3. Probar `docs/PRUEBA_MOVIL.md` en su Android.
4. Importar sus paquetes reales y hacer la primera copia.

## Siguiente paso exacto
- **Publicado.** Para cambios futuros: commit → `git push` → vigilar `gh run list` (tarda ~6 min). Un E2E rojo en CI bloquea el despliegue (la web anterior sigue en línea). Lección del primer despliegue: `ubuntu-latest` pasó a 26.04 y Playwright no instala ffmpeg ahí → ejecutor fijado a `ubuntu-24.04`; un E2E con carrera (ajuste sin esperar a guardarse) solo falló en CI, más lento.
- **Si Juan encuentra fallos en el móvil:** abrir una tarea `docs/tasks/<hito>-<n>.md` con el fallo concreto y seguir el flujo de `CLAUDE.md`.
- **Opcional:** `adversarial-review` solo de M9-3 (`--base c2598ce`); no se ha hecho (solo rendimiento, con equivalencia probada).
- **Desde la primera publicación** cualquier cambio de tablas/índices de IndexedDB exige versión nueva y migración con copia previa (ADR-013, ADR-024, ADR-027).

## Cómo trabajar (lecciones; detalle en `docs/diario-friccion.md`)
- Delegar con el agente `codex:codex-rescue`. Codex **no puede ejecutar npm, vitest ni E2E**: cada entrega se verifica ejecutando `npm run check` y `npm run e2e` (siempre aparece algo: lint, tipos, E2E, BOM, acentos rotos `?`). Si se detiene con una pregunta, decidir como director técnico y relanzar con «no te detengas a preguntar».
- Revisión adversarial: script `codex-companion.mjs adversarial-review` en segundo plano con salida a `$TEMP`.
- `src/repo-hygiene.test.ts` vigila BOM, archivos > 300 líneas y acentos sustituidos por `?`.
- Los tests que inspeccionan `dist` son `*.dist.test.ts` y corren tras el build (`npm run test:dist`, dentro de `npm run check`).
- Evitar `$$`, apóstrofos sueltos y `\\` en comandos de shell con heredoc (la herramienta los rompe): usar la herramienta de escritura de archivos.

## Decisiones cerradas (no se reabren)
- ADR-001…027 de `docs/DECISIONS.md`. Capa de datos `src/data/`. `ts-fsrs` 5.4.2 (FSRS-6). KaTeX no usa `katex-error` (ADR-025). Índice derivado `metadataKey` en `items` (ADR-027).
- E2E con el Chrome instalado (ADR-020), builds aparte `dist-e2e` (`VITE_ENABLE_DEMO=true`: demo `#/demo` y reloj de pruebas; **no** existen en `dist`).
- Sin `skipWaiting`/`clientsClaim` automáticos: una actualización nunca interrumpe una sesión (ADR-013; registro propio en `src/app/swRegister.ts`).

## Fallos abiertos
Ninguno conocido. Límites: WebKit/iPhone sin probar (la descarga de navegadores de Playwright falla en este equipo); rendimiento en móvil real solo estimado.

## Pendientes de Juan
Ver `docs/PENDIENTE-JUAN.md` y `docs/QUESTIONS.md`.
