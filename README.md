# Estudio — tu app para estudiar en el móvil

Preguntas cortas para los ratos muertos (1, 5, 10, 15 o 30 minutos): la app sabe qué toca estudiar hoy, te repasa lo que estás a punto de olvidar y guarda todo en tu móvil. **No necesita internet** una vez instalada y **no envía tus datos a ningún sitio**.

> Dirección de la app: **https://graudiazjuan212-cyber.github.io/app-estudio/**

## 1. Instalarla en tu Android
1. Abre la dirección de arriba en **Chrome**.
2. Pulsa el menú **⋮** (arriba a la derecha) → **«Instalar aplicación»** (o «Añadir a pantalla de inicio»).
3. Ábrela desde el icono **Estudio** que aparece en tu pantalla.
4. En **Ajustes → «Proteger almacenamiento»** pulsa el botón: así Android no borra tus datos si le falta espacio.

Con la app instalada, funciona sin cobertura (modo avión incluido).

## 2. Cargar el contenido de una asignatura
El contenido lo prepara el proyecto de cada asignatura en Claude: te da un archivo **`.json`** por capítulo.
1. Guarda el archivo en tu móvil (Drive o Descargas).
2. En la app: **Ajustes → «Elegir archivo»** → selecciona el archivo → **«Importar»**.
   (También puedes pegar el texto del archivo en la caja «O pega el JSON aquí».)
3. Verás «Importado: …». Si algo está mal, la app te dice **qué y dónde**; copia ese mensaje y pásaselo al proyecto de la asignatura para que lo corrija. No se importa nada a medias.

**Versiones nuevas del mismo capítulo:** importa el archivo nuevo encima. Tu progreso en las preguntas que se mantienen **se conserva**; las preguntas nuevas entran como nuevas y las que desaparecen se guardan aparte (no se pierde su historial).

## 3. Estudiar
1. Antes de pulsar “Estudiar” puedes elegir cuántos minutos (1, 5, 10, 15 o 30); por defecto 10. En el **Inicio** pulsa **«Estudiar»** en la asignatura. La app elige las preguntas: primero las que fallaste estando seguro, luego los repasos que tocan y después lo nuevo.
2. En cada pregunta: elige tu respuesta → di **cuánta seguridad tienes** (Duda / Bastante seguro / Seguro) → **«Comprobar»**. Si no lo sabes, pulsa **«No lo sé»**. Verás si has acertado y por qué.
3. Puedes **salir** cuando quieras: lo que ya has respondido está guardado. Al volver, en el Inicio aparece **«Continuar»**.
4. Al terminar ves el **resumen**: aciertos, puntos ciegos nuevos, cómo avanzan los capítulos y tu racha.

**Cómo avanza el progreso.** Un bloque se considera **dominado** cuando en **dos días distintos** aciertas al menos el 80 % de sus preguntas sin «No lo sé» ni fallos estando muy seguro. El % del capítulo cuenta más los bloques difíciles. Un **punto ciego** es una pregunta que fallas estando seguro: es lo primero que se repasa.
En la asignatura tienes también **«Repasar capítulo»** y **«Mini examen»** (5 preguntas de varios capítulos; se aprueba con el 80 %).

En **Ajustes → Duración de la sesión por defecto** puedes elegir 1, 5, 10, 15 o 30 minutos. El selector al empezar solo cambia esa sesión. «Repasar capítulo» usa la duración de Ajustes y «Mini examen» no usa duración. El objetivo diario sigue siendo 5, 10 o 15 minutos.

## 4. Mandar tu progreso a Claude
En la pantalla de la asignatura pulsa **«Exportar progreso para Claude»**. Se abre la hoja de compartir de Android: guárdalo en **Drive** (o envíatelo) y súbelo al proyecto de esa asignatura. Así Claude sabe qué dominas, qué fallas y qué toca repasar. Esto **no** es una copia de seguridad.

También puedes pulsar **«Descargar progreso»** para guardarlo directamente en **Descargas** y subir ese archivo a Claude. Si al exportar no se puede abrir la hoja de compartir, el archivo se descarga automáticamente.

## 5. Copias de seguridad (importante)
Tus respuestas viven **solo en tu móvil**. Si lo cambias, desinstalas la app o borras los datos de Chrome, se pierden… salvo que tengas copia.
- **Hacer copia:** Ajustes → **«Exportar copia»** → guárdala en Drive. La app te recuerda hacerla si pasa una semana.
- **Descargar copia:** guarda el archivo `.json` directamente en la carpeta **Descargas** de tu móvil. Si «Exportar copia» no consigue abrir la hoja de compartir, también lo descarga automáticamente. Conserva ese archivo en un lugar seguro.
- **Restaurar:** Ajustes → **«Restaurar copia»** → elige el archivo → confirma. Antes de restaurar la app guarda tu estado actual: si te equivocas, **«Deshacer última restauración»**.

## 6. Si algo falla
| Qué ves | Qué hacer |
|---|---|
| «No se pudo abrir la hoja de compartir» | El archivo se ha descargado: búscalo en **Descargas**. |
| Un error al exportar o importar | Abre **«Detalle técnico»** y pulsa **«Copiar detalle»** para pasárselo a Claude Code. Si no se copia, selecciona el texto a mano. No incluye el contenido del archivo. |
| «Hay una versión nueva de la app» | Pulsa **«Actualizar»** cuando no estés en una sesión. Nunca se actualiza sola mientras estudias; si la actualizas desde otra pestaña, la sesión abierta no se recarga hasta que salgas de ella. |
| «La app se ha actualizado en otra ventana» | Pulsa **«Recargar»**. |
| «Cierra las demás pestañas de la app» | Cierra las otras pestañas o ventanas de Estudio y pulsa «Reintentar». |
| «Esta pregunta ya se respondió en otra ventana» | Tenías la misma sesión abierta en dos pestañas. Tu respuesta no se duplica: la app pasa a la siguiente. |
| «Esta pregunta ha cambiado en otra ventana» | Importaste una versión nueva mientras respondías. La app recarga la pregunta: respóndela de nuevo. |
| Un archivo no se importa | Lee el mensaje: dice la pregunta y el campo que fallan. Pásaselo al proyecto de la asignatura. |
| «No se ha podido guardar» al responder | Pulsa **«Reintentar»**: se guarda la misma respuesta (no se duplica). |
| Cambié de móvil | Instala la app, **Ajustes → Restaurar copia** con tu última copia. |
| Algo raro con los datos | **No borres nada.** Haz una copia (Exportar copia) y pásasela a Claude Code junto con una descripción. |

## 7. Privacidad
Todo se guarda en tu móvil. El código de la app es público pero **nunca** incluye tus preguntas ni tu progreso. Lo único que sale del móvil es lo que tú decides compartir (copia o progreso).

---
Para quien programa: `docs/DESARROLLO.md`. Formato de los archivos de contenido y de progreso: `docs/FORMATO_PAQUETE.md`.
