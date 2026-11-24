# PROGRESS

Arranque de sesión nueva: `CLAUDE.md` → este archivo → `docs/PLAN.md`. Último commit de código: `8a26915` (M9-1 en curso); después solo documentación. `main`, **sin push** (no se hace hasta que Juan autorice; ver «Publicación»).

## Estado por hito
| Hito | Estado | Commit de cierre | Verificación |
|---|---|---|---|
| M0 Andamiaje | **Cerrado** | `75c4de1` | 37 tests |
| M1 Paquetes (`estudio-pack/1`) | **Cerrado** (2 revisiones adversariales) | `42abbc6` | 252 tests |
| M2 Dominio (FSRS, dominio, sesión) | **Cerrado** (adversarial) | `f89cd6b` | 669 tests |
| M3 Almacenamiento y copias | **Cerrado** (adversarial) | `11824bc` | 901 tests |
| M4 Renderizado de preguntas | **Cerrado** | `7fe50c9` | 963 tests + 24 E2E |
| M5 Pantallas y flujo de estudio | **Cerrado** | `d455e40` | 1180 tests + 44 E2E |
| M6 Exportación de progreso | **Cerrado** (adversarial) | `af6ce0c` | 1232 tests + 51 E2E |
| M7 Offline / actualización / instalación | **Cerrado** | `909b475` | 56 E2E (5 de PWA con dos builds reales) |
| M8 README para Juan + prueba móvil | **Documentos escritos, hito NO cerrado**: `README.md`, `docs/PRUEBA_MOVIL.md`, `docs/DESARROLLO.md` (`98b44dc`); los 28 textos de botones citados en el README existen en la interfaz (comprobado). Faltan `RESULTADO-M8.md`/`PARA-REVISAR-M8.md` y la prueba de Juan en su Android | `98b44dc` (documentos) | revisión estática del README contra la UI |
| M9 Pulido | **EN CURSO** (ver abajo) | `8a26915` (parcial) | `npm run check` verde: 1282 tests + 16 `node --test` + 3 del build; E2E: 145 pasan, 2 omitidos, **1 falla** |

Informes: `docs/results/RESULTADO-M0…M7.md`, `PARA-REVISAR-*.md`, `docs/results/M9-1.md` (informe de Codex de M9-1).

## Tarea en curso: M9-1 (accesibilidad, rendimiento, capturas)
Hecho y verificado (E2E reales con `npm run e2e`):
- **Accesibilidad con axe** (`e2e/a11y.spec.ts`, 88 casos: claro/oscuro × tema del sistema/forzado, Inicio, Asignatura con los 4 estados, Ajustes con importación correcta/rechazada/versión anterior, los 9 tipos antes y después del feedback, sesión real, examen real, resumen): **0 violaciones**. Defectos reales corregidos: `div` sin rol con `aria-label` en «ordenar» (`OrderQuestion.tsx`), opciones cuyo texto es solo una fórmula sin nombre accesible (`RichText` pone ahora `role="img"` + `aria-label` con `plainText` de `src/domain/render/plain.ts`), foco visible de 3 px y objetivos ≥ 44 px (`global.css`).
- **Rendimiento (medido en PC, Chrome):** restaurar una copia de 6 000 preguntas / 20 000 intentos = 3,4–7,0 s (objetivo 20 s) ✔; importar un paquete de 2 000 preguntas = 0,8 s (objetivo 6 s) ✔.

**FALLO ABIERTO (real, no del test): el Inicio tarda ~9,7 s con 6 000 preguntas y 20 000 intentos** (objetivo 1,5 s; `e2e/performance.spec.ts`, paso `home`). Antes de ese paso no se había medido nada más (abrir asignatura, «Estudiar» con 2 000 ítems, responder con historial completo, exportar copia/progreso): el test se detiene en el primer fallo. Sospecha: `getHomeView`/`getSubjectView` (`src/data/views.ts`, `viewModels.ts`) cargan el catálogo completo (6 000 filas con su `data` JSON) y leen todos los intentos para calcular racha, último día y repasos de hoy.

