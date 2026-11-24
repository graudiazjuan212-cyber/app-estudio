# PARA REVISAR — M4 y M5 (autoauditoría)

a) **¿Qué queda a medias?** Aviso de actualización, indicador sin conexión, guía de instalación y petición de almacenamiento persistente (M7); botón «Exportar progreso para Claude» (M6-2); accesibilidad automática, contraste en oscuro y rendimiento con 6 000 preguntas (M9); README para Juan y lista de prueba en el móvil (M8).

b) **¿Qué pasa con una entrada inválida o ausente?** Paquete inválido/vacío/no JSON ⇒ se muestra el informe de errores y no se importa nada. Sesión o asignatura inexistente ⇒ mensaje con enlace a Inicio. Ruta con id raro ⇒ Inicio. Error de guardado de una respuesta ⇒ aviso con «Reintentar» (misma respuesta, mismo `attemptId`), sin feedback hasta guardar. Copia corrupta ⇒ «No se ha cambiado nada».

c) **¿Qué podría romperse en otra parte?**
   - `useAsync` ahora conserva los datos anteriores durante la recarga: las pantallas pueden mostrar «Cargando…» **y** datos viejos a la vez un instante; si en M9 se ve feo, distinguir `loading` inicial de recarga.
   - El reloj de E2E (`window.__ESTUDIO_NOW__` y `sessionStorage['estudio-test-now']`) solo existe con `VITE_ENABLE_DEMO=true`; hay una comprobación de que `dist` no lo contiene.
   - Cualquier botón nuevo debe medir ≥ 44 px (los E2E de M5 lo comprueban en `afterEach`).
   - En Chrome de escritorio `navigator.canShare` existe y «Exportar copia» abre la hoja de compartir del sistema en lugar de descargar; en Android (objetivo) es lo deseado.
   - `getSubjectView`/`getHomeView` leen las cachés (`blockState`, `itemState`): si algún día se cambiara una regla de dominio, hay que llamar a `rebuildCache` (migración deliberada, ADR-002).

d) **Riesgos asumidos:** textos de la interfaz escritos en español de España a mano en los componentes (no hay sistema de traducción: v1 solo en español).

e) **Calidad de los tests:** los E2E calculan las respuestas correctas **leyendo el JSON del paquete** (no la página) y usan el reloj fijo; lo que Codex no puede ejecutar (E2E, Vitest) lo ejecuta Claude tras cada tarea.
