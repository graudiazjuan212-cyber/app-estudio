# PARA REVISAR — M1 (autoauditoría)

a) **¿Qué queda a medias?** Reglas que dependen de otros paquetes ya importados (ids únicos entre asignaturas, versión menor con confirmación) → M3. El JSON Schema no expresa las reglas semánticas (ADR-021); lo avisa en su `description`.

b) **¿Qué pasa con una entrada inválida o ausente?** `validatePack` nunca lanza: profundidad excesiva, ciclos, `BigInt`, funciones, `undefined`, getters que lanzan y propiedades heredadas dan `ok:false` con un error en español (cubierto en `robustness.test.ts`). Texto vacío o JSON malformado → «El archivo no es un JSON válido». Campos ausentes → «Falta el campo `x`».

c) **¿Qué podría romperse en otra parte?**
   - Quien llame a `validatePack` con objetos que contengan `undefined` explícito los verá rechazados (se normaliza como JSON): la importación real usa `validatePackText`, que parte de `JSON.parse`, así que no se ve afectada.
   - `src/domain/pack/review-fixtures.ts` y `test-helpers.ts` usan `node:fs` y viven en `src/` (solo se importan desde tests). Si algún día entran en el bundle, el build fallaría; vigilar.
   - Un paquete válido de hasta 60 bloques × 200 ítems se valida en < 1 s; fuera de ese rango se rechaza por tamaño.
   - Cambiar `Id` (regex) o los límites exige subir `schema` a `estudio-pack/2`.

d) **Calidad de los tests:** valores esperados escritos a mano en `expected` (paths y fragmentos de mensaje); límites 3/5 (test), 2/3 (ordenar), pesos 0/1/2/3/5. Los mensajes se comprueban con `toContain`, no con igualdad exacta (más robusto, menos estricto).

e) **Mensajes:** revisados a mano; los de longitud dicen «elementos» o «caracteres» según el campo.
