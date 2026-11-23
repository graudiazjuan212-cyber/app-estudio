# PLAN — App de estudio v1

Fuente: `docs/BRIEF.md` + `docs/DECISIONS.md`. Un hito cada vez (CLAUDE.md, regla 2).
Flujo de cada tarea: commit de seguridad → `docs/tasks/<hito>-<n>.md` → Codex implementa (`/codex:rescue --wait`) → Claude revisa diff + `npm run check` → (máx. 3 vueltas con `--resume`) → commit.
**Crítico** = lleva `/codex:adversarial-review` antes del commit final del hito.

| Hito | Nombre | Crítico | Esfuerzo Codex |
|---|---|---|---|
| M0 | Andamiaje + despliegue | — | medium |
| M1 | Formato de paquete e importación (pura) | **Sí** | high |
| M2 | Dominio: FSRS, dominio, sesión | **Sí** | high |
| M3 | Almacenamiento, importación persistente, copias | **Sí** | high |
| M4 | Renderizado de preguntas | — | medium |
| M5 | Pantallas y flujo de estudio | — | medium |
| M6 | Exportación de progreso | **Sí** | medium |
| M7 | Offline, instalación, actualización, persistencia | — | medium |
| M8 | README para Juan + verificación en el móvil | — | medium |
| M9 | Pulido: E2E, accesibilidad, rendimiento | — | medium |

Reparto general: **Codex** escribe código y tests según la especificación. **Claude** escribe especificaciones, revisa cada diff (tipos, casos límite, accesibilidad, que los tests prueben algo real), ejecuta `npm run check` y los E2E, y mantiene `docs/`. Si una tarea falla 3 vueltas, la resuelve Claude.

---