## Revisión adversarial de la capa de aplicación (M4–M7): leída, 3 hallazgos ALTOS
Salida completa en `$TEMP/adv-app.txt` (si se pierde, relanzar con `node ~/.claude/plugins/cache/openai-codex/codex/1.0.6/scripts/codex-companion.mjs adversarial-review --wait --base 6ae5e65 "foco"` en segundo plano). Resumen:
1. Dos pestañas con la misma sesión guardan **dos** intentos de la misma pregunta (`attemptId` distintos; `studyAnswer.ts:21-24`).
2. La respuesta se corrige contra el contenido **releído**, no contra lo que Juan vio, si otra pestaña importa una versión mientras tanto (`studyAnswer.ts:16-19`).
3. «Actualizar» en otra pestaña **recarga la sesión activa** (listener `controlling` de `registerSW`, `pwa.ts:25-27`): se pierde la respuesta elegida y no enviada.
→ Se corrigen en **M9-2**. Ningún otro hallazgo.

## Tareas especificadas, listas para delegar (no se ha programado nada de ellas)
| Tarea | Qué | Esfuerzo | Criterios de aceptación (resumen) |
|---|---|---|---|
| **M9-2** `docs/tasks/M9-2.md` | Integridad: una respuesta por sesión+pregunta (`already-answered`), huella del contenido mostrado (`changed`), recarga entre pestañas controlada (`swRegister.ts` propio, `shouldReloadNow`) | **high** | Vitest A1–A4, B1–B4, C1–C2 con valores a mano; 3 E2E nuevos (dos pestañas misma sesión → 1 intento; contenido cambiado → 0 intentos y recarga de la pregunta; otra pestaña actualiza → la que estudia no recarga, conserva la elección y recarga al salir); los 145 E2E anteriores y axe siguen en verde |
| **M9-3** `docs/tasks/M9-3.md` | Rendimiento: corte de las 04:00 una sola vez (`isDueBefore`), vistas sin `toArray()` de 20 000 intentos ni `loadCatalog`, ítems evaluables por bloque sin leer `data`, cadena `home→subject→session→answer→exports` | **high** | Equivalencia exacta con la implementación actual en 5 estados semilla (E1), `isDueBefore` = `isDue` (E2), test de presupuesto de lecturas (E4); `e2e/performance.spec.ts` llega al final con 6 000 preguntas / 20 000 intentos: Inicio < 1,5 s, Asignatura < 1,5 s, «Estudiar» < 1,5 s, responder < 0,5 s, copia < 10 s, progreso < 3 s |
Orden: **M9-2 primero** (datos de Juan), verificar y comitear; después **M9-3** (ambas tocan `src/data/` y `src/config.ts`: no en paralelo).

## Qué falta (en este orden)
1. Delegar, verificar y comitear **M9-2**.
2. Delegar, verificar y comitear **M9-3** (el E2E de rendimiento debe pasar entero).
3. Si lo pide M9-2/M9-3 o aparece algo nuevo: otra pasada de `adversarial-review` solo sobre lo cambiado (no hace falta si solo toca rendimiento con equivalencia probada).
4. **Revisión visual**: `E2E_SCREENSHOTS=1 npx playwright test e2e/screenshots.spec.ts` genera PNG en `docs/results/capturas/` (claro y oscuro); mirarlas con la herramienta de lectura de imágenes y corregir lo feo/ilegible (contraste del rojo de KaTeX en oscuro, ADR-025).
5. **CIERRE DE HITO M8 — PENDIENTE (no hecho)**: tras M9-2/M9-3, releer `README.md` y `docs/PRUEBA_MOVIL.md` contra la interfaz final (M9-2 añade avisos nuevos: «Esta pregunta ya se respondió en otra ventana», «ha cambiado en otra ventana»; el README sección 6 debe mencionarlos) y contra las capturas; escribir `docs/results/RESULTADO-M8.md` (qué documentos, qué se comprobó) y `docs/results/PARA-REVISAR-M8.md` (a: qué queda a medias = la prueba de Juan en el móvil; b: qué pasa si el archivo de paquete falla o falta; c: qué se rompe si cambian los textos de la interfaz → el README dice los nombres de los botones). El criterio de aceptación de M8 (BRIEF §8: Juan completa la lista en su móvil) **solo puede cumplirlo Juan**: queda en `PENDIENTE-JUAN.md`.
6. **CIERRE DE HITO M9 — PENDIENTE (no hecho)**: `docs/results/RESULTADO-M9.md` (tiempos reales medidos, accesibilidad, capturas, hallazgos adversariales y su corrección) y `docs/results/PARA-REVISAR-M9.md` (preguntas a), b), c)…); actualizar este archivo con el commit de cierre.
7. **CIERRE DEL PROYECTO — PENDIENTE (no hecho)**: `docs/results/RESULTADO-FINAL.md` con la URL (`https://graudiazjuan212-cyber.github.io/app-estudio/`) y cómo instalar en Android (tomarlo del `README.md`); añadir en `docs/QUESTIONS.md` la pregunta de publicación (opción por defecto: no publicar hasta que conteste); `docs/PENDIENTE-JUAN.md` con: autorizar `git push`, activar Pages (origen «GitHub Actions»), hacer `docs/PRUEBA_MOVIL.md` en su Android, importar sus paquetes reales.
8. **Último `npm run check` + `npm run e2e` en verde** antes del cierre y dejar `git status` limpio.

