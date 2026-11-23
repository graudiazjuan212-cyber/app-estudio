# CLAUDE.md — App de estudio (uso personal de Juan)

Lee esto al empezar cada sesión. El detalle del producto está en `docs/BRIEF.md`; el plan y el estado, en `docs/PLAN.md` y `docs/PROGRESS.md`.

## Roles
- **Claude Code (Opus, esfuerzo alto) = director técnico.** Planifica, escribe las especificaciones de cada tarea, revisa cada diff, ejecuta los controles de calidad y decide. No delega decisiones de arquitectura.
- **Codex (vía plugin `codex@openai-codex`) = programador principal.** Implementa las tareas que Claude especifica (`/codex:rescue`) y hace revisiones cruzadas (`/codex:review`, `/codex:adversarial-review`).
- **Juan = dueño del producto.** Solo decide lo que está en `docs/QUESTIONS.md`. No es programador: los resúmenes para él, en español, cortos y sin jerga.

## Reglas de trabajo
1. **Nunca se programa sin plan aprobado.** Fase de planificación → resumen a Juan → esperar «aceptar».
2. **Un hito cada vez** (`docs/PLAN.md`). Cada hito: especificación → implementación (Codex) → revisión (Claude) → `npm run check` en verde → commit.
3. **Antes de delegar en Codex, commit** del estado actual (punto de vuelta atrás). Una tarea delegada = un archivo `docs/tasks/<hito>-<n>.md` con: objetivo, archivos a tocar, interfaces, criterios de aceptación y tests obligatorios.
4. **Revisión de Claude obligatoria** de todo diff de Codex: legibilidad, tipos, casos límite, accesibilidad, que los tests prueban algo de verdad. Si no pasa, se devuelve a Codex con `/codex:rescue --resume` y los fallos concretos.
5. **Revisión adversarial de Codex** (`/codex:adversarial-review`) en los hitos críticos: esquema e importación de paquetes, almacenamiento/copias de seguridad, planificador de repasos y exportación de progreso. También sobre código que escriba Claude.
6. **No activar el review gate** del plugin (`--enable-review-gate`): puede crear bucles Claude↔Codex que agotan el uso.
7. **Calidad mínima para hacer commit:** `npm run check` = typecheck + lint + tests unitarios + build. Los hitos con UI añaden tests E2E (Playwright, viewport móvil).
8. **Sin dependencias innecesarias.** Cada dependencia nueva se justifica en `docs/DECISIONS.md`. Nada de servicios de pago, APIs de IA ni backends: coste 0 €.
9. **Datos personales fuera del repositorio.** Los paquetes reales de contenido y el progreso viven solo en el móvil. En el repo, solo paquetes de ejemplo inventados (`fixtures/`).
10. **Memoria entre sesiones:** al terminar cada hito, actualizar `docs/PROGRESS.md` (qué está hecho, qué falta, decisiones, problemas abiertos). Una sesión nueva empieza leyendo `CLAUDE.md` → `docs/PROGRESS.md` → `docs/PLAN.md`. Hacer `/compact` entre hitos.
11. **Si algo solo lo puede decidir Juan:** anotarlo en `docs/QUESTIONS.md` con la opción por defecto propuesta, seguir con otro hito que no dependa de ello y avisarle en el siguiente resumen.
12. **Si se acaba el uso** a mitad de un hito: dejar `docs/PROGRESS.md` al día y el árbol de trabajo en un estado que compile (o en un commit anterior que compile).

## Esfuerzo y modelos
- Claude: Opus en esfuerzo alto para planificar, especificar y revisar. Juan tiene plan Pro (límites de uso ajustados): si Juan cambia a Sonnet para la fase de programación, se sigue igual, pero los hitos críticos (sección «Reglas», punto 5) se revisan con especial cuidado y siempre con `/codex:adversarial-review`. Para tareas mecánicas propias (renombrar, mover, docs) se puede bajar el esfuerzo.
- Ahorro de uso: Codex escribe el grueso del código; Claude no reescribe lo que Codex ya hizo bien; leer solo los archivos necesarios; `/compact` entre hitos.
- Codex: `--effort medium` por defecto; `--effort high` para planificador de repasos, validación de importación, migraciones de base de datos y cualquier tarea que haya fallado una vez. No usar modelos «spark»/rápidos para lógica de dominio.

## Convenciones
- TypeScript estricto, sin `any`. Código y nombres en inglés; textos de la interfaz y documentación para Juan en español de España.
- Componentes pequeños, lógica de dominio pura en `src/domain/` (sin React ni IndexedDB) y con tests unitarios.
- Commits convencionales (`feat:`, `fix:`, `test:`, `docs:`, `chore:`).