## M0 · Andamiaje + despliegue
- **Objetivo:** proyecto vacío que compila, se prueba, se publica en GitHub Pages y se abre en el Android de Juan.
- **Entregables:** Vite + React + TS estricto (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`); ESLint (flat config, typescript-eslint estricto, react-hooks, `no-explicit-any` = error); Vitest; Playwright con proyecto `Pixel 7`; `npm run check` (typecheck + lint + test + build) y `npm run e2e`; estructura `src/domain`, `src/db`, `src/ui`, `src/app`; layout móvil base (cabecera, contenido, área segura), tema claro/oscuro por `prefers-color-scheme` con variables CSS; enrutado por hash (ADR-004) con pantalla «Inicio» vacía; `vite-plugin-pwa` mínimo (manifest + iconos + `base: '/app-estudio/'`); `.gitignore` (ADR-014); repo público `app-estudio` en GitHub + workflow de Actions (`npm ci` → `check` → `e2e` → publicar `dist/`).
- **Aceptación:** `npm run check` y `npm run e2e` en verde en local y en Actions; la URL de Pages carga en < 2 s y muestra «Inicio»; recargar en `#/ajustes` no da 404; Lighthouse PWA «instalable».
- **Tests obligatorios:** 1 unitario del router (parseo de rutas, ruta desconocida → inicio); 1 E2E que abre la app en viewport Pixel 7 y comprueba el título y que no hay errores en consola.
- **Codex:** todo el andamiaje. **Claude:** revisa configuración de TS/ESLint, crea el repo con `gh` y activa Pages.

## M1 · Formato de paquete e importación (lógica pura) — CRÍTICO
- **Objetivo:** contrato `estudio-pack/1` cerrado, validado y documentado.
- **Entregables:** `src/domain/pack/schema.ts` (zod v4, un esquema por tipo de ítem con unión discriminada por `tipo`); `validatePack(json): Result<Pack, PackError[]>` con mensajes en español y ruta; comprobaciones de ADR-011 (ids únicos, `requiere` existente y acíclico, reglas por tipo, LaTeX parseable con KaTeX, longitudes razonables); `diffPack(old, new)` → ítems nuevos / conservados / archivados / cambio de tipo; `scripts/export-schema.ts` → `docs/estudio-pack-1.schema.json`; `docs/FORMATO_PAQUETE.md` (para el proyecto Universidad: estructura, cada tipo con ejemplo, reglas de ids, cómo mantener progreso entre versiones, definición de dominio de ADR-009, errores típicos); `fixtures/`: `mat-ejemplo-c01.json` (vectores, todos los tipos, LaTeX) y `ioe-ejemplo-c01.json` (texto puro), ambos inventados, más `fixtures/invalid/` con ≥ 10 paquetes rotos.
- **Reglas por tipo (resumen):** `test` 3–5 opciones, exactamente 1 correcta; `multi` 3–6 opciones, ≥ 1 correcta; `vf` campo `correcta: boolean`; `ordenar` 3–8 pasos (orden del paquete = correcto); `emparejar` 3–6 pares, sin textos repetidos por lado; `huecos` marcador `{{n}}` en el texto, cada hueco con 2–5 opciones y 1 correcta, todos los marcadores con su hueco y viceversa; `error` 3–8 pasos y exactamente 1 incorrecto; `flashcard` anverso/reverso; `info` título/cuerpo.
- **Aceptación:** los 2 fixtures válidos pasan; cada fixture inválido falla con un mensaje en español que nombra el campo; el JSON Schema exportado valida los fixtures válidos (comprobado en test con el propio zod de ida y vuelta); `FORMATO_PAQUETE.md` permite a un humano escribir un paquete sin leer código.
- **Tests obligatorios:** un caso por cada regla de validación; `diffPack` con: ítem igual, ítem eliminado, ítem reaparecido, cambio de tipo, bloque movido de capítulo; test de propiedad simple (paquete válido aleatorio → valida).
- **Codex:** esquema, validador, diff, fixtures, script. **Claude:** escribe `FORMATO_PAQUETE.md` (es el contrato con Juan) y revisa mensajes de error. **Adversarial:** sí.

## M2 · Dominio: FSRS, dominio de bloques, constructor de sesión — CRÍTICO
- **Objetivo:** toda la lógica de estudio como funciones puras con tests exhaustivos. Sin React ni IndexedDB.
- **Entregables:** `studyDay()` (ADR-008); `grade()` por tipo (dada la respuesta de Juan → correcto/incorrecto; `multi` y `emparejar` solo correctos si todo está bien); mapeo a FSRS (BRIEF §5.3) con `ts-fsrs` y parámetros por defecto; `applyAttempt(state, attempt)` y `rebuildFromAttempts(attempts, packs)` (ADR-002); `blockStatus()` y `chapterPercent()` (ADR-009); detección de puntos ciegos (fallo con «Seguro»; se resuelve cuando se acierta con «Bastante»/«Seguro» en un día posterior); `buildSession(state, packs, now, minutes, seed)` (BRIEF §5.3 + ADR-010) con: puntos ciegos → vencidos → bloque actual (info primero si es nuevo, dificultad creciente por peso/orden) → intercalado sin repetir ítem; `buildChapterExam()` (BRIEF §5.4: 2+1+1+1, sustituciones si faltan preguntas); racha y objetivo diario.
- **Aceptación:** reproducir un intento a intento es igual que `rebuildFromAttempts`; el constructor es determinista con la misma semilla; ninguna sesión incluye ítems archivados, `info` ya vistas en repaso ni bloques bloqueados (salvo repasos); una sesión de 5 min con 2.000 ítems se construye en < 50 ms.
- **Tests obligatorios:** tabla de casos para cada regla de ADR-009 (incluye: dominio con 79 % y 80 %, «No lo sé» invalida el día, fallo tras dominio, días distintos vs. mismo día dos veces, graduación y pérdida); **día provisional**: 2.º día válido alcanzado y luego invalidado el mismo día (se conserva el 1.º), fallo tras cruzar las 04:00 (pérdida consolidada), graduación provisional revocada por una «Duda» posterior, varias sesiones el mismo día; `studyDay` a las 03:59/04:00, en cambios de hora y con intentos de otra zona horaria (no se reinterpretan); FSRS: vencimientos crecientes con aciertos, reinicio con fallo; **reconstrucción**: incremental = `rebuildFromAttempts`, tras cambio de tipo (`itemGen`), tras mover ítems de bloque y tras subir `schedulerVersion`; constructor: prioridades, presupuesto, intercalado, sin duplicados, **3 sesiones seguidas el mismo día con 50 puntos ciegos** (ADR-017: tope 40 %, una vez por día, la cola avanza); examen con capítulos insuficientes; racha con días saltados.
- **Codex:** implementación + tests. **Claude:** especificación con la tabla de casos esperados escrita a mano (los tests deben comprobar esos valores, no los que salgan del código). **Adversarial:** sí.

## M3 · Almacenamiento, importación persistente y copias de seguridad — CRÍTICO
- **Objetivo:** que los datos de Juan sobrevivan a todo.
- **Entregables:** Dexie: tablas `packs` (JSON original + versión), `items` (índice por asignatura/capítulo/bloque, `archivado`), `attempts` (solo añadir), `itemState` y `blockState` (caché), `sessions`, `settings`, `snapshots`, `meta` (versión del esquema); repositorio con funciones `importPack()` (transacción única, ADR-011), `recordAttempt()` (ADR-003), `rebuildCache()`; `exportBackup()` / `restoreBackup()` con zod (ADR-012) y snapshot previo; `navigator.storage.persist()` y `estimate()` envueltos; registro de última copia para el recordatorio.
- **Aceptación:** importar → reimportar versión nueva conserva el progreso de los ids mantenidos; un error a mitad de importación no deja nada a medias; copia → BD nueva → restaurar = estado idéntico; restaurar se puede deshacer desde el snapshot; una migración de prueba v1→v2 conserva datos.
- **Tests obligatorios (Vitest + fake-indexeddb):** todos los criterios de aceptación; importación que falla a mitad (simulada) → BD intacta; copia con datos corruptos → rechazo sin tocar nada; `recordAttempt` + `rebuildCache` = misma caché; **idempotencia** (ADR-003): mismo `attemptId` dos veces → un intento; transacción abortada → nada guardado y la respuesta sigue pendiente; **copias** (ADR-012): restaurar y deshacer varias veces seguidas, fallo de cuota/aborto → estado previo íntegro, copia de esquema antiguo migrada, de esquema futuro rechazada, la copia nunca contiene snapshots; se conservan todas las versiones de paquete; **convivencia** (ADR-013) con dos instancias Dexie: `versionchange` cierra la antigua, `blocked` se notifica, versión antigua ante BD nueva no escribe, migración que falla deja la BD en la versión anterior; rendimiento: importar 2.000 ítems < 2 s.
- **Codex:** implementación + tests. **Claude:** revisa transacciones y migraciones línea a línea. **Adversarial:** sí.

## M4 · Renderizado de preguntas
- **Objetivo:** un componente por tipo de pregunta, accesible y cómodo con una mano.
- **Entregables:** `<RichText>` (ADR-005, KaTeX y código, ADR-006); componentes para los 9 tipos (ADR-007 para ordenar/emparejar); opciones barajadas con semilla; botones de confianza (Duda / Bastante seguro / Seguro) **antes** de comprobar; «No lo sé»; feedback (verde/rojo + icono + texto + explicación + `feedback` de la opción elegida); página de desarrollo `#/demo` que muestra los fixtures (solo en build de desarrollo).
- **Aceptación:** los 9 tipos se responden en Pixel 7 solo con toques; objetivos ≥ 44 px; contraste AA en claro y oscuro; LaTeX mal escrito no rompe la pantalla; HTML en el contenido aparece como texto.
- **Tests obligatorios:** E2E en `#/demo` respondiendo bien y mal cada tipo; Vitest de `RichText` (salida HTML para `$x$`, `$$x$$`, código, `<script>` escapado).
- **Codex:** componentes. **Claude:** revisión de accesibilidad y de que no haya lógica de corrección en los componentes.

## M5 · Pantallas y flujo de estudio
- **Objetivo:** la app usable de punta a punta.
- **Entregables:** Inicio (asignaturas con % global, repasos de hoy, último día, racha, objetivo diario, recordatorio de copia); Asignatura (capítulos con %, bloques con estado y candado, «Estudiar», «Repasar capítulo», «Mini examen»); Sesión (barra de progreso, salir guardando); Resumen (aciertos, puntos ciegos, capítulos que cambian, racha); Ajustes (importar archivo o pegar JSON con informe de errores, duración 5/10/15, tema claro/oscuro/sistema, copia, restaurar, deshacer restauración, estado de persistencia).
- **Aceptación:** con BD vacía, la app guía a importar; flujo completo importar → estudiar 5 min → resumen → inicio actualizado; cerrar a mitad de sesión y volver conserva lo respondido; el feedback solo aparece tras guardar y un error de guardado ofrece «Reintentar» (ADR-003).
- **Tests obligatorios:** E2E: importar fixture, sesión completa, interrupción (recargar a mitad), doble toque en «Comprobar» → un solo intento, mini examen, reimportar versión nueva, importar paquete inválido (ve errores), copia y restaurar, aviso de `versionchange` con dos pestañas.
- **Codex:** pantallas. **Claude:** revisión de flujo, textos en español y E2E.

## M6 · Exportación de progreso para Claude — CRÍTICO
- **Objetivo:** archivo `estudio-progreso/1` que el proyecto de asignatura entienda.
- **Entregables:** esquema zod de exportación + JSON Schema en `docs/`; `buildProgressExport(subjectId, state, now)` pura; botón «Exportar progreso para Claude» por asignatura con Web Share API (archivo) y descarga como alternativa; nombre `progreso_<asignatura>_<AAAA-MM-DD>.json`; sección en `FORMATO_PAQUETE.md` explicando cada campo; `fallos_recurrentes` = ítems con ≥ 2 fallos en los últimos 30 días; `sesiones` = últimas 60.
- **Aceptación:** la exportación valida contra su esquema; un humano la entiende; no incluye datos de otras asignaturas.
- **Tests obligatorios:** exportación de un estado conocido = JSON esperado escrito a mano; fechas con zona horaria correcta; asignatura sin intentos.
- **Codex:** implementación. **Claude:** documentación del formato. **Adversarial:** sí.

## M7 · Offline, instalación, actualización, persistencia
- **Entregables:** precarga de todos los recursos (incluidas fuentes KaTeX); `registerType: 'prompt'` con aviso «Actualizar» que nunca aparece durante una sesión (ADR-013); petición de `persist()` en el primer uso con explicación; guía de instalación en Android (Chrome → «Instalar aplicación») y nota breve para iPhone; indicador «sin conexión».
- **Aceptación:** **arranque en frío sin red**: tras la primera carga y la instalación del service worker, se cierran todas las páginas, se pone el contexto offline y una página nueva abre la app, muestra fórmulas (fuentes KaTeX), estudia, guarda y conserva lo guardado al cerrar y reabrir; una versión nueva no recarga sin permiso; tras actualizar, la app sigue funcionando offline con los recursos nuevos.
- **Tests obligatorios:** E2E offline en frío (descrito arriba); **E2E de actualización real entre dos builds** (build A servida → build B con otro identificador de versión → aparece el aviso, no recarga durante una sesión, al aceptar carga B y los datos siguen); E2E de humo en WebKit `iPhone 13` (ADR-018); lista manual en Android en `docs/PRUEBA_MOVIL.md` (instalar, modo avión, cerrar del todo, abrir, estudiar, reabrir).

## M8 · README para Juan y verificación en el móvil
- **Entregables:** `README.md` en español para Juan: instalar en Android, importar, estudiar, exportar progreso, copia/restaurar, qué hacer si algo falla; prueba manual guiada en su Android (lista de comprobación en `docs/PRUEBA_MOVIL.md`).
- **Aceptación:** Juan completa la lista en su móvil (BRIEF §8).

## M9 · Pulido
- **Entregables:** E2E de todos los flujos principales; revisión de accesibilidad (axe en E2E, sin dependencia nueva si se puede; si no, `@axe-core/playwright` con ADR); rendimiento con 2.000+ ítems (fixture generado); modo oscuro revisado; sin errores en consola.
- **Aceptación:** criterios de BRIEF §8 completos.

---

## Revisión adversarial del plan (Codex, 2026-11-23)
Veredicto: *needs-attention*, 8 hallazgos. Integrados:
1. **Reconstrucción sin todas sus entradas** (alto) → ADR-002: todas las versiones de paquete, `itemGen`, `schedulerVersion`, ts-fsrs con versión exacta; tests en M2.
2. **Restaurar podía borrar su propio snapshot** (alto) → ADR-012: snapshots fuera de la copia y de lo que se reemplaza; migración de copias antiguas, rechazo de futuras; tests en M3.
3. **Guardado sin confirmación ni idempotencia** (alto) → ADR-003: `attemptId` como clave, feedback solo tras guardar, «Reintentar»; tests en M3 y M5.
4. **Convivencia de versiones** (alto) → ADR-013: `versionchange`, `blocked`, versión antigua no escribe, migración fallida; tests en M3, M5 y M7.
5. **Dominio concedido antes de invalidarse el día** (alto) → ADR-009: estado como función pura de todos los intentos, día provisional hasta las 04:00; tests en M2.
6. **Puntos ciegos monopolizando sesiones** (medio) → ADR-017; test en M2.
7. **Zona horaria no conservada** (medio) → ADR-008: `studyDay` y zona IANA guardados al responder; tests en M2.
8. **Offline sin arranque en frío ni iPhone** (medio) → M7 con arranque en frío y actualización real entre dos builds; ADR-018 (humo en WebKit).

Descartado parcialmente: la prueba de convivencia «con dos builds reales, dos contextos abiertos, sesión activa y migración fallida» en un único E2E. Se reparte en piezas más fiables y baratas: `versionchange`/`blocked`/migración fallida en Vitest con dos instancias Dexie (M3), dos pestañas en E2E (M5) y actualización real entre dos builds (M7). Un E2E que lo combine todo sería frágil y lento, y cada fallo ya queda cubierto por separado.

## Riesgos principales y mitigación
| Riesgo | Mitigación |
|---|---|
| Pérdida de datos por borrado del navegador | PWA instalada + `persist()` + copias con recordatorio semanal + snapshots al restaurar |
| Fallo de lógica que corrompe el progreso | Registro de intentos inmutable + `rebuildFromAttempts` (ADR-002) |
| Pestaña matada a mitad de sesión | Guardado por respuesta (ADR-003) |
| Paquete de Claude mal formado | Validación estricta + `FORMATO_PAQUETE.md` + JSON Schema |
| Actualización que corta una sesión o migración que rompe datos | `prompt` + migraciones aditivas con test (ADR-013) |
| Agotar el uso del plan | Hitos pequeños, `PROGRESS.md` al día, árbol siempre compilando |
