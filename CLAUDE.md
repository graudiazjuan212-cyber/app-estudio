# CLAUDE.md — App de estudio (uso personal de Juan)

Lee esto al empezar cada sesión. El detalle del producto está en `docs/BRIEF.md`; el plan y el estado, en `docs/PLAN.md` y `docs/PROGRESS.md`. Codex lee `AGENTS.md` (mismas reglas, versión para quien programa).

## Roles (quien programa no revisa su propio trabajo)
- **Claude Code = director técnico y revisor.** Planifica, escribe la especificación de cada tarea, verifica y decide. No da por bueno nada que no haya comprobado en disco, en los tests o en `git log`.
- **Codex (plugin `codex@openai-codex`) = programador principal.** Implementa lo que Claude especifica (`/codex:rescue`) y hace revisiones cruzadas (`/codex:review`, `/codex:adversarial-review`), también del código que escriba Claude.
- **Juan = dueño del producto.** Casi no va a responder preguntas: solo decide lo que esté en `docs/QUESTIONS.md` y lo que exige permiso (ver «Límites»). Los resúmenes para él, en español, cortos y sin jerga.

## Flujo
1. **Sin plan aprobado no se programa.** Fase de planificación → resumen a Juan → esperar «aceptar».
2. **Un hito cada vez** (`docs/PLAN.md`), con tabla de estado: Cerrado / Con fallo abierto / Sin implementar.
3. **Antes de empezar un hito: verifica tú el estado real** (archivos, tests, `git status` limpio). No te fíes de lo que diga un documento de cierre anterior.
4. **Cada tarea delegada = `docs/tasks/<hito>-<n>.md`** con esta estructura (la que funcionó en el proyecto anterior de Juan):
   1. Contexto y por qué importa.
   2. Estado verificado: archivos, líneas, casos reales (si es una corrección, el fallo con fichero y línea).
   3. Lo que quiero (criterios de aceptación comprobables).
   4. Lo que NO hay que hacer.
   5. Verificación exigida (tests concretos, positivo y negativo de cada regla).
   6. Reglas de siempre (bloque de `AGENTS.md`).
5. **Commit de seguridad antes de delegar.** Luego `/codex:rescue` con la especificación.
6. **Verificación externa obligatoria** de lo que entregue Codex: leer el diff completo, ejecutar `npm run check`, contar los tests (número exacto, antes → después) y comprobar que cada criterio de aceptación tiene código y test que lo prueban. «El informe dice que está hecho» no es una prueba.
7. Si no pasa: devolver a Codex con `--resume` y los fallos concretos (fichero, línea, caso). Máximo 3 vueltas; después lo resuelves tú.
8. **Revisión adversarial** (`/codex:adversarial-review`) antes de cerrar los hitos críticos: esquema e importación de paquetes, almacenamiento/migraciones/copias, planificador de repasos y exportación de progreso.
9. **Cierre de hito:** `docs/results/RESULTADO-<hito>.md` (qué se hizo, verificaciones con su salida resumida, número de tests) y `docs/results/PARA-REVISAR-<hito>.md` (autoauditoría con preguntas numeradas a), b), c)… que incluya siempre: qué queda a medias, qué pasa con una entrada inválida o ausente, qué podría romperse en otra parte). Commit. Actualizar `docs/PROGRESS.md`. `/compact`.
10. **Correcciones pequeñas:** sin especificación larga, pero con la misma verificación.

## Reglas de código (evitaron bugs en el proyecto anterior)
- Ningún archivo de código por encima de **300 líneas**.
- Ninguna dependencia nueva sin justificarla en `docs/DECISIONS.md`. Las dependencias las instala Claude, no Codex.
- Sin valores mágicos repartidos: constantes y parámetros (pesos 1/3/5, umbral de dominio 80 %, intervalos, retención FSRS) en un único módulo de configuración.
- Arquitectura por capas sin saltos: `domain/` (lógica pura) ← `data/` (IndexedDB) ← `ui/`. La UI no habla directamente con IndexedDB.
- **Fallar abierto con los datos de Juan:** un paquete o una copia que no se entiende se rechaza con mensaje claro y NUNCA borra ni sobrescribe progreso. Las preguntas eliminadas de un paquete se archivan, no se borran.
- **Migraciones de base de datos con copia previa automática** y test de migración desde la versión anterior.
- Nada de evaluar rutas, fechas u otros valores de entorno al importar un módulo: funciones.
- TypeScript estricto, sin `any`. Código en inglés; interfaz y documentos para Juan en español de España.
- Commits convencionales `tipo(ámbito): …` (`feat(scheduler): …`, `fix(import): …`), uno por cambio lógico.

## Tests
- Unitarios (Vitest) para todo `domain/`; E2E (Playwright, perfil Android) para los flujos principales.
- **Datos de prueba fijos e independientes** en `tests/fixtures/`: nunca construir el caso esperado copiando lo que hace el código probado.
- Planificador y dominio: **pruebas deterministas** con historiales de respuestas fijos y fechas fijas (reloj inyectado). Tabla antes → después cuando se cambie la lógica, con cada caso que cambia y su motivo.
- Positivo y negativo de cada regla nueva (p. ej., «un paquete con ids duplicados se rechaza» y «uno válido se acepta»).
- Ningún test toca la red ni servicios reales.
- `npm run check` = `tsc --noEmit` + lint + Vitest + build. En rojo → no hay commit. Hitos de PWA: auditoría Lighthouse (PWA/offline) en el resultado.

## Límites (permisos)
- **Commits locales: autónomos** (son reversibles). **`git push` y despliegue: solo con autorización explícita de Juan** (se pedirá en el hito de publicación). Bloqueado en `.claude/settings.json`.
- Nada de `rm -rf`, `git reset --hard` ni reescribir historia.
- No leer ni crear `.env` con secretos (no hacen falta: no hay backend).

## Registro
- `docs/PROGRESS.md`: estado por hito, último commit, número de tests, fallos abiertos, **decisiones cerradas que no se reabren**, pendientes de Juan. Una sesión nueva arranca leyendo `CLAUDE.md` → `docs/PROGRESS.md` → `docs/PLAN.md`.
- `docs/PENDIENTE-JUAN.md`: lo que Juan tiene que hacer a mano. **Solo se añade** (no reescribir).
- `docs/diario-friccion.md`: lecciones aprendidas con etiquetas (`#codex`, `#windows`, `#tests`, `#pwa`…). **Solo se añade.** Servirá para sacar skills al final.
- `docs/QUESTIONS.md`: lo que solo Juan puede decidir, con opción por defecto. Mientras no conteste, se sigue con la opción por defecto si es reversible.

## Esfuerzo, modelos y uso
- Claude: Opus en esfuerzo alto para planificar, especificar y revisar. Juan tiene plan Pro: si cambia a Sonnet para programar, se sigue igual, pero los hitos críticos se revisan con especial cuidado y siempre con `/codex:adversarial-review`.
- Codex: `--effort medium` por defecto; `--effort high` para planificador, validación de importación, migraciones y cualquier tarea que haya fallado una vez. No usar modelos rápidos/«spark» para lógica de dominio.
- Ahorro: Codex escribe el grueso; Claude no reescribe lo que ya está bien; leer solo lo necesario; `/compact` entre hitos. **No activar el review gate** del plugin (bucles que agotan el uso).
- Si se acaba el uso a mitad de un hito: `docs/PROGRESS.md` al día y el proyecto compilando (o en el último commit que compila).
