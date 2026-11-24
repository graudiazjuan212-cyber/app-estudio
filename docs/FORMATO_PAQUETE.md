# Formato de paquete `estudio-pack/1`

Guía para el proyecto Universidad (Claude en claude.ai): cómo escribir un archivo de preguntas que la app de estudio acepte. **Un archivo = un capítulo de una asignatura.** El esquema técnico exacto está en `docs/estudio-pack-1.schema.json`; esta guía explica el sentido de cada cosa y los errores típicos.

## 1. Estructura

```json
{
  "schema": "estudio-pack/1",
  "asignatura": { "id": "mat1", "nombre": "Matemáticas I" },
  "capitulo": { "id": "mat1-c02", "numero": 2, "titulo": "Geometría analítica: vectores y cónicas" },
  "version": 3,
  "generado": "2026-11-23",
  "bloques": [ { "id": "mat1-c02-b01", "titulo": "Norma y producto escalar", "peso": 1, "requiere": [], "items": [ ... ] } ]
}
```

- Todos los objetos son **estrictos**: un campo que no está en esta guía es un error (casi siempre es una errata, y la app sugiere el nombre correcto).
- `version`: entero ≥ 1. **Sube la versión cada vez que cambies el archivo** (ver §5).
- `generado`: fecha real `AAAA-MM-DD`.
- Un paquete tiene de 1 a 60 bloques; un bloque, de 1 a 200 ítems.

### Identificadores (`id`)
- Solo minúsculas, números, `-` y `_`; empiezan por letra o número; 1–80 caracteres. Ejemplo: `mat1-c02-b03-i05`.
- **Son estables y únicos**: el progreso de Juan se cuelga de ellos. No reutilices un id para otra pregunta ni lo cambies al reescribir un enunciado.
- Convención recomendada: `<asignatura>-c<cap>-b<bloque>-i<ítem>`.
- Ningún id de ítem puede coincidir con un id de bloque, de capítulo o de asignatura.

### Bloques
- `peso`: **1** (básico), **3** (intermedio) o **5** (tipo examen). El porcentaje del capítulo pondera por peso.
- `requiere`: ids de bloques **del mismo paquete** que deben estar dominados antes de empezar este. Sin ciclos, sin autoreferencia. Para el primer bloque, `[]`.
- Un bloque debería tener al menos una pregunta evaluable (solo `info` genera un aviso).

## 2. Tipos de ítem

Campos comunes (opcionales): `etiquetas` (hasta 10 textos), `fuente` (≤ 200), `relaciona: true` (la pregunta conecta con otros capítulos; no válido en `info`), `explicacion` (Markdown + LaTeX; se muestra tras responder; no existe en `info`).
Todo texto admite **Markdown**, fórmulas `$...$` / `$$...$$` y bloques de código. Ningún texto puede estar vacío ni superar 4000 caracteres (el `cuerpo` de `info`: 8000).
La app **baraja** las opciones: no pongas la correcta siempre en primer lugar ni la señales con «(correcta)».

| `tipo` | Campos | Reglas |
|---|---|---|
| `info` | `titulo`, `cuerpo` | Tarjeta informativa, no evalúa. |
| `flashcard` | `anverso`, `reverso` | Juan se autoevalúa. |
| `test` | `enunciado`, `opciones[{texto, correcta, feedback?}]` | 3–5 opciones, **exactamente 1** correcta, textos distintos. |
| `multi` | `enunciado`, `opciones[…]` | 3–6 opciones, ≥ 1 correcta y ≥ 1 incorrecta. Solo cuenta si marca **todas** las correctas y ninguna más. |
| `vf` | `enunciado`, `correcta: true/false`, `feedback?` | |
| `ordenar` | `enunciado`, `pasos[texto]` | 3–8 pasos **escritos en el orden correcto**; la app los baraja. |
| `emparejar` | `enunciado`, `pares[{izquierda, derecha}]` | 3–6 pares; sin textos repetidos en un mismo lado. |
| `huecos` | `enunciado` con `{{1}}`, `{{2}}`…, `huecos[{n, opciones[…]}]` | Marcadores desde 1 sin saltos, cada uno una sola vez y con su hueco; 1–6 huecos; cada hueco 2–5 opciones con **exactamente 1** correcta. |
| `error` | `enunciado`, `pasos[{texto, incorrecto}]`, `correccion?` | 3–8 pasos, **exactamente 1** con `incorrecto: true`. |

`feedback` en una opción incorrecta = explicación del **error típico** que lleva a elegirla («Has sumado componentes: la norma es la raíz de la suma de cuadrados»). Es lo más valioso de un distractor: úsalo siempre que haya un error típico.

