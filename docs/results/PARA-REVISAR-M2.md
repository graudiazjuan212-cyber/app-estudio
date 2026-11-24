# PARA REVISAR — M2 (autoauditoría)

a) **¿Qué queda a medias?** Nada del dominio. Faltan los consumidores: M3 persiste `ItemState`/`BlockState`; M5 usa `buildSession`/`buildChapterExam`.

b) **¿Qué pasa con una entrada inválida o ausente?** `grade` devuelve `ok:false` ante una respuesta malformada (nunca `correct:true`). `rebuildFromAttempts` no lanza: intentos inválidos, de ítems ausentes, de otra generación o con `attemptId` repetido van a `skipped` con motivo. **Pero `estimateSeconds` y `secondsStudiedToday` lanzan** si algún intento tiene `durationMs` inválido, y `buildSession` lanza con `minutes ≤ 0` o `seed` no entero. La capa de datos garantiza (validación al guardar y al restaurar) que no hay intentos así; si algún día la UI recibiera datos sin validar, «Estudiar» fallaría. M5 debe capturar el error y mostrar un mensaje, nunca una pantalla en blanco.

c) **¿Qué podría romperse en otra parte?**
   - `ItemState` exige `lastAttemptId`: una caché guardada sin él pide reconstrucción (M3 debe llamar a `rebuildCache` cuando `needsRebuild`).
   - `CatalogItem.relaciona` es obligatorio (`loadCatalog` de M3 debe rellenarlo).
   - Subir `ts-fsrs` o cambiar de modelo cambia los vencimientos: migración deliberada con `schedulerVersion` (ADR-002).
   - `isDue` compara con el corte de las 04:00 de la zona **actual**: viajar cambia qué es «hoy» sin reinterpretar el pasado (ADR-008).
   - El rendimiento medido en test es tolerante (< 200 ms); en un Android medio puede ser 3–5 veces más lento. Sigue siendo imperceptible, pero conviene comprobarlo en el móvil (M8).

d) **Criterios que he tomado** (ADR-023): el día del fallo tras dominio no cuenta; los bloques sin evaluables quedan fuera del %; la sesión garantiza al menos un ítem.

e) **Calidad de los tests:** tablas hechas a mano antes de implementar; los casos de FSRS fijan valores de la librería (caracterización) para detectar cambios de versión.
