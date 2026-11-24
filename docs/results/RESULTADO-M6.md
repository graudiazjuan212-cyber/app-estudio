# RESULTADO M6 — Exportación de progreso para Claude

Estado: **cerrado** (commits `2bcd0d9` M6-1, `6c5e554` M6-2, M6-3 correcciones). Especificaciones: `docs/tasks/M6-1…M6-3.md`. Formato documentado en `docs/FORMATO_PAQUETE.md` §7 y `docs/estudio-progreso-1.schema.json`.

## Qué se hizo
- `src/domain/progress/`: esquema zod `estudio-progreso/1`, `buildProgressExport` pura (reconstruye el estado desde los intentos, no usa cachés salvo `proximo_repaso`), `formatIsoWithOffset`, `shortText`, `progressFileName`, `progressMetaFromPacks` (títulos y contenido explícitos).
- `src/data/progressExport.ts`: `exportProgress` (ok / empty / error; no escribe en la BD).
- UI: botón «Exportar progreso para Claude» en la asignatura y sección en Ajustes (hoja de compartir de Android o descarga; no marca copia hecha).

## Verificaciones (ejecutadas por Claude)
- Tests unitarios: 1180 → 1218 (M6-1, +38) → 1223 (M6-2, +5) → **1232** (M6-3, +9). E2E: 44 → **51** (+7).
- El resultado del escenario fijo coincide con `tests/fixtures/progress/expected-ejmat-2026-12-02.json`, **escrito a mano antes de implementar** (incluidos vencimientos FSRS fijados con `ts-fsrs` 5.4.2).
- **Revisión adversarial** (Codex): 2 hallazgos medios, corregidos en M6-3: (1) intentos duplicados inflaban sesiones y fallos recurrentes → deduplicación por `attemptId` (conflictivos ⇒ error); (2) el exportador dependía de propiedades ocultas del catálogo → contrato `meta` explícito con constructor público.
- Corrección mía: la fecha de sesión usa el `studyDay` guardado (ADR-008).
- Fallos de test que solo se vieron al ejecutar: `addInitScript` no se aplica en navegación por hash (hubo que recargar); comparar texto con un JSON escrito a mano a mano falla por espacios (comparar datos).

## No hecho / diferido
Nada pendiente de M6.
