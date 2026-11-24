# PROGRESS

Arranque de sesión nueva: `CLAUDE.md` → este archivo → `docs/PLAN.md`.

## Estado por hito
| Hito | Estado | Último commit | Tests unitarios |
|---|---|---|---|
| M0 Andamiaje | **Cerrado** | `75c4de1` | 37 |
| M1 Paquetes | **Cerrado** | `42abbc6` | 252 |
| M2 Dominio | En curso: specs M2-1/2/3 listas; M2-1 delegada a Codex | — | — |
| M3–M9 | Sin implementar | — | — |

## Siguiente paso exacto
Verificar la entrega de M2-1 (`docs/tasks/M2-1.md`): `npm run check`, leer diff, comprobar los valores de las tablas → M2-2 → M2-3 → adversarial-review → cierre de M2 (escribir `RESULTADO-M2`, `PARA-REVISAR-M2`, ADR-022 con la regla «el día del fallo tras dominio no cuenta»). Después M3 (instalar `dexie`, `fake-indexeddb`).

## Decisiones cerradas (no se reabren)
- Todo lo de `docs/DECISIONS.md` (ADR-001…018). ADR-019: la capa de datos es `src/data/`.
- E2E con Chrome instalado (`channel: 'chrome'`); no se descarga Chromium.
- Codex no ejecuta npm; Claude instala, `check` y E2E.
- Sin `git push` hasta M9 y autorización de Juan.
- ADR-021 (JSON Schema orientativo). Fixtures de paquetes en `tests/fixtures/packs/`.

## Fallos abiertos
Ninguno conocido.

## Pendientes de Juan
Ver `docs/PENDIENTE-JUAN.md` y `docs/QUESTIONS.md`.
