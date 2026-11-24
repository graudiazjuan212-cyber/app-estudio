# Verificación de M7-2

Pendiente de ejecución por Claude: Codex no ha ejecutado npm, builds, tests ni instalado dependencias.

- `npm run e2e`: los 51 tests existentes de Android, 5 nuevos de PWA; iPhone no se registra por defecto.
- `npm run e2e -- --project=pwa`: solo PWA, sin arrancar el preview compartido.
- `node --experimental-strip-types --test e2e/support/static-server.test.ts`: 16 tests de Node (Node 22 con soporte para strip-types o posterior), sin navegador ni conexión externa.
- WebKit: **no ejecutado** en este equipo, según ADR-018/020. Solo se registra `iphone` con `E2E_WEBKIT=1`; quien lo active debe disponer de WebKit. Añade 1 test.

En PowerShell: `$env:E2E_REBUILD='1'` fuerza reconstruir A/B. Para depurar, `npm run e2e -- --project=pwa --headed` o `$env:PWDEBUG='1'` antes del comando. Tras depurar, elimina las variables que hayas establecido.

Las variantes se construyen dentro del worker PWA, con `npm.cmd` en Windows y `npm` en otros sistemas. El cacheo compara el mtime de la carpeta con el archivo más reciente bajo `src/`, como pide la tarea; cambios fuera de `src/` requieren `E2E_REBUILD=1`. Un build incompleto sin `index.html` o `sw.js` también se reconstruye.

Cada caso PWA tiene contexto y puerto nuevos, cierra su servidor al terminar (también ante fallo) y usa el reloj fijo del build de pruebas. Los casos sin red cierran las páginas, ponen el contexto sin conexión y detienen el servidor. El cierre se repite de forma segura durante el teardown; los recursos se liberan por test, antes de `afterAll`.

El filtro de consola ignora exclusivamente `net::ERR_…` con URL HTTP externa. No oculta errores de JavaScript, errores sin URL ni errores de recursos locales de la app. Los tests HTTP solo usan loopback; las pruebas PWA no necesitan servicios externos.

Precisiones respecto al texto de la tarea:

- Playwright configura `webServer` globalmente, no por proyecto. Se mantiene para Android/iPhone sin modificar sus tests; PWA siempre usa su servidor propio y nunca ese preview. Se omite el servidor global si solo se selecciona `pwa`.
- El servidor se cierra en el teardown de cada test en vez de esperar a `afterAll`, para garantizar el aislamiento solicitado.
- «Estudiar» crea una sesión nueva; «Continuar» recupera una sesión abierta. Se comprueban ambos flujos sin cambiar M7-1 ni el comportamiento de la app.
- Los archivos `.png`/`.woff2` de `tests/fixtures/static-server/` contienen bytes fijos de prueba de transporte: no se usan para renderizar. Las fórmulas offline usan las fuentes reales de los builds A/B.

La suite Node queda fuera del descubrimiento de Playwright (`testMatch` solo `.spec.ts`) y de Vitest (solo `src/`). Todos los resultados, incluido lint y los 51 tests previos, están pendientes de verificación por Claude.
