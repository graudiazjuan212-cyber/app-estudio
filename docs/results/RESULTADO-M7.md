# RESULTADO M7 — Offline, instalación, actualización, persistencia

Estado: **cerrado** (commits `58932d3` M7-1 y M7-2). Especificaciones: `docs/tasks/M7-1.md`, `M7-2.md`.

## Qué se hizo
- **Actualización con consentimiento** (ADR-013): `registerType: 'prompt'`; aviso «Hay una versión nueva de la app.» con «Actualizar» y «Más tarde»; **nunca aparece durante una sesión**; sin `skipWaiting` ni `clientsClaim` automáticos. Comprobación al volver a la app tras ≥ 30 min.
- **Sin conexión**: precarga de JS/CSS/HTML/iconos y de las fuentes `.woff2` de KaTeX, `navigateFallback`, `cleanupOutdatedCaches`; franja «Sin conexión: puedes seguir estudiando…»; aviso único «Lista para usar sin conexión».
- **Instalación**: guía Android/iPhone en Ajustes, botón «Instalar la app» si el navegador lo ofrece, detección de «ya instalada»; manifiesto con `id`, categoría y orientación.
- **Persistencia**: petición de `persist()` tras la primera importación (una vez, `meta.persistAsked`), aviso del resultado.
- Versión visible en Ajustes (`VITE_APP_VERSION`).

## Verificaciones (ejecutadas por Claude)
- `npm run check`: **1256** tests unitarios + 16 del servidor estático (`node --test`) + 3 de comprobación del build (`dist`: sw.js con fuentes KaTeX, manifiesto, sin demo).
- `npm run e2e`: **56** (51 anteriores + 5 de PWA con servidor estático propio y dos builds reales A/B):
  1. **Arranque en frío sin red**: tras instalar el SW y cerrar todo, con el servidor **apagado** y `offline`, la app abre, conserva datos, estudia con fórmulas (fuente KaTeX cargada), guarda y reabre con lo guardado.
  2. **Actualización real A→B**: el aviso aparece sin recargar solo, desaparece durante la sesión, reaparece al salir; «Actualizar» recarga en B conservando datos y sesión abierta; B arranca sin red.
  3. «Más tarde» oculta el aviso hasta recargar. 4. Dos pestañas tras actualizar: la otra sigue funcional. 5. Persistencia solo en la primera importación y guía Android.
- Defectos que solo aparecieron al ejecutar: acentos sustituidos por `?` en 7 archivos de Codex (restaurados; guardia nuevo en `src/repo-hygiene.test.ts`); tests de `dist` que leían un build antiguo (ahora `*.dist.test.ts` tras el build: `npm run test:dist`); `ready()` de los E2E debía recargar una vez porque, sin `clientsClaim`, la primera carga no queda controlada hasta la siguiente; aviso de almacenamiento obsoleto tras segunda importación; tipos de proyecto TS; lint de hooks por un parámetro llamado `use`.

## No ejecutado / límites
- **WebKit/iPhone (ADR-018): no ejecutado.** La descarga de WebKit de Playwright falla en este equipo igual que la de Chromium (extracción). El proyecto `iphone` queda como opcional con `E2E_WEBKIT=1` (`e2e/webkit.spec.ts`).
- La lista manual en el Android real está en `docs/PRUEBA_MOVIL.md` (pendiente de Juan).
