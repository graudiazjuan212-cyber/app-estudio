# RESULTADO M2 — Dominio de estudio (FSRS, dominio, sesión)

Estado: **cerrado** (commits `67fd306` M2-1, `7f465f4` M2-2, `bd9b496` M2-3 y las correcciones de M2-4). Especificaciones: `docs/tasks/M2-1…M2-4.md`.

## Qué se hizo (`src/domain/study/`, todo puro y con el reloj inyectado)
- `time.ts`: `studyDay` (corte 04:00 de la hora local) y `nextCutoff`, correctos en los cambios de hora de marzo y octubre.
- `grade.ts`: corrección de los 7 tipos evaluables con respuestas por índice original; fallar cerrado ante respuestas malformadas.
- `scheduler.ts`: FSRS-6 (`ts-fsrs` 5.4.2, ADR-022), mapeo confianza → Hard/Good/Easy, orden total por (instante, `attemptId`), idempotencia.
- `mastery.ts`, `blindspots.ts`, `rebuild.ts`, `catalog.ts`: dominio de bloques (ADR-009, día provisional), % de capítulo, puntos ciegos, reconstrucción desde el registro.
- `session.ts`, `exam.ts`, `estimate.ts`, `random.ts`, `streak.ts`: constructor de sesión determinista, mini examen 2+1+1+1 con sustituciones, calibración por mediana, racha y objetivo diario.

## Verificaciones (ejecutadas por Claude)
| Tarea | Tests tras la tarea (acumulado) | Nuevos |
|---|---|---|
| M1 cerrado | 252 | — |
| M2-1 | 437 | +185 |
| M2-2 | 515 | +78 |
| M2-3 | 622 | +107 |
| M2-4 | **669** | +47 |

`npm run check` en verde tras cada tarea (tsc, eslint sin avisos, vitest, build).
- Valores esperados escritos a mano a partir de ADR-009 (tablas M01–M27, B01–B15, S01–S15, E01–E06) y de las tablas de `studyDay`/`nextCutoff`; FSRS fijado en `tests/fixtures/study/fsrs-golden.json` (5 vencimientos).
- Revisión adversarial (Codex): 3 hallazgos (empates de instante entre incremental y reconstrucción, `attemptId` duplicado en la reconstrucción, días imposibles) → corregidos en M2-4 con regresiones.
- Rendimiento: sesión de 5 min con 2000 ítems y 20 000 intentos < 200 ms en el test (objetivo < 50 ms); reconstrucción de 20 000 intentos < 1500 ms.

## Decisiones
ADR-022 (`ts-fsrs` 5.4.2) y ADR-023 (detalles de ADR-009 fijados en la implementación). El plan decía `src/db`; es `src/data` (ADR-019).

## No hecho / diferido
- Persistencia: M3. Sesiones y pantallas: M5.
- No se hizo una 3.ª pasada adversarial sobre M2-4 (cambios pequeños con regresiones propias); se revisará con la integración en M3.
