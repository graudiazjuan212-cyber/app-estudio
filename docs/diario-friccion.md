# Diario de fricción (solo se añade)

- #codex #windows #sandbox — El sandbox de Codex (`workspace-write`, `network_access=false`) bloquea la red: `npm install` da `EACCES` al conectar con registry.npmjs.org. Con red permitida falla además la caché de npm fuera del proyecto (`EPERM`). Decisión: Codex no ejecuta npm; Claude instala y verifica. Diagnóstico reproducible con `codex sandbox -- npm view react version`.
- #tests #pwa — Un informe de Codex que decía «hecho» ocultaba dos fallos reales (base de `vite preview`, favicon) que solo salieron al ejecutar el E2E. Verificar siempre ejecutando.
- #windows #playwright — La descarga de Chromium de Playwright se quedó colgada en la extracción (antivirus/disco). Solución: `channel: 'chrome'` con el Chrome instalado.
- #vite — `vite preview` se ejecuta con `command === 'serve'`; para distinguir hay que usar `isPreview`.
- #codex #tests — Codex no puede ejecutar vitest ni playwright (sandbox) y su informe dice «TypeScript y ESLint pasan» sin haber corrido los tests. Cada entrega de M3–M5 tuvo algo que solo apareció al ejecutar (índice de IndexedDB que faltaba, expectativas de KaTeX, tipos de markdown-it, E2E de foco/radios/reloj, lint de e2e). Regla: nunca dar por buena una entrega sin `npm run check` + `npm run e2e` propios.
- #codex #windows — Codex a veces guarda archivos con BOM; el test `src/repo-hygiene.test.ts` lo detecta junto con los archivos de más de 300 líneas.
- #codex — Cuando una especificación se contradice con tests antiguos (router M0 vs M5-1), Codex se detiene y pregunta: decidir como director y relanzar con la decisión y la frase «no te detengas a preguntar».
- #tests #pwa — `page.goto('./')` recarga el documento: el reloj falso de E2E debe persistir en `sessionStorage`, no solo en `window`.
- #tests — `getByText('Dominado', {exact:true})` no encuentra «✓ Dominado»; usar regex. Un `check()` de Playwright sobre un radio controlado asíncrono falla si el control se desmonta al recargar los datos: mantener los datos previos durante la recarga (stale-while-revalidate).
- #windows #shell — Un comando de Bash con `$$` dentro de un script de Python fue bloqueado por la comprobación de seguridad («posible rm -rf»); evitarlo y editar con la herramienta Edit.
- #ts-fsrs — `ts-fsrs` 6.x deja obsoleta la API síncrona y usa FSRS-7 por defecto; se fijó 5.4.2 (ADR-022).
