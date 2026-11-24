# Diario de fricción (solo se añade)

- #codex #windows #sandbox — El sandbox de Codex (`workspace-write`, `network_access=false`) bloquea la red: `npm install` da `EACCES` al conectar con registry.npmjs.org. Con red permitida falla además la caché de npm fuera del proyecto (`EPERM`). Decisión: Codex no ejecuta npm; Claude instala y verifica. Diagnóstico reproducible con `codex sandbox -- npm view react version`.
- #tests #pwa — Un informe de Codex que decía «hecho» ocultaba dos fallos reales (base de `vite preview`, favicon) que solo salieron al ejecutar el E2E. Verificar siempre ejecutando.
- #windows #playwright — La descarga de Chromium de Playwright se quedó colgada en la extracción (antivirus/disco). Solución: `channel: 'chrome'` con el Chrome instalado.
- #vite — `vite preview` se ejecuta con `command === 'serve'`; para distinguir hay que usar `isPreview`.
