# Prompt de inicio para Claude Code

Pega TODO lo que hay debajo de la línea en Claude Code, abierto en la carpeta `app-estudio`, después de haber hecho la guía `docs/SETUP_CODEX.md`.

---

Eres el director técnico de este proyecto. Lee, en este orden, `CLAUDE.md` y `docs/BRIEF.md`. Ahí está todo: el producto, las restricciones, la arquitectura recomendada, los formatos de datos, los hitos y cómo trabajamos tú y Codex.

**FASE 1 — Solo planificar (no escribas código de la app todavía).**
1. Comprueba el entorno y dime solo lo que falle: `node -v` (≥ 20), `npm -v`, `git --version`, y que el plugin de Codex funciona (`/codex:setup`). Si la carpeta no es un repositorio git, ejecuta `git init`.
2. Si algo del BRIEF te parece mejorable (arquitectura, librerías, hitos), decídelo tú con el criterio de la sección 10 del BRIEF y justifícalo en `docs/DECISIONS.md` (formato ADR corto: contexto, decisión, alternativas, consecuencias).
3. Escribe `docs/PLAN.md`: hitos con objetivo, entregables, criterios de aceptación verificables, tests obligatorios, qué parte hace Codex y qué revisas tú, y esfuerzo de Codex previsto (medium/high). Marca los hitos críticos que llevan `/codex:adversarial-review`.
4. Pide a Codex una revisión adversarial del plan (`/codex:adversarial-review` sobre `docs/PLAN.md` y `docs/DECISIONS.md`, enfocada en riesgos de pérdida de datos, offline en iPhone y lógica de repaso). Integra lo que tenga sentido y anota lo que descartes y por qué.
5. Crea `docs/PROGRESS.md` (vacío salvo «Fase 1 completada») y `docs/QUESTIONS.md` con lo que solo yo puedo decidir, cada pregunta con tu opción por defecto.
6. Haz commit: `docs: plan inicial`.
7. **Párate y dame un resumen en español de máximo 15 líneas**: qué vas a construir, hitos en una línea cada uno, decisiones importantes que cambian el BRIEF y preguntas abiertas (si las hay). Termina con: «Escribe *aceptar* para empezar a programar».

**FASE 2 — Cuando escriba «aceptar».**
Trabaja hito a hito siguiendo `CLAUDE.md`, sin pedirme confirmación entre hitos:
- Por cada tarea: commit de seguridad → especificación en `docs/tasks/` → `/codex:rescue` con esa especificación (en primer plano, `--wait`; en segundo plano con `--background` solo si mientras tanto haces trabajo independiente) → revisas el diff y ejecutas `npm run check` → si falla, devuelves a Codex con `--resume` y los fallos concretos (máximo 3 vueltas; después lo resuelves tú) → commit.
- En los hitos críticos, `/codex:adversarial-review` antes del commit final del hito.
- Al terminar cada hito: actualiza `docs/PROGRESS.md`, haz `/compact` y sigue con el siguiente.
- Solo me interrumpes si algo bloquea TODO el trabajo; lo demás va a `docs/QUESTIONS.md` con opción por defecto y sigues.
- Sigue hasta terminar la v1 o hasta que se agote el uso. Antes de que se agote, deja el proyecto compilando y `docs/PROGRESS.md` al día para que la siguiente sesión retome con: «Lee CLAUDE.md y docs/PROGRESS.md y continúa».
- Al terminar la v1: resumen para mí (máx. 15 líneas) con cómo probarla en el móvil y qué falta para publicarla.
