# RESULTADO M8 — README para Juan y prueba en el móvil

Documentos escritos en `98b44dc` y revisados contra la interfaz final tras M9-2/M9-3 (`c2598ce`, `459dde0`).

## Qué se hizo
- `README.md` (para Juan, en español y sin jerga): instalar en Android, cargar contenido, estudiar, mandar el progreso a Claude, copias de seguridad, qué hacer si algo falla, privacidad. Tras M9-2 se añadieron a la sección 6 los avisos «ya se respondió en otra ventana» y «ha cambiado en otra ventana», y que una actualización hecha desde otra pestaña no recarga la sesión abierta.
- `docs/PRUEBA_MOVIL.md`: lista de comprobación A–F para el Android de Juan (instalación, sin conexión, importar, estudiar, copia/restauración, actualización).
- `docs/DESARROLLO.md`: el README técnico anterior (comandos, estructura, flujo con Codex).

## Verificaciones
- Los 28 nombres de botones y mensajes que cita el README existen literalmente en `src/` (búsqueda por texto, repetida tras M9-2). Los dos avisos nuevos del README coinciden con `SessionScreen.tsx`.
- Capturas de revisión visual (`docs/results/capturas/`, claro y oscuro) coherentes con lo que describe el README.
- `npm run check` verde (1340 tests de Vitest) y 149 E2E en verde.

## Qué NO está comprobado
- **La prueba en un Android real** (criterio de aceptación de M8, BRIEF §8): solo puede hacerla Juan. Está en `docs/PENDIENTE-JUAN.md`.
- iPhone/Safari: no se pudo instalar WebKit en este equipo.
