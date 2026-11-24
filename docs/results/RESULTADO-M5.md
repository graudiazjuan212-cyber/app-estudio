# RESULTADO M5 — Pantallas y flujo de estudio

Estado: **cerrado** (commits `c520729` M5-1, `7f82b17` M5-2, `d455e40` M5-3). Especificaciones: `docs/tasks/M5-1…M5-3.md`.

## Qué se hizo
- **Servicios** (`src/data/`): `settings`, `views` (`getHomeView`, `getSubjectView`), `study` (`startStudySession`, `loadSessionRun`, `submitAnswer`, `finishStudySession`, `getSessionSummary`), `appStorage`. La UI no toca IndexedDB.
- **Router**: `#/`, `#/ajustes`, `#/asignatura/<id>`, `#/sesion/<id>`, `#/resumen/<id>` (+ `#/demo` solo en E2E); ids validados, cualquier otra cosa vuelve a Inicio.
- **Arranque seguro** (`DataProvider`): pantallas para «versión nueva», «otra pestaña actualizó», «bloqueada», «migración fallida», «sin IndexedDB».
- **Pantallas**: Inicio (racha, objetivo, recordatorio de copia, «Continuar sesión», asignaturas con %, repasos y último día), Asignatura (capítulos, bloques con estado + bloqueo en texto, Repasar capítulo, Mini examen), Ajustes (importar archivo o pegar JSON con informe de errores y confirmación de versión anterior, preferencias, copia/restaurar/deshacer, almacenamiento), Sesión (progreso, salir, terminar, reanudar tras recargar, `attemptId` por pregunta, reintentar), Resumen (aciertos, puntos ciegos, capítulos que cambian, racha, objetivo, examen superado o no).

## Verificaciones (ejecutadas por Claude)
- `npm run check`: **1180** tests unitarios (963 → 1146 → 1170 → 1180).
- `npm run e2e`: **44** E2E en Chrome (Pixel 7): smoke 1, preguntas 23, importación/copias 10, estudio 10. Cubren: importar por archivo y pegado, paquete inválido/vacío/no JSON, reimportar, v2 y versión anterior con confirmación, preferencias persistentes, exportar/restaurar/deshacer y copia corrupta, flujo completo de estudio, **interrupción con recarga**, doble toque = un intento, **fallo de guardado + Reintentar**, mini examen superado/no superado, **dos días (reloj de E2E): bloque 1 pasa a Dominado y el 2 se desbloquea; un mes después hay repasos**, ítem archivado durante la sesión.
- Defectos que solo aparecieron al ejecutar (Codex no puede): radios de Ajustes con parpadeo (`useAsync` borraba los datos al recargar; ahora los conserva), diálogo que no devolvía el foco al botón desactivado, enlace de humo ambiguo, reloj de E2E que se reiniciaba al recargar, 3 avisos de lint en los E2E.
- Un valor de mi especificación era incorrecto (repasos a los 3 días): corregido en `M5-3.md`.

## No hecho / diferido
Recordatorio de actualización y de «sin conexión», guía de instalación y `persist()` en el primer uso: M7. Accesibilidad automática y rendimiento con 6 000 preguntas: M9.
