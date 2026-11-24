# Casos inválidos

- 01-json.json: El archivo no es un JSON válido.
- 02-schema.json: ruta `schema`, «Valor no permitido».
- 03-capitulo.json: Falta el campo `capitulo`.
- 04-peso.json: `peso` debe ser 1, 3 o 5.
- 05-id-duplicado.json: Id de ítem duplicado o reservado.
- 06-requiere.json: no existe en este paquete.
- 07-ciclo.json: mat-b1 → mat-b3 → mat-b2 → mat-b1.
- 08-dos-correctas.json: exactamente 1 opción correcta y tiene 2.
- 09-cero-correctas.json: exactamente 1 opción correcta y tiene 0.
- 10-marcador.json: Los marcadores deben empezar en 1.
- 11-latex.json: LaTeX inválido.
- 12-errata.json: ¿querías decir `enunciado`?.
- 13-pasos.json: como mínimo 3.
- 14-error.json: exactamente 1 paso incorrecto.
- 15-dolar.json: `$` sin cerrar.
- 16-fecha.json: fecha real válida.
- 17-derecha.json: Los textos de derecha deben ser distintos.
- 18-info-relaciona.json: Campo desconocido `relaciona`.
