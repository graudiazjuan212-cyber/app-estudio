# App de estudio

Andamiaje de una PWA personal con React y TypeScript. Usa Node 22.12 o superior (CI: Node 22).

- Instalar dependencias: `npm ci`.
- Instalar solo Chromium para las pruebas: `npx playwright install chromium` (Linux CI: añadir `--with-deps`).
- Desarrollo accesible desde el móvil: `npm run dev -- --host`.
- Tipos, lint, tests unitarios y build: `npm run check`.
- Prueba Android Pixel 7 sobre el build de producción: `npm run e2e`.
- Previsualizar: `npm run build` y `npm run preview`; abrir `/app-estudio/`.
- Regenerar iconos: `node scripts/make-icons.mjs`.

En PowerShell con scripts bloqueados, usar `npm.cmd` y `npx.cmd`.
El workflow publica `dist` en GitHub Pages al enviar cambios a `main`; requiere Pages con origen GitHub Actions.