### Ejemplos mínimos
```json
{ "id": "x-b01-i01", "tipo": "info", "titulo": "Norma", "cuerpo": "$\\|v\\| = \\sqrt{v_1^2+v_2^2}$" }
{ "id": "x-b01-i02", "tipo": "flashcard", "anverso": "¿Qué es un vector unitario?", "reverso": "Un vector de norma 1." }
{ "id": "x-b01-i03", "tipo": "test", "enunciado": "Norma de $v=(6,8)$", "opciones": [
    { "texto": "$10$", "correcta": true },
    { "texto": "$14$", "correcta": false, "feedback": "Has sumado componentes." },
    { "texto": "$100$", "correcta": false, "feedback": "Falta la raíz." } ] }
{ "id": "x-b01-i04", "tipo": "vf", "enunciado": "$\\|u+v\\| = \\|u\\|+\\|v\\|$ siempre.", "correcta": false, "explicacion": "Solo si son paralelos del mismo sentido." }
{ "id": "x-b01-i05", "tipo": "ordenar", "enunciado": "Ordena los pasos de la descomposición LU", "pasos": ["Eliminar bajo el pivote", "Guardar los multiplicadores en L", "Repetir con la siguiente columna"] }
{ "id": "x-b01-i06", "tipo": "emparejar", "enunciado": "Une cada cónica con su ecuación", "pares": [
    { "izquierda": "Circunferencia", "derecha": "$x^2+y^2=r^2$" },
    { "izquierda": "Elipse", "derecha": "$x^2/a^2+y^2/b^2=1$" },
    { "izquierda": "Parábola", "derecha": "$y=ax^2$" } ] }
{ "id": "x-b01-i07", "tipo": "huecos", "enunciado": "{{1}} FROM tabla WHERE {{2}} > 3", "huecos": [
    { "n": 1, "opciones": [ { "texto": "SELECT *", "correcta": true }, { "texto": "GET *", "correcta": false } ] },
    { "n": 2, "opciones": [ { "texto": "edad", "correcta": true }, { "texto": "edad,", "correcta": false } ] } ] }
{ "id": "x-b01-i08", "tipo": "error", "enunciado": "Resolución de $2x+4=10$. ¿Qué paso es incorrecto?", "pasos": [
    { "texto": "$2x = 10-4$", "incorrecto": false },
    { "texto": "$2x = 14$", "incorrecto": true },
    { "texto": "$x = 7$", "incorrecto": false } ], "correccion": "$2x=6$, luego $x=3$." }
```
(`multi` es como `test` pero con varias `correcta: true`.)

## 3. Fórmulas y código
- Fórmula en línea `$...$`, en bloque `$$...$$`. En JSON hay que **duplicar la barra invertida**: `"$\\frac{a}{b}$"`.
- Un dólar que no es fórmula (precios) se escribe `\\$` en JSON (`\$` para la app). Un `$` sin cerrar es un error.
- Las fórmulas se comprueban al importar: una fórmula que KaTeX no entiende rechaza el paquete e indica dónde.
- Código: bloques con tres acentos graves y lenguaje (` ```python `, ` ```sql `). Se muestra monoespaciado y con sangría; **sin colores** en v1. El contenido del código no se interpreta como fórmula.
- HTML en los textos se muestra como texto, no se ejecuta.

## 4. Cómo calcula la app el progreso (para que las preguntas encajen)
- *Pregunta evaluable* = todo menos `info`. Las `flashcard` cuentan (Otra vez = fallo; Difícil/Bien/Fácil = acierto).
- **Día válido de un bloque**: ese día, la **primera respuesta del día** a cada pregunta evaluable acierta en **≥ 80 % de las preguntas evaluables del bloque** (no solo de las respondidas) y no hay ningún «No lo sé» ni fallo con confianza «Seguro» en el bloque ese día.
- **Dominado** = 2 días válidos distintos. **En curso** = hay intentos y no está dominado. **Pendiente** = sin intentos. **Graduado** = dominado y 3 repasos posteriores (días distintos) con todo acertado con «Seguro».
- Un fallo en un bloque dominado lo devuelve a «en curso» (y reinicia los días válidos).
- **% del capítulo** = suma de pesos de bloques dominados o graduados / suma de pesos de todos los bloques.
- El «día de estudio» cambia a las 04:00.
- Por eso conviene que cada bloque tenga **al menos 5 preguntas evaluables** (con 3, un solo fallo ya baja del 80 %) y que no sea enorme (un bloque de 60 preguntas es muy duro de dominar).

Consejos de calidad: opciones de longitud parecida, sin pistas gramaticales; distractores basados en errores reales; empezar cada bloque con 1–2 `info`; dificultad creciente dentro del bloque (la app respeta el orden del archivo).

## 5. Versiones y progreso
- Al importar una **versión mayor** del mismo capítulo, el progreso de los ítems cuyo `id` se mantiene **se conserva**. Los ids nuevos entran como nuevos. Los ids que ya no están se **archivan** (no se borra su historial; vuelven si reaparecen).
- Misma versión → «ya importado». Versión menor → la app avisa y pide confirmación.
- Si conservas el `id` pero **cambias el `tipo`** (p. ej. de `test` a `multi`), la app lo trata como pregunta nueva (el historial anterior se archiva). Si solo corriges texto, mantén tipo e id.
- Mover una pregunta de bloque es seguro: su repaso la sigue, y el dominio de los bloques se recalcula con su contenido actual.
- Dentro de una asignatura nunca reutilices un id en otro capítulo (la app lo rechaza).

