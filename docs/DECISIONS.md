# DECISIONS — Registro de decisiones (ADR cortos)

Criterio (BRIEF §10): 1) no perder datos · 2) offline en el móvil · 3) simplicidad · 4) normas de estudio · 5) estética.
Cada dependencia nueva se justifica aquí (CLAUDE.md, regla 8).

---

## ADR-001 · Pila base: la del BRIEF, con recortes
- **Contexto:** BRIEF §4 propone Vite + React + TS + Dexie + zod + ts-fsrs + KaTeX + resaltado de código + vite-plugin-pwa + Vitest + Playwright.
- **Decisión:** se mantiene, con estos cambios: estilos con **CSS Modules** (vienen con Vite, 0 dependencias); **sin resaltado de color** de código en v1 (ADR-006); Markdown con **markdown-it** (ADR-005); **zod v4** para generar el JSON Schema con `z.toJSONSchema()` (sin librería extra).
- **Alternativas:** Tailwind (otra herramienta y otra sintaxis que revisar), Shiki (pesado), Prism (pequeño, pero innecesario para v1).
- **Consecuencias:** dependencias de ejecución: `react`, `react-dom`, `dexie`, `dexie-react-hooks`, `zod`, `ts-fsrs`, `katex`, `markdown-it`. De desarrollo: `vite`, `@vitejs/plugin-react`, `typescript`, `vite-plugin-pwa`, `vitest`, `fake-indexeddb`, `@playwright/test`, `eslint`, `typescript-eslint`, `eslint-plugin-react-hooks`, tipos (`@types/*`). Nada más sin un ADR nuevo.

## ADR-002 · Registro de respuestas inmutable como fuente de verdad
- **Contexto:** prioridad n.º 1 es no perder datos. El estado FSRS, el dominio de bloques y los % son *derivados*; si una versión de la app tiene un fallo de cálculo, no debe corromper nada irrecuperable.
- **Decisión:** cada respuesta se guarda como un **intento** (`attempts`, solo se añade, nunca se edita) con: `attemptId` (UUID creado al mostrar la pregunta, ADR-003), `itemId`, `itemGen` (generación del ítem, ver abajo), `blockId` y `chapterId` en ese momento, instante ISO, `studyDay` y zona IANA (ADR-008), resultado, confianza, «No lo sé», respuesta dada, duración, id de sesión, versión del paquete y `schedulerVersion`. El estado FSRS por ítem y el estado de cada bloque se guardan como **caché recalculable**: una función pura `rebuildFromAttempts()` lo reconstruye todo reproduciendo el registro. La copia de seguridad incluye el registro.
- **Entradas de la reconstrucción (revisión adversarial):**
  - Se conservan **todas las versiones** importadas de cada paquete (no solo la última).
  - *Generación de ítem:* `itemGen` empieza en 1 y sube cuando un ítem conserva el `id` pero cambia de `tipo`. FSRS solo usa intentos de la generación actual; los anteriores quedan en el historial.
  - *Ítem que cambia de bloque:* su FSRS le sigue; para el dominio de bloque cuentan los intentos de los ítems que **ahora** forman el bloque (el dominio se recalcula al importar). Así un bloque reestructurado se evalúa con su contenido actual.
  - *Planificador versionado:* parámetros FSRS fijos en una constante, `ts-fsrs` con versión exacta (sin `^`), `schedulerVersion` guardado en `meta`. Cambiar algoritmo o parámetros = migración deliberada que sube `schedulerVersion` y recalcula la caché (los intentos no cambian nunca).
- **Alternativas:** guardar solo el estado actual (más simple, pero un fallo lo destruye sin vuelta atrás).
- **Consecuencias:** un poco más de almacenamiento (≈150 B/intento; 50.000 intentos ≈ 7,5 MB, aceptable). Permite corregir fallos de lógica recalculando. Tests: incremental = reconstrucción; reconstrucción tras cambio de tipo, tras mover ítems entre bloques y tras subir `schedulerVersion`.

