# PARA-REVISAR M9 — autoauditoría

a) **¿Qué queda a medias?** Medir el rendimiento en un Android real (solo hay estimación ×3–5), probar en iPhone/Safari (WebKit no se instala aquí) y la prueba manual de Juan (`docs/PRUEBA_MOVIL.md`). La revisión visual se hizo sobre capturas de Chrome en perfil Pixel 7, no sobre un móvil.

b) **¿Qué pasa con una entrada inválida o ausente?** `submitAnswer` rechaza sin escribir una huella ausente o mal formada y una sesión/pregunta que no corresponde. Si falta el índice `metadataKey` de alguna pregunta, las vistas fallan con «Reconstruye la caché antes de continuar» en vez de mostrar datos erróneos; `rebuildCache` lo repara sin tocar preguntas ni intentos. Una base v1 antigua sin el índice se copia (`-premigration-v1`) antes de rellenarlo.

c) **¿Qué podría romperse en otra parte?**
1. `startStudySession` ahora usa las cachés `itemState`/`blockState` (solo reconstruye si falta algún bloque). Si una caché quedara desfasada de los intentos, la sesión se armaría con datos viejos; el riesgo está acotado por `rebuildCache` y por las pruebas de coherencia de M3-3, pero no hay una comprobación automática en cada arranque.
2. El índice `metadataKey` duplica metadatos: cualquier campo nuevo de `ItemRow` que importe para las vistas debe añadirse a `itemMetadataKey`. **Tras la primera publicación, cualquier cambio de tablas o índices exige versión nueva y migración con copia previa (ADR-013, ADR-024).**
3. Los hooks de Dexie mantienen el índice; una escritura hecha con otra librería o con la base abierta por código antiguo lo dejaría sin rellenar (se detecta al leer).
4. Si se cambian los textos de aviso de `SessionScreen`, hay que actualizar el README (sección 6) y los E2E.

d) **Hallazgos de la revisión adversarial:** los 3 altos de M4–M7 están corregidos y probados. No se ha repasado de nuevo con `adversarial-review` el código de M9-3 (solo rendimiento, con equivalencia probada); si se quiere, lanzarla con `--base c2598ce`.
