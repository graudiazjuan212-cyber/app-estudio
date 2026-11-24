# RESULTADO M9 — Pulido (accesibilidad, rendimiento, integridad, revisión visual)

Commits: `8a26915` (M9-1), `c2598ce` (M9-2), `459dde0` (M9-3) y el de este cierre.

## Verificaciones finales
- `npm run check`: typecheck, lint a 0 avisos, **1340 tests de Vitest** (antes de M9: 1282), 16 `node --test`, build y 4 tests sobre `dist`.
- `npm run e2e`: **149 pasan, 2 omitidos** (capturas, solo con `E2E_SCREENSHOTS=1`), 0 fallos. Antes de M9-2/M9-3: 145 pasan y 1 falla.
- Chrome instalado (ADR-020). **WebKit/iPhone no se ha podido probar** (la descarga falla en este equipo).

## M9-1 Accesibilidad (axe, `e2e/a11y.spec.ts`, 88 casos)
Claro/oscuro × tema del sistema/forzado, Inicio, Asignatura, Ajustes (importación correcta/rechazada), los 9 tipos de pregunta antes y después del feedback, sesión, examen y resumen: **0 violaciones**. Corregido: `role="group"` en «ordenar», nombre accesible para opciones que son solo una fórmula (`plainText`), foco visible de 3 px y objetivos ≥ 44 px.

## M9-2 Integridad (3 hallazgos altos de la revisión adversarial)
1. Dos pestañas con la misma sesión ya no guardan dos intentos: `submitAnswer` devuelve `already-answered` y no escribe.
2. La respuesta se corrige contra lo que Juan vio (huella `itemFingerprint`); si el contenido cambió, `changed` y la pregunta se recarga.
3. Registro propio del service worker (`src/app/swRegister.ts`): «Actualizar» en otra pestaña ya no recarga la sesión activa; recarga al salir.
Pruebas: 27 de Vitest y 3 E2E nuevos (dos pestañas, contenido cambiado, actualización entre pestañas).

## M9-3 Rendimiento (6 000 preguntas, 3 asignaturas, 20 000 intentos; PC, Chrome)
| Paso | Antes | Ahora | Objetivo PC |
|---|---|---|---|
| Restaurar copia | 3,4–7,0 s | 3,1 s | 20 s |
| **Inicio** | **9,7–11,6 s** | **0,42 s** | 1,5 s |
| Asignatura | sin medir | 0,12 s | 1,5 s |
| «Estudiar» hasta la 1.ª pregunta | sin medir | 0,37 s | 1,5 s |
| Responder | sin medir | 0,12 s | 0,5 s |
| Exportar copia | sin medir | 0,83 s | 10 s |
| Exportar progreso | sin medir | 0,54 s | 3 s |
| Importar 2 000 preguntas | 0,8 s | 0,68 s | 6 s |

Móvil estimado (×3–5): Inicio 1,3–2,1 s. Cambios: índice derivado `metadataKey` (ADR-027), corte de las 04:00 calculado una vez (`isDueBefore`), vistas sin leer 20 000 intentos ni `data`, sesión desde las cachés. Equivalencia exacta con la implementación anterior probada con 5 estados con semilla.

## Revisión visual
Capturas en `docs/results/capturas/` (claro y oscuro). Defectos corregidos: botones principales con el gris del navegador (ahora estilo propio con contraste AA), barra «Hoy» azul nativa (ahora del color de la app). La pantalla de preguntas de las capturas es la página de demo de pruebas, no la sesión real. Las fórmulas con error de KaTeX salen en rojo (ADR-025); no hay ninguna en las capturas.

## No hecho / límites
- Lighthouse: v12 ya no incluye la categoría PWA (ADR-026); la PWA se verifica con E2E reales sin red y con actualización A→B (M7).
- Rendimiento en un móvil real: solo estimado.