## ADR-003 · Guardar cada respuesta al instante
- **Contexto:** Android puede matar la pestaña en cualquier momento (llamada, cambio de app).
- **Decisión:** cada intento se escribe en IndexedDB en una transacción **en el momento de responder**, junto con la actualización de la caché (misma transacción). La sesión en curso no vive solo en memoria: si se interrumpe, lo respondido ya cuenta.
- **Alternativas:** guardar al final de la sesión (se pierde todo si se cierra).
- **Confirmación e idempotencia (revisión adversarial):** el `attemptId` se crea al mostrar la pregunta y es clave primaria: `recordAttempt` con un `attemptId` ya guardado no hace nada (doble toque, reintento). Los botones se desactivan al enviar. La interfaz **solo muestra el feedback y deja avanzar cuando la transacción ha terminado**; si falla, la respuesta queda pendiente en pantalla con «Reintentar» y un aviso claro. Dos pestañas respondiendo al mismo ítem generan dos intentos distintos y válidos (FSRS los aplica en orden de instante).
- **Consecuencias:** el «resumen de sesión» se calcula leyendo los intentos de esa sesión.

## ADR-004 · Navegación con enrutado por hash propio (sin react-router)
- **Contexto:** 5 pantallas; GitHub Pages no reescribe rutas (recargar `/asignatura/x` daría 404).
- **Decisión:** rutas `#/`, `#/asignatura/:id`, `#/sesion/...`, `#/ajustes`, con un hook propio de ~40 líneas.
- **Alternativas:** react-router (dependencia grande para 5 pantallas) o el truco del `404.html`.
- **Consecuencias:** funciona offline y en Pages sin configuración extra.

## ADR-005 · Markdown + KaTeX con markdown-it y HTML desactivado
- **Contexto:** enunciados con Markdown, `$...$`, `$$...$$` y bloques de código. El contenido lo genera Claude, pero no debe poder inyectar HTML/JS.
- **Decisión:** `markdown-it` con `html: false` (escapa el HTML; bloquea enlaces `javascript:`) + una regla propia pequeña para `$`/`$$` que llama a `katex.renderToString({ throwOnError: false })`. Resultado memorizado por texto.
- **Alternativas:** `marked` + DOMPurify (dos dependencias), `react-markdown` + remark/rehype (muchas dependencias).
- **Consecuencias:** una sola dependencia; las fórmulas mal escritas se ven en rojo en vez de romper la pantalla. El validador de importación avisa de LaTeX inválido (comprobando con KaTeX) para detectarlo antes.

## ADR-006 · Código sin resaltado de color en v1
- **Contexto:** Fundamentos Informáticos necesita mostrar Python/SQL. Las preguntas son cerradas: lo esencial es que el código se lea bien (monoespaciado, sangría, desplazamiento horizontal).
- **Decisión:** bloques de código monoespaciados, con sangría respetada y scroll horizontal; sin colores.
- **Alternativas:** Prism con 2 gramáticas (≈15 kB) — se puede añadir en el hito de pulido si Juan lo echa en falta.
- **Consecuencias:** una dependencia menos. Queda en `QUESTIONS.md` como mejora opcional.

## ADR-007 · Interacciones por toque, sin arrastrar
- **Contexto:** `ordenar` y `emparejar` piden arrastrar en el BRIEF; arrastrar con una mano en un móvil es incómodo, poco accesible y requiere librería.
- **Decisión:** `ordenar` = tocar los pasos en el orden correcto (se van colocando en una lista; tocar uno colocado lo devuelve). `emparejar` = tocar un elemento de la izquierda y luego uno de la derecha. Todo operable con teclado y lector de pantalla.
- **Alternativas:** dnd-kit (dependencia, peor con una mano).
- **Consecuencias:** 0 dependencias, objetivos táctiles ≥ 44 px.

## ADR-008 · Día de estudio y zona horaria
- **Contexto:** dominio («2 días distintos»), racha y repasos dependen de qué es «un día». Juan puede estudiar de noche.
- **Decisión:** el día de estudio es la **fecha local del móvil con corte a las 04:00** (lo que se estudia a las 01:30 cuenta para el día anterior), como Anki. Se calcula con una única función pura `studyDay(instant, tz)` probada (incluidos cambios de hora de marzo/octubre).
- **Sin reinterpretar el pasado (revisión adversarial):** cada intento guarda el instante, el `studyDay` asignado **al responder** y la zona IANA (`Intl.DateTimeFormat().resolvedOptions().timeZone`). Dominio, racha y puntos ciegos usan siempre el `studyDay` guardado; viajar o restaurar en otro móvil no reagrupa días antiguos. Los vencimientos FSRS son instantes; «vencido hoy» = vence antes del próximo corte de las 04:00 en la zona actual.
- **Alternativas:** medianoche (rompe la racha a quien estudia a las 00:30).
- **Consecuencias:** pregunta en `QUESTIONS.md` por si Juan prefiere medianoche.

