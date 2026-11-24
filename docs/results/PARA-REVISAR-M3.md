# PARA REVISAR — M3 (autoauditoría)

a) **¿Qué queda a medias?** Nada de la capa de datos. Falta que la UI (M5) la use y que se vea el recordatorio de copia y el estado de persistencia. La petición `persist()` en el primer uso queda para M7.

b) **¿Qué pasa con una entrada inválida o ausente?**
   - Paquete inválido, de otra asignatura con ids repetidos, o con el mismo número de versión y otro contenido ⇒ `rejected` sin escribir (cubierto en tests con volcado completo antes/después).
   - Copia corrupta, de otra app, de una versión de BD o de planificador futura/antigua, o con relaciones incoherentes ⇒ `rejected` y la BD queda idéntica (incluidos `snapshots`). 
   - IndexedDB no disponible ⇒ `unavailable` (la UI debe mostrarlo, M5-1).
   - `recordAttempt` con intento inválido, ítem inexistente o de otra generación ⇒ **rechaza la promesa** y no guarda nada.

c) **¿Qué podría romperse en otra parte?**
   - **Cualquier cambio de índices o tablas desde ahora exige `version` nueva y migración** (hasta hoy se editó v1 sin datos desplegados).
   - Cambiar `itemGen`, `lastAttemptId` o el formato de `Attempt` obliga a revisar la restauración (integridad) y `rebuildCache`.
   - Una copia hecha con una versión de `dbVersion` menor necesita una función en `backupMigrations.ts` (hoy la lista es vacía).
   - `recordAttempt` hace una transacción amplia (6 tablas): en un móvil lento con muchos intentos podría notarse; medir en M8.
   - Las cachés guardan `provisional`; al cambiar de día solo se refresca cuando se escribe en ese bloque (las vistas de M5 deben derivar el estado «de hoy» o llamar a `rebuildCache` al abrir si cambió el día).

d) **Riesgos asumidos:** ADR-024 (carrera de pestañas durante la copia previa; solo afecta a la copia de recuperación, no a la BD).

e) **Calidad de los tests:** los de importación comparan volcados completos de todas las tablas antes y después; los de copias parten de una copia válida modificada en **un solo detalle** (cada rechazo se atribuye a una causa); los de rendimiento son tolerantes (no deterministas) y avisan por consola si superan el objetivo.
