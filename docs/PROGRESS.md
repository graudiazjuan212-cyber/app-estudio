# PROGRESS

Arranque de sesión nueva: `CLAUDE.md` → este archivo → `docs/PLAN.md`.

## Estado por hito
| Hito | Estado | Último commit | Tests |
|---|---|---|---|
| M0 Andamiaje | **Cerrado** | `75c4de1` | 37 |
| M1 Paquetes | **Cerrado** | `42abbc6` | 252 |
| M2 Dominio | **Cerrado** | `f89cd6b` | 669 |
| M3 Almacenamiento | **Cerrado** | `11824bc` | 901 |
| M4 Render | **Cerrado** | `7fe50c9` | 963 + 24 E2E |
| M5 Pantallas y flujo | **Cerrado** | `d455e40` | 1180 + 44 E2E |
| M6 Exportación de progreso | **M6-1 delegada a Codex** (spec `docs/tasks/M6-1.md`, resultado esperado escrito a mano en `tests/fixtures/progress/`); M6-2 (botón + E2E) especificada | — | — |
| M7 Offline/PWA | Specs `M7-1`, `M7-2` listas; sin delegar | — | — |
| M8 README para Juan + prueba móvil | Sin escribir (lo escribo yo: `README.md` de Juan, `docs/PRUEBA_MOVIL.md`; el README de desarrollo pasa a `docs/DESARROLLO.md`) | — | — |
| M9 Pulido | Spec `M9-1` lista (instalar `@axe-core/playwright` como dev dependency y ADR-026 antes de delegar) | — | — |

## Siguiente paso exacto
1. Verificar la entrega de M6-1: `npm run check`; comparar la salida con `tests/fixtures/progress/expected-ejmat-2026-12-02.json`; leer diff; comitear. Lanzar `adversarial-review` de M6 (crítico) y corregir. Delegar M6-2 y verificar con `npm run e2e`.
2. M7-1 → M7-2 (E2E offline en frío y actualización real; WebKit solo si se puede instalar: la descarga de navegadores de Playwright se colgó en este equipo, ver ADR-020).
3. M8: escribir `README.md` para Juan (instalar en Android, importar, estudiar, exportar progreso, copia/restaurar, qué hacer si falla), `docs/PRUEBA_MOVIL.md`, mover el README actual a `docs/DESARROLLO.md`; revisar textos contra la UI real.
4. M9: `npm install -D @axe-core/playwright` (ADR-026), delegar `M9-1`, medir rendimiento, revisar capturas (`E2E_SCREENSHOTS=1`).
5. Cierre: `docs/results/RESULTADO-M6…M9.md` y `RESULTADO-FINAL.md` (URL y cómo instalar en Android), pregunta de publicación en `docs/QUESTIONS.md`. **No hacer `git push`** hasta que Juan autorice (workflow listo: `.github/workflows/deploy.yml`).

## Cómo trabajar (lecciones, ver `docs/diario-friccion.md`)
- Delegar con el agente `codex:codex-rescue` (`--write`, `--effort high` en lógica/datos, `medium` en pantallas). Codex **no puede ejecutar npm, vitest ni E2E**: cada entrega se verifica ejecutando `npm run check` y `npm run e2e` (casi siempre aparece algo: lint, tipos, E2E, BOM).
- Si Codex se detiene con una pregunta, decidir como director técnico y relanzar con la decisión (no preguntar a Juan).
- Revisión adversarial: `node ~/.claude/plugins/cache/openai-codex/codex/1.0.6/scripts/codex-companion.mjs adversarial-review --wait --base <commit> "foco"` en segundo plano con salida a `$TEMP`; corregir con una tarea nueva.
- Los archivos de Codex a veces llevan BOM; `src/repo-hygiene.test.ts` lo detecta (y los archivos > 300 líneas).
- Evitar `$$` en comandos de shell (la comprobación de seguridad de Claude Code los confunde con un borrado); usar la herramienta de edición.

## Decisiones cerradas (no se reabren)
- ADR-001…025 de `docs/DECISIONS.md`. Capa de datos `src/data/`. `ts-fsrs` 5.4.2 (FSRS-6).
- E2E con Chrome instalado (ADR-020), compilación aparte `dist-e2e` (`VITE_ENABLE_DEMO=true`): la demo y el reloj de E2E **no** existen en `dist`.
- Tras publicar, cualquier cambio de tablas/índices exige versión nueva y migración con copia previa.
- Sin `git push` hasta M9 y autorización de Juan.

## Fallos abiertos
Ninguno conocido.

## Pendientes de Juan
Ver `docs/PENDIENTE-JUAN.md` y `docs/QUESTIONS.md`.