## ADR-009 · Reglas exactas de dominio (interpretación del BRIEF §5.4)
- **Decisión:**
  - *Pregunta evaluable* = cualquier ítem excepto `info`. Las `flashcard` cuentan: «Otra vez» = fallo; «Difícil/Bien/Fácil» = acierto.
  - *Día válido para un bloque* = ese día de estudio, la **primera respuesta del día** a cada ítem evaluable del bloque es correcta en ≥ 80 % de los ítems evaluables **del bloque** (no de los respondidos), y ese día no hay en el bloque ningún «No lo sé» ni fallo con confianza «Seguro».
  - *Dominado* = 2 días válidos distintos. *En curso* = algún intento y no dominado. *Pendiente* = sin intentos. *Graduado* = dominado y, en los **3 últimos días de estudio posteriores al dominio** en que se respondió algún ítem del bloque (cada uno = un «repaso»), todas las respuestas del bloque fueron aciertos con «Seguro» (en `flashcard`, «Fácil»).
  - *Pérdida de dominio*: un fallo en un bloque dominado/graduado lo devuelve a «en curso» y reinicia los días válidos.
  - *Día provisional (revisión adversarial):* el estado es **siempre una función pura de todos los intentos**, evaluando cada día con todas sus respuestas. El día de hoy cuenta de forma provisional:
    - Si el 2.º día válido se alcanza hoy y más tarde, hoy mismo, hay un fallo con «Seguro» o un «No lo sé», **solo se invalida hoy**: el bloque vuelve a «en curso» con 1 día válido (el anterior se conserva).
    - El dominio solo se **consolida** cuando termina el día en que se alcanzó (corte de las 04:00). Un fallo en un día posterior al consolidado aplica la regla de pérdida (reinicio a 0 días válidos).
    - Lo mismo para la graduación: el 3.er repaso cuenta provisionalmente; una respuesta posterior ese día que no sea acierto con «Seguro» invalida ese repaso.
    - Los desbloqueos por `requiere` siguen el estado actual (pueden revertirse el mismo día; los intentos ya hechos en el bloque desbloqueado se conservan).
  - *Bloqueado* = algún bloque de `requiere` no dominado/graduado. Los repasos de bloques ya vistos nunca se bloquean.
- **Consecuencias:** todo esto es una función pura en `src/domain/mastery.ts` con tests de cada regla. Se publica en `docs/FORMATO_PAQUETE.md` para que el proyecto Universidad use la misma definición.

## ADR-010 · Constructor de sesión: presupuesto por número de preguntas
- **Contexto:** la sesión se pide en minutos (5/10/15), pero no se sabe cuánto tarda cada pregunta.
- **Decisión:** se estima por tipo (p. ej. test 30 s, flashcard 15 s, ordenar/emparejar/error 60 s, info 20 s) y se recalibra con la mediana real de duración de los intentos de Juan cuando haya ≥ 30. La sesión se construye por prioridad (puntos ciegos → repasos vencidos → bloque actual → intercalado) hasta llenar el presupuesto. Se puede terminar antes en cualquier momento sin perder nada (ADR-003).
- **Consecuencias:** constructor puro y determinista con semilla para el barajado (tests reproducibles).

## ADR-011 · Paquetes: importación atómica y versión
- **Decisión:**
  - Validación zod completa **antes** de escribir nada; errores en español con ruta (`bloques[2].items[5].opciones`).
  - Comprobaciones extra: ids únicos en todo el paquete y sin chocar con otra asignatura; `requiere` apunta a bloques existentes y sin ciclos; cada tipo con su forma (p. ej. `test` con exactamente 1 correcta, 3–5 opciones); LaTeX parseable.
  - Se guarda el JSON original del paquete (permite reconstruir y re-exportar).
  - Versión igual → «ya importado», no hace nada. Versión menor → aviso y confirmación. Ítems que desaparecen → `archivado: true` (no salen en sesiones, su historial se conserva y vuelven si reaparecen).
  - Toda la importación es una sola transacción Dexie: o entra entera o no entra nada.
  - Si un ítem conserva el `id` pero cambia de tipo, se trata como ítem nuevo con historial archivado (su FSRS no tiene sentido).