## Siguiente paso exacto
Cuando vuelva Codex: delegar **`docs/tasks/M9-2.md`** con el agente `codex:codex-rescue` (`--write --effort high`; pasar el texto de la tarea y la nota «no te detengas a preguntar; no ejecutes npm; guarda sin BOM y con acentos reales»), esperar su informe, verificar con `npm run check` y `npm run e2e` (esperar fallos de lint/E2E que Codex no puede ver y corregirlos o devolverlos con el fallo concreto), comitear con `feat(app): …(M9-2)` y pasar a M9-3. Hasta entonces **no programar**.

## Publicación (límite: sin push sin autorización de Juan)
El workflow `.github/workflows/deploy.yml` está listo (check + e2e + Pages). **Hay que revisar antes de publicar:** instala Chrome con `npx playwright install --with-deps chrome`; el proyecto `pwa` de Playwright compila dos builds extra y tarda unos minutos; el E2E de rendimiento y los de capturas no deben ser flaky en CI (los de capturas solo corren con `E2E_SCREENSHOTS=1`). WebKit/iPhone **no se ha podido probar** (la descarga de navegadores de Playwright falla en este equipo).

## Cómo trabajar (lecciones; detalle en `docs/diario-friccion.md`)
- Delegar con el agente `codex:codex-rescue`. Codex **no puede ejecutar npm, vitest ni E2E**: cada entrega se verifica ejecutando `npm run check` y `npm run e2e` (siempre aparece algo: lint, tipos, E2E, BOM, acentos rotos `?`). Si se detiene con una pregunta, decidir como director técnico y relanzar con «no te detengas a preguntar».
- Revisión adversarial: script `codex-companion.mjs adversarial-review` en segundo plano con salida a `$TEMP`.
- `src/repo-hygiene.test.ts` vigila BOM, archivos > 300 líneas y acentos sustituidos por `?`.
- Los tests que inspeccionan `dist` son `*.dist.test.ts` y corren tras el build (`npm run test:dist`, dentro de `npm run check`).
- Evitar `$$` en comandos de shell y `\\` dentro de scripts Python pasados por la herramienta (se desescapan): usar la herramienta de edición.

## Decisiones cerradas (no se reabren)
- ADR-001…026 de `docs/DECISIONS.md`. Capa de datos `src/data/`. `ts-fsrs` 5.4.2 (FSRS-6). KaTeX no usa `katex-error` (ADR-025).
- E2E con el Chrome instalado (ADR-020), builds aparte `dist-e2e` (`VITE_ENABLE_DEMO=true`: demo `#/demo` y reloj de pruebas; **no** existen en `dist`).
- Desde la primera publicación, cualquier cambio de tablas/índices exige versión nueva y migración con copia previa (ADR-013, ADR-024).

## Fallos abiertos
1. Rendimiento del Inicio con 6 000 preguntas / 20 000 intentos (~9,7 s vs 1,5 s). Causa localizada (`loadCatalog` por asignatura + `isDue` recalcula el corte por ítem + `attempts.toArray()`); se arregla en **M9-3**.
2. Tres hallazgos altos de la revisión adversarial de la capa de aplicación (duplicado de respuestas entre pestañas, corrección contra contenido no mostrado, recarga de sesión por actualización en otra pestaña); se arreglan en **M9-2**.

## Pendientes de Juan
Ver `docs/PENDIENTE-JUAN.md` y `docs/QUESTIONS.md`.
