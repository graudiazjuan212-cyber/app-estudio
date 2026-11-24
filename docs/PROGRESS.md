# PROGRESS

Arranque de sesión nueva: `CLAUDE.md` → este archivo → `docs/PLAN.md`.

## Estado por hito
| Hito | Estado | Último commit | Tests unitarios |
|---|---|---|---|
| M0 Andamiaje | **Cerrado** | `75c4de1` | 37 |
| M1 Paquetes | **Cerrado** | `42abbc6` | 252 |
| M2 Dominio | **Cerrado** | `f89cd6b` | 669 |
| M3 Almacenamiento | **Cerrado** | `11824bc` | 901 (incluye M4-1) |
| M4 Render | M4-1 **hecho** (`6ae5e65`); M4-2 (componentes, `#/demo`, E2E) delegada a Codex | — | — |
| M5 Pantallas | Specs `M5-1`, `M5-2`, `M5-3` listas; sin delegar | — | — |
| M6–M9 | Sin implementar (specs por escribir) | — | — |

## Siguiente paso exacto
1. Verificar la entrega de M4-2 (`docs/tasks/M4-2.md`): `npm run check` **y `npm run e2e`** (hay E2E nuevos en `e2e/questions.spec.ts`), leer diff, comprobar BOM/300 líneas (lo vigila `src/repo-hygiene.test.ts`), comitear. Cerrar M4 (RESULTADO/PARA-REVISAR).
2. M5-1 → M5-2 → M5-3 (cada una: delegar con el agente `codex:codex-rescue`, verificar, comitear; los E2E los ejecuta Claude).
3. Escribir las specs de M6 (exportación de progreso, con adversarial), M7 (offline/PWA/actualización), M8 (README para Juan + `docs/PRUEBA_MOVIL.md`), M9 (pulido, accesibilidad, rendimiento, Lighthouse) y ejecutarlas. Al final: `docs/results/RESULTADO-FINAL.md` y la pregunta de publicación en `docs/QUESTIONS.md` (**no hacer push** hasta que Juan autorice).
4. Revisiones adversariales: `node ~/.claude/plugins/cache/openai-codex/codex/1.0.6/scripts/codex-companion.mjs adversarial-review --wait --base <commit> "foco"` en segundo plano con salida a un archivo de `$TEMP`.

## Decisiones cerradas (no se reabren)
- ADR-001…025 de `docs/DECISIONS.md`. Capa de datos `src/data/`. `ts-fsrs` 5.4.2 (FSRS-6).
- E2E con Chrome instalado (`channel: 'chrome'`, ADR-020), compilación aparte `dist-e2e` con `VITE_ENABLE_DEMO=true` (la demo y el reloj de E2E **no** existen en `dist`).
- Codex no ejecuta npm **ni puede ejecutar vitest**: cada entrega se verifica ejecutando `npm run check` (ha habido fallos que solo así aparecen: índice de IndexedDB, expectativas de KaTeX, tipos de markdown-it, BOM). Los archivos de Codex a veces llevan BOM: lo vigila `src/repo-hygiene.test.ts`.
- Tras publicar, cualquier cambio de tablas/índices exige versión nueva y migración con copia previa.
- Sin `git push` hasta M9 y autorización de Juan.

## Fallos abiertos
Ninguno conocido.

## Pendientes de Juan
Ver `docs/PENDIENTE-JUAN.md` y `docs/QUESTIONS.md`.