## 6. Errores típicos
| Mensaje de la app (resumen) | Causa |
|---|---|
| «El archivo no es un JSON válido» | Coma final, comillas, barra sin duplicar. |
| «Campo desconocido `enunciadoo`; ¿querías decir `enunciado`?» | Errata. |
| «el test debe tener exactamente 1 opción correcta» | 0 o 2+ opciones con `correcta: true`. |
| «`requiere` apunta a un bloque que no existe / hay un ciclo» | Id mal escrito o dependencia circular. |
| «id duplicado» | Dos ítems con el mismo id. |
| «`$` sin cerrar» / «fórmula no válida» | `$` suelto (usa `\\$`) o LaTeX incorrecto. |
| «marcador `{{3}}` sin hueco» | `huecos` no coincide con los marcadores del enunciado. |
| «`peso` debe ser 1, 3 o 5» | Peso no permitido. |

La app muestra **todos** los errores a la vez (hasta 50), con el bloque y el número de pregunta.

## 7. Exportación de progreso `estudio-progreso/1`

Juan pulsa «Exportar progreso para Claude» en una asignatura y sube el archivo `progreso_<asignatura>_<AAAA-MM-DD>.json` al proyecto de esa asignatura. Contiene **solo** esa asignatura. El esquema técnico está en `docs/estudio-progreso-1.schema.json`. Ejemplo completo (el mismo que usan los tests): `tests/fixtures/progress/expected-ejmat-2026-12-02.json`.

```json
{
  "schema": "estudio-progreso/1",
  "exportado": "2026-12-02T21:10:00+01:00",
  "asignatura": "ejmat",
  "sesiones": [ { "fecha": "2026-11-24", "minutos": 2.3, "preguntas": 4, "aciertos": 4, "tipo": "estudio" } ],
  "capitulos": [ { "id": "ejmat-c01", "numero": 1, "titulo": "Vectores en el plano", "porcentaje": 11,
    "bloques": [ { "id": "mat-b1", "titulo": "Componentes y norma", "peso": 1, "estado": "dominado", "bloqueado": false,
      "dias_dominio": ["2026-11-24", "2026-11-27"], "proximo_repaso": "2026-12-11" } ] } ],
  "puntos_ciegos": [ { "item": "mat-i8", "enunciado_corto": "La suma de (1,2) y (3,4) es (___,___).", "fecha": "2026-11-28" } ],
  "fallos_recurrentes": [ { "item": "mat-i8", "enunciado_corto": "La suma de (1,2) y (3,4) es (___,___).", "fallos": 2 } ]
}
```

| Campo | Qué significa |
|---|---|
| `exportado` | Momento de la exportación, en la hora local de Juan con su desfase (`+01:00` en invierno, `+02:00` en verano). |
| `sesiones` | Las **últimas 60 sesiones terminadas** (de más antigua a más reciente). `fecha` = día de estudio (el día cambia a las 04:00), `minutos` = tiempo total con un decimal, `preguntas`/`aciertos` = solo preguntas evaluables (no cuentan las tarjetas `info`), `tipo` = `estudio`, `repaso` (repasar capítulo) o `examen` (mini examen). |
| `capitulos[].porcentaje` | % del capítulo: suma de pesos de bloques **dominados o graduados** / suma de pesos de todos los bloques con preguntas (redondeado hacia abajo). Es duro a propósito. |
| `bloques[].estado` | `pendiente`, `en_curso`, `dominado` o `graduado` (definiciones en §4). `bloqueado: true` = depende de un bloque que aún no está dominado y todavía no se ha empezado. |
| `bloques[].dias_dominio` | Los días de estudio que cuentan como «día válido» del bloque (hacen falta 2 para dominarlo). Vacío si el bloque perdió el dominio por un fallo posterior. |
| `bloques[].proximo_repaso` | La fecha más cercana en que vence el repaso de alguna pregunta del bloque (`null` si aún no hay ninguna programada). |
| `puntos_ciegos` | Preguntas que Juan **falló estando seguro** y aún no ha resuelto (se resuelven acertando con «Bastante» o «Seguro» en un día posterior). `enunciado_corto` = primeros 80 caracteres del enunciado (los huecos `{{n}}` salen como `___`). Son lo primero que conviene repasar con él. |
| `fallos_recurrentes` | Preguntas con **2 o más fallos** en los últimos **30 días de estudio** (incluye «No lo sé»), de más a menos fallos. |

Cómo usarlo desde el proyecto de la asignatura: priorizar los `puntos_ciegos`, reforzar los bloques `en_curso` y los `fallos_recurrentes`, no generar contenido nuevo de un capítulo cuyo `porcentaje` sea bajo sin antes consolidar sus bloques, y generar el siguiente paquete **subiendo `version`** (§5) para no perder el progreso. Los ids de pregunta (`item`) son los de tu paquete.
