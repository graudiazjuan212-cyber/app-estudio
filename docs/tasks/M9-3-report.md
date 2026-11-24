# M9-3: entrega pendiente de verificación

## Cambios

- Inicio: consulta indexada del día, count de intentos, claves únicas para racha, último intento por asignatura. Corte calculado una vez.
- Inicio y Asignatura: catálogo de metadatos por claves del índice, sin clonar items.data ni llamar a loadCatalog. Se mantienen porcentajes y reglas originales, incluidos los bloques archivados en los porcentajes.
- Catálogo de sesión y respuesta: también usa metadatos; bloques/capítulos consultados por subjectId. El arranque reutiliza itemState/blockState, conserva el historial de la asignatura para calibración, vistos y puntos ciegos, y reconstruye si falta algún bloque de caché.
- submitAnswer conserva fingerprint y duplicados sesión+ítem de M9-2.
- Copias: metadataKey se excluye explícitamente; se deriva al escribir/importar/restaurar y en rebuildCache. No cambia estudio-backup/1 ni estudio-pack/1.

## Decisión 3.3 y desviación

Se implementa una variante de **(a)**: un índice nuevo, metadataKey, con subjectId, order, id, blockId, tipo, itemGen y booleanos codificados como números. Los índices existentes no cubren tipo/archivado y los booleanos no son claves válidas de IndexedDB. No se añade evaluables a blocks (E3 no aplica). Las consultas leen claves pequeñas, no el contenido JSON. Los hooks actualizan la clave dentro de la escritura original, incluso en actualizaciones directas.

**Desviación explícita:** (a) pedía índices existentes. La variante añade uno para cumplir la lectura sin data y conservar el formato de copia. No ha habido comparación cronometrada entre (a) y (b): la prohibición de ejecutar herramientas de pruebas impide decidir con medición en esta entrega.

Se aprovecha el estado previo a publicación para extender v1. Para bases v1 existentes se guarda copia previa antes del parche aditivo de Dexie y se derivan las claves. Se reconoce exclusivamente el incremento nativo conocido de ese parche al reabrir. Tras la primera publicación, cualquier extensión de esquema debe tener una versión nueva y su migración. Si faltan claves, la lectura rechaza con mensaje claro en vez de mostrar contadores incompletos; rebuildCache las regenera. Si falla la copia previa, la apertura no modifica el esquema anterior.

## Archivos

Modificados:
- src/config.ts
- src/data/backupData.ts
- src/data/cache.ts
- src/data/catalog.ts
- src/data/db.ts
- src/data/open.ts
- src/data/schema.ts
- src/data/study.ts
- src/data/views.ts
- src/domain/study/index.ts
- src/domain/study/scheduler.ts
- src/domain/study/session.ts (solo uso del helper de vencimiento)

Creados:
- src/data/itemMetadata.ts
- src/data/itemMetadata.test.ts
- src/data/itemMetadata-upgrade.test.ts
- src/data/study-performance.test.ts
- src/data/views-performance.test.ts
- src/domain/study/dueBefore.test.ts
- tests/fixtures/data/performanceViews.ts
- tests/fixtures/data/referenceViews.ts (vistas y lector originales congelados)
- tests/fixtures/study/dueBefore.ts
- docs/tasks/M9-3-report.md

## Tests nuevos

32 casos Vitest tras expandir it.each:
- views-performance.test.ts: 6 (5 estados y presupuesto de lecturas).
- dueBefore.test.ts: 11 (10 vencimientos y rechazo de fechas/corte inválidos).
- itemMetadata.test.ts: 8 (importación, v2, actualización, reconstrucción, copia/restauración, borrado de prueba, claves ausentes y rechazo de importación).
- study-performance.test.ts: 5 (4 equivalencias de plan/porcentajes sin replay y respaldo con caché incompleta).
- itemMetadata-upgrade.test.ts: 2 (extensión con copia/reapertura y rechazo si falla la copia).

0 E2E nuevos. e2e/performance.spec.ts y los presupuestos/tolerancias permanecen intactos; ya cubren toda la cadena e imprimen tiempos. Ningún test nuevo requiere red.

## Tiempos y pendientes

No se han ejecutado npm, Vitest, check ni E2E. No hay tiempos reales nuevos. Espero que quitar miles de cálculos Intl y las lecturas de data permita Inicio/Asignatura por debajo de 1,5 s, y que evitar replay FSRS permita sesión por debajo de 1,5 s; respuesta objetivo 0,5 s. Son expectativas pendientes de medición, no resultados.

Exportar copia mantiene objetivo 10 s, progreso 3 s. Progreso aún reconstruye el historial de la asignatura; no se altera esa validación sin evidencia temporal. El E2E debe confirmar su coste y el de recalcular el bloque al responder. La primera apertura de una v1 antigua tiene coste adicional de copia e indexación fuera de las vistas.

M9-3 queda pendiente de check, todos los E2E y tiempos reales de Claude. Si progreso o respuesta exceden presupuesto, mantener la tarea abierta y analizar el replay de exportación o el historial del bloque, respectivamente. Riesgos principales: hooks del índice en escrituras futuras, compatibilidad de la extensión v1 previa a publicación, y coherencia de cachés (se mantiene la reconstrucción de respaldo para bloques ausentes). No se han hecho commits ni instalado dependencias.
