# PROGRESS

Arranque de sesión nueva: `CLAUDE.md` → este archivo → `docs/PLAN.md`.

## Estado por hito
| Hito | Estado | Último commit | Tests unitarios |
|---|---|---|---|
| M0 Andamiaje | **Cerrado** | `75c4de1` | 37 |
| M1 Paquetes | **Cerrado** | `42abbc6` | 252 |
| M2 Dominio | **Cerrado** | M2-4 | 669 |
| M3 Almacenamiento | Specs `M3-1`/`M3-2` listas (dexie 4.4.7 y fake-indexeddb instalados); sin delegar | — | — |
| M4 Render | Specs `M4-1`/`M4-2` listas (markdown-it instalado; E2E con `dist-e2e` y `VITE_ENABLE_DEMO`) | — | — |
| M5–M9 | Sin implementar (specs por escribir) | — | — |

## Siguiente paso exacto
1. Delegar `docs/tasks/M3-1.md` a Codex (agente `codex:codex-rescue`, `--write --effort high`), verificar (check, leer diff, contar tests) y comitear.
2. M3-2 igual; después `adversarial-review` de M3 con
   `node ~/.claude/plugins/cache/openai-codex/codex/1.0.6/scripts/codex-companion.mjs adversarial-review --wait --base <commit> "foco"` (en segundo plano, salida a un archivo en `$TEMP`).
3. Cerrar M3 (RESULTADO, PARA-REVISAR, ADR si procede). Después M4-1 y M4-2 (con E2E reales: `npm run e2e`).
4. Escribir las specs de M5–M9 (M5 usará `src/data` + `buildSession`; sin `dexie-react-hooks`; ver notas de M2 en `PARA-REVISAR-M2.md`).

## Decisiones cerradas (no se reabren)
- Todo lo de `docs/DECISIONS.md` (ADR-001…023). Capa de datos en `src/data/` (ADR-019).
- E2E con el Chrome instalado (`channel: 'chrome'`, ADR-020); la compilación de E2E va a `dist-e2e` con `VITE_ENABLE_DEMO=true` (la ruta `#/demo` no existe en `dist`).
- Codex no ejecuta npm; Claude instala, `check` y E2E. Codex no puede ejecutar vitest, así que cada entrega se verifica ejecutando.
- `ts-fsrs` 5.4.2 (FSRS-6); no usar 6.x (API obsoleta y FSRS-7 por defecto).
- Sin `git push` hasta M9 y autorización de Juan.

## Fallos abiertos
Ninguno conocido.

## Pendientes de Juan
Ver `docs/PENDIENTE-JUAN.md` y `docs/QUESTIONS.md`.
