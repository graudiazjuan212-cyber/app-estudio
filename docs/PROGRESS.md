# PROGRESS

Arranque de sesión nueva: `CLAUDE.md` → este archivo → `docs/PLAN.md`.

## Estado por hito
| Hito | Estado | Último commit | Tests unitarios |
|---|---|---|---|
| M0 Andamiaje | **Cerrado** | `75c4de1` | 37 |
| M1 Paquetes | Sin implementar (spec `docs/tasks/M1-1.md` lista) | — | — |
| M2–M9 | Sin implementar | — | — |

## Siguiente paso exacto
M1-1: instalar `zod@4` y `katex` (exactas, Claude) → delegar `docs/tasks/M1-1.md` a Codex (`--effort high`) → verificar → `/codex:adversarial-review`.

## Decisiones cerradas (no se reabren)
- Todo lo de `docs/DECISIONS.md` (ADR-001…018). ADR-019: la capa de datos es `src/data/`.
- E2E con Chrome instalado (`channel: 'chrome'`); no se descarga Chromium.
- Codex no ejecuta npm; Claude instala, `check` y E2E.
- Sin `git push` hasta M9 y autorización de Juan.

## Fallos abiertos
Ninguno conocido.

## Pendientes de Juan
Ver `docs/PENDIENTE-JUAN.md` y `docs/QUESTIONS.md`.
