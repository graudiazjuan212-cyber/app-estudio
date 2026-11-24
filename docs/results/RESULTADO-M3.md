# RESULTADO M3 — Almacenamiento, importación persistente y copias

Estado: **cerrado** (commits `abdd722` M3-1, `dc3d990` M3-2, `11824bc` M3-3). Especificaciones: `docs/tasks/M3-1…M3-3.md`.

## Qué se hizo (`src/data/`)
- **Base de datos** (Dexie 4.4.7): 12 tablas (`subjects`, `chapters`, `blocks`, `items`, `packs`, `attempts`, `itemState`, `blockState`, `sessions`, `settings`, `snapshots`, `meta`). `openStudyDb` con **copia previa automática** antes de migrar (BD aparte `<bd>-premigration-v<n>`, se conservan las 2 últimas), migración fallida ⇒ la BD queda en la versión anterior, `versionchange`/`blocked`/`VersionError`/«sin IndexedDB» devuelven un resultado, no lanzan (ADR-013).
- **`importPackText`** (ADR-011): validación M1 antes de escribir; **una transacción**; colisión de ids entre asignaturas rechazada; versión igual = «ya importado» (o rechazo si el contenido difiere), menor = confirmación; ítems nuevos / conservados / archivados / reaparecidos / con tipo cambiado (`itemGen + 1`, sin estado FSRS); cachés recalculadas dentro de la misma transacción.
- **`recordAttempt`** (ADR-003): idempotente por `attemptId`, atómico, incremental (solo el bloque afectado; recalcula los bloqueos con la caché; cae a recálculo completo si falta alguna fila); equivalente a `rebuildCache`.
- **Copias** (`estudio-backup/1`, ADR-012): exportación determinista (idéntica byte a byte), sin cachés, `snapshots` ni `meta`; restauración que **valida todo antes de tocar nada** (esquema, integridad referencial completa, paquetes válidos, versión de BD y de planificador), escribe en **una transacción** con snapshot previo (se conservan 3) y es reversible (`undoRestore`).
- Persistencia y espacio (`requestPersistence`, `storageStatus`, `canShareFile`), recordatorio de copia a 7 días, sesiones (`startSession`/`finishSession`/…).

## Verificaciones (ejecutadas por Claude)
| Tarea | Tests acumulados | Nuevos |
|---|---|---|
| M2 cerrado | 669 | — |
| M3-1 | 727 | +58 |
| M3-2 | 799 | +72 |
| (M4-1 intercalada) | 847 / 850 | +48 / +3 |
| M3-3 | **901** | +51 |
`npm run check` en verde tras cada tarea. Tests con `fake-indexeddb` y BD de nombre único por test; valores esperados escritos a mano (recuentos de la fixture: 3 bloques, 14 ítems; 2 asignaturas, 5 bloques, 24 ítems, 12 intentos).
- **Revisión adversarial** (Codex): 4 hallazgos. Corregidos en M3-3: (1) la restauración aceptaba relaciones incoherentes y paquetes ilegibles → validación referencial completa con 44 casos de rechazo que comprueban que **todas las tablas quedan idénticas**; (2) copias de un planificador futuro/antiguo → rechazo; (3) `recordAttempt` leía todo el historial → incremental (test con 20 000 intentos). **Asumido**: (4) carrera entre pestañas durante la copia previa a una migración (ADR-024).
- Fallo que Codex no pudo ver (no ejecuta tests): faltaba el índice `subjectId` en `blockState`; lo corregí yo (v1 sin datos desplegados, no requiere migración).

## Decisiones
ADR-024 (riesgo asumido de la copia previa). El esquema v1 se puede modificar mientras no haya datos desplegados; **desde la primera publicación cualquier cambio de tablas o índices exige versión nueva + migración con copia previa**.

## No hecho / diferido
- Pantallas y flujos sobre estos servicios: M5. Recordatorio visible y petición de persistencia en el primer uso: M5/M7.
- Si `recordAttempt` resultara lento en un Android real con muchos intentos, usar el catálogo opcional ya previsto (no se implementó por falta de medición).