## ADR-012 · Copias de seguridad
- **Decisión:** formato `estudio-backup/1` = **datos restaurables**: paquetes (todas las versiones), ítems, intentos, sesiones y ajustes + versión del esquema de BD + `schedulerVersion` + fecha. **No incluye** las cachés (se recalculan al restaurar) **ni** la tabla `snapshots` (almacén local de recuperación, nunca se exporta ni se sobrescribe al restaurar).
- Restaurar: validar el archivo entero con zod → si es de un esquema **anterior**, migrarlo en memoria con funciones puras probadas; si es de uno **futuro**, rechazarlo («Actualiza la app antes de restaurar») → una sola transacción sobre las tablas de datos + `snapshots`: guardar el estado actual como snapshot (se conservan los 3 últimos), vaciar y escribir los datos del archivo → recalcular cachés. Si algo falla (cuota, aborto) la transacción se deshace entera y el estado previo queda intacto. «Deshacer restauración» = restaurar el snapshot más reciente por el mismo camino (que a su vez guarda un snapshot, así que es reversible). Recordatorio visible en inicio si pasan 7 días sin copia exportada. La copia se comparte con Web Share API (Android Chrome soporta archivos) o se descarga.
- **Consecuencias:** un restaurar equivocado se deshace desde Ajustes. Tests: copia → BD vacía nueva → restaurar → estado idéntico; restaurar y deshacer varias veces seguidas; fallo simulado de cuota/aborto → estado previo íntegro; copia de esquema antiguo → migrada; copia de esquema futuro → rechazada sin tocar nada; la copia nunca contiene snapshots.

## ADR-013 · Actualizaciones de la app sin cortar sesiones
- **Contexto:** un service worker que se actualiza solo podría recargar en mitad de una sesión.
- **Decisión:** `vite-plugin-pwa` con `registerType: 'prompt'`: aparece «Hay una versión nueva — Actualizar» y solo se aplica al pulsar, nunca durante una sesión. Las migraciones de Dexie son **solo aditivas** cuando sea posible y cada una tiene test con datos de la versión anterior.
- **Convivencia de versiones (revisión adversarial):**
  - Al recibir `versionchange` (otra pestaña/ventana con versión nueva quiere migrar), la app **cierra su conexión** y bloquea la interfaz con «La app se ha actualizado en otra ventana — Recargar». Lo respondido ya está guardado (ADR-003).
  - Si la apertura queda `blocked`, se muestra «Cierra las demás pestañas de la app» y se reintenta.
  - Una versión antigua nunca abre una BD de versión superior (Dexie lo impide con `VersionError`): se muestra «Recarga para actualizar» y no escribe nada.
  - Si una migración falla, la transacción de actualización de IndexedDB se deshace y la BD queda en la versión anterior; se muestra el error y se ofrece exportar copia de seguridad.

## ADR-014 · Despliegue en GitHub Pages desde M0
- **Contexto:** BRIEF §9 (decidido por Juan): Pages, repo público, Actions. `gh` está conectado.
- **Decisión:** crear el repo público y el workflow de Actions **en M0** (no en M8), para que Juan pueda probar en su Android desde el primer hito y para detectar pronto problemas de ruta base (`/app-estudio/`) y del service worker. El workflow ejecuta `npm run check` antes de publicar.
- **Consecuencias:** el repo solo contiene código y `fixtures/` inventados. `.gitignore` excluye `*.local.json`, `paquetes/`, `progreso_*.json` y `backup_*.json` por si Juan los deja en la carpeta.

