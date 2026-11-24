# RESULTADO FINAL — App de estudio

**Estado: terminada y PUBLICADA** el 2026-11-24 (autorizado por Juan). Pendiente solo la pregunta 7 de `docs/QUESTIONS.md` y la prueba en tu Android.

## La app
- **Dirección:** https://graudiazjuan212-cyber.github.io/app-estudio/
- Hitos M0–M9 cerrados. Repositorio público https://github.com/graudiazjuan212-cyber/app-estudio, rama `main`; se despliega solo con cada `git push` (GitHub Actions: check + E2E + Pages).
- Verificación final: `npm run check` verde (1379 tests, lint a 0 avisos, build) y `npm run e2e` verde (153 pasan, 2 omitidos que son solo de capturas, 0 fallos). Revisión adversarial de M9-3: aprobada sin hallazgos.
- Duración de la sesión: se elige al empezar (1, 5, 10, 15 o 30 min; 10 por defecto) y se puede cambiar el valor por defecto en Ajustes.
- Medido en PC con 6 000 preguntas y 20 000 intentos: Inicio 0,4 s, abrir asignatura 0,1 s, empezar a estudiar 0,4 s, responder 0,1 s, copia de seguridad 0,8 s.

## Cómo instalarla en tu Android
1. Abre la dirección de arriba en **Chrome**.
2. Menú **⋮** (arriba a la derecha) → **«Instalar aplicación»** (o «Añadir a pantalla de inicio»).
3. Ábrela desde el icono **Estudio**.
4. En **Ajustes → «Proteger almacenamiento»** pulsa el botón, para que Android no borre tus datos si le falta espacio.
5. Para cargar contenido: **Ajustes → «Elegir archivo» → «Importar»** con el `.json` que te da el proyecto de cada asignatura. Más detalle en el `README.md`.

Funciona sin internet una vez instalada.

## Lo que tienes que hacer tú (también en `docs/PENDIENTE-JUAN.md`)
1. Decidir cuándo reabrir la pregunta **7** de `docs/QUESTIONS.md` (sesión sin terminar: hoy sí cuenta; «no por ahora»).
3. Seguir `docs/PRUEBA_MOVIL.md` en tu Android (es el criterio de aceptación de M8 y solo tú puedes hacerlo).
4. Importar tus paquetes reales y hacer la primera copia de seguridad.

## Lo que no se ha podido comprobar
- iPhone/Safari: WebKit no se instala en este equipo.
- Rendimiento en un móvil real: solo estimado (×3–5 sobre el PC: Inicio ≈ 1,3–2,1 s).
- Instalación en un Android real desde la dirección pública: solo comprobada con E2E (Chrome de escritorio) y con la lista de `docs/PRUEBA_MOVIL.md` pendiente.

## Dónde mirar
`docs/PROGRESS.md` (estado), `docs/results/RESULTADO-M0…M9.md` y `PARA-REVISAR-*.md` (cierres), `docs/DECISIONS.md` (ADR-001…027), `docs/diario-friccion.md` (lecciones).
