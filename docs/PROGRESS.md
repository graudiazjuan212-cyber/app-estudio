# PROGRESS

Arranque de sesión nueva: `CLAUDE.md` → este archivo → `docs/PLAN.md`. Último commit: `8a26915` (M9-1 en curso). `main`, **sin push** (no se hace hasta que Juan autorice; ver «Publicación»).

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
| M8 README para Juan + prueba móvil | **Documentos hechos** (`README.md`, `docs/PRUEBA_MOVIL.md`, `docs/DESARROLLO.md`); la prueba en el Android la hace Juan | `98b44dc` | — |
| M9 Pulido | **EN CURSO** (ver abajo) | `8a26915` (parcial) | `npm run check` verde: 1282 tests + 16 `node --test` + 3 del build; E2E: 145 pasan, 2 omitidos, **1 falla** |

Informes: `docs/results/RESULTADO-M0…M7.md`, `PARA-REVISAR-*.md`, `docs/results/M9-1.md` (informe de Codex de M9-1).

## Tarea en curso: M9-1 (accesibilidad, rendimiento, capturas)
Hecho y verificado (E2E reales con `npm run e2e`):
- **Accesibilidad con axe** (`e2e/a11y.spec.ts`, 88 casos: claro/oscuro × tema del sistema/forzado, Inicio, Asignatura con los 4 estados, Ajustes con importación correcta/rechazada/versión anterior, los 9 tipos antes y después del feedback, sesión real, examen real, resumen): **0 violaciones**. Defectos reales corregidos: `div` sin rol con `aria-label` en «ordenar» (`OrderQuestion.tsx`), opciones cuyo texto es solo una fórmula sin nombre accesible (`RichText` pone ahora `role="img"` + `aria-label` con `plainText` de `src/domain/render/plain.ts`), foco visible de 3 px y objetivos ≥ 44 px (`global.css`).
- **Rendimiento (medido en PC, Chrome):** restaurar una copia de 6 000 preguntas / 20 000 intentos = 3,4–7,0 s (objetivo 20 s) ✔; importar un paquete de 2 000 preguntas = 0,8 s (objetivo 6 s) ✔.

**FALLO ABIERTO (real, no del test): el Inicio tarda ~9,7 s con 6 000 preguntas y 20 000 intentos** (objetivo 1,5 s; `e2e/performance.spec.ts`, paso `home`). Antes de ese paso no se había medido nada más (abrir asignatura, «Estudiar» con 2 000 ítems, responder con historial completo, exportar copia/progreso): el test se detiene en el primer fallo. Sospecha: `getHomeView`/`getSubjectView` (`src/data/views.ts`, `viewModels.ts`) cargan el catálogo completo (6 000 filas con su `data` JSON) y leen todos los intentos para calcular racha, último día y repasos de hoy.

## Qué falta (en este orden)
1. **Arreglar el rendimiento del Inicio** (nueva tarea `docs/tasks/M9-2.md`, esfuerzo high, a Codex): leer solo lo necesario — `blockState`/`itemState` cacheados (ya coherentes con la reconstrucción), pesos de bloques sin cargar `data`, `studyDay` de los intentos con índices (`attempts.orderBy('studyDay').uniqueKeys()`, `[subjectId+studyDay]` para el último día), repasos de hoy recorriendo `itemState` por `due`. Sin cambiar resultados (los tests de `views` deben seguir iguales y añadir uno de equivalencia con 20 000 intentos). Después medir con `npx playwright test e2e/performance.spec.ts` (los pasos `subject`, `session`, `answer`, `exports` aún sin medir; si «Estudiar» o responder superan su presupuesto, optimizar `startStudySession`/`recordAttempt`: ya existen el camino incremental y la opción de catálogo precargado).
2. **Revisión adversarial de la capa de aplicación**: salida en `$TEMP/adv-app.txt` (se lanzó con `--base 6ae5e65`; si no existe, relanzar con `node ~/.claude/plugins/cache/openai-codex/codex/1.0.6/scripts/codex-companion.mjs adversarial-review --wait --base 6ae5e65 "foco"` en segundo plano). Corregir los hallazgos reales con una tarea nueva.
3. **Revisión visual**: `E2E_SCREENSHOTS=1 npx playwright test e2e/screenshots.spec.ts` genera PNG en `docs/results/capturas/` (claro y oscuro); mirarlas con la herramienta de lectura de imágenes y corregir lo feo/ilegible (contraste del rojo de KaTeX en oscuro, ADR-025).
4. **Cierre de M9**: `docs/results/RESULTADO-M9.md` (tiempos reales medidos, accesibilidad, capturas) y `PARA-REVISAR-M9.md`; actualizar este archivo.
5. **Cierre del proyecto**: `docs/results/RESULTADO-FINAL.md` con la URL (`https://graudiazjuan212-cyber.github.io/app-estudio/`) y cómo instalar en Android (copiar del `README.md`); añadir en `docs/QUESTIONS.md` la pregunta de publicación (opción por defecto: no publicar hasta que conteste); `docs/PENDIENTE-JUAN.md` con: autorizar `git push`, activar Pages (origen «GitHub Actions»), hacer `docs/PRUEBA_MOVIL.md` en su Android, importar sus paquetes reales.
6. **Último `npm run check` + `npm run e2e` en verde** antes del cierre y dejar `git status` limpio.

## Siguiente paso exacto
Escribir `docs/tasks/M9-2.md` (rendimiento del Inicio y la Asignatura, ver punto 1; incluir los números medidos arriba y el criterio «mismas salidas, menos lecturas»), delegarlo con el agente `codex:codex-rescue` (`--write --effort high`), verificar con `npm run check` y `npm run e2e` (el E2E de rendimiento debe llegar al final sin fallar), y comitear.

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
1. Rendimiento del Inicio con 6 000 preguntas / 20 000 intentos (~9,7 s vs 1,5 s). Ver arriba.

## Pendientes de Juan
Ver `docs/PENDIENTE-JUAN.md` y `docs/QUESTIONS.md`.