## ADR-015 · Sin Prettier ni testing-library
- **Decisión:** solo ESLint (con reglas de hooks y TS estricto). La UI se prueba con Playwright (perfil Android `Pixel 7`, Chromium); la lógica de corrección de cada tipo de pregunta es pura y se prueba con Vitest.
- **Alternativas:** Testing Library + jsdom (3 dependencias más).
- **Consecuencias:** menos piezas; los componentes deben ser finos (sin lógica dentro).

## ADR-017 · Elegibilidad de puntos ciegos (revisión adversarial)
- **Contexto:** si un punto ciego tiene siempre prioridad y solo se resuelve en un día posterior, puede llenar todas las sesiones del día.
- **Decisión:** un punto ciego pendiente es **elegible como máximo una vez por día de estudio** (si ya se ha respondido hoy, no vuelve hasta mañana, acierte o falle). Se resuelve al acertarlo con «Bastante» o «Seguro» en un día posterior al fallo. Como mucho ocupan el **40 % del presupuesto** de una sesión; el resto lo toman vencidos y bloque actual. Su FSRS sigue funcionando normal (el fallo ya lo dejó en «Again»). Lo mismo para el intercalado: solo ítems ya vistos y no respondidos hoy.
- **Consecuencias:** varias sesiones el mismo día avanzan por la cola en vez de repetir. Tests: 3 sesiones seguidas el mismo día con 50 puntos ciegos.

## ADR-018 · Comprobaciones mínimas en iPhone
- **Contexto:** iPhone no es objetivo, pero no se debe romper.
- **Decisión:** un E2E de humo con Playwright WebKit (perfil `iPhone 13`): arranca, importa, responde y guarda. La app comprueba `navigator.storage.persist`, `navigator.canShare({ files })` y `share` antes de usarlos y tiene alternativas (descarga del archivo; mensaje si no hay persistencia). Sin dependencias nuevas (WebKit lo instala Playwright).

## ADR-016 · Reordenación de hitos
- **Decisión:** la lógica de dominio (FSRS, dominio, sesión) pasa a M2, antes del almacenamiento, porque el esquema de BD depende de ella (ADR-002). El despliegue pasa a M0 (ADR-014). Ver `docs/PLAN.md`.

## ADR-019 · Capa de datos en `src/data/`
- **Decisión:** `CLAUDE.md`/`AGENTS.md` mandan sobre `PLAN.md`: la capa de IndexedDB vive en `src/data/` (no `src/db/`). El marcador `src/db/.gitkeep` se elimina en M3.

## ADR-020 · E2E con el Chrome instalado
- **Contexto:** la descarga de Chromium de Playwright no terminaba en el equipo de Juan.
- **Decisión:** `channel: 'chrome'` en `playwright.config.ts`; en CI `npx playwright install --with-deps chrome`. WebKit (ADR-018) se instalará aparte cuando toque (M7) y, si no se puede, el humo en iPhone se documenta como no ejecutado.

## ADR-021 · JSON Schema orientativo y validación como fuente de verdad
- **Decisión:** `docs/estudio-pack-1.schema.json` se exporta en modo **entrada** (`io: 'input'`) y es orientativo: no expresa las reglas semánticas (exactamente 1 correcta, textos distintos, marcadores `{{n}}`, ids únicos, ciclos de `requiere`, LaTeX). La fuente de verdad es `validatePack`. El validador normaliza el input a JSON puro (límite de profundidad, sin propiedades heredadas) y nunca lanza.

## ADR-022 · `ts-fsrs` fijado en 5.4.2 (FSRS-6, API síncrona)
- **Contexto:** `ts-fsrs` 6.x marca `fsrs()`, `createEmptyCard` y `Card` como obsoletos; su `DefaultScheduler` es asíncrono y usa **FSRS-7** por defecto. El BRIEF y ADR-002 piden FSRS-6, función pura y planificador versionado.
- **Decisión:** versión exacta **5.4.2** (FSRS-6, 21 parámetros, API síncrona no obsoleta). Los parámetros viven en `studyConfig.fsrs` y `schedulerVersion = 1`. Un test fija 5 vencimientos (`tests/fixtures/study/fsrs-golden.json`); coinciden con los de 6.0.1 en modo FSRS-6.
- **Consecuencias:** subir a otra versión o a FSRS-7 es una migración deliberada (subir `schedulerVersion`, recalcular la caché desde los intentos; los intentos no cambian).
