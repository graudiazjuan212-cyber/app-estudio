# AGENTS.md — Reglas para Codex (programador)

Proyecto: app de estudio PWA personal de Juan (React + TypeScript, sin backend). Producto completo en `docs/BRIEF.md`. Claude Code dirige y revisa todo lo que entregues; tú implementas la tarea que te pase (`docs/tasks/<hito>-<n>.md`).

## Reglas de siempre
- Haz SOLO lo que pide la tarea. Si algo de la tarea es ambiguo o contradictorio, dilo en tu respuesta en vez de inventar.
- Ningún archivo de código por encima de 300 líneas.
- No instales ni añadas dependencias: si crees que hace falta una, propónla en tu respuesta con el motivo.
- Constantes y parámetros solo en el módulo de configuración; nada de valores mágicos repartidos.
- Capas: `src/domain/` (lógica pura, sin React ni IndexedDB) ← `src/data/` ← `src/ui/`. La UI no accede a IndexedDB directamente.
- Datos de Juan: un dato que no se entiende se rechaza con mensaje claro; nunca se borra ni sobrescribe progreso. Migraciones con copia previa y test.
- Nada de evaluar fechas, rutas o entorno al importar un módulo: usa funciones; el reloj se inyecta.
- TypeScript estricto, sin `any`. Código en inglés; textos de interfaz en español de España.
- No hagas commits, `git push`, `git reset --hard` ni borres archivos que no hayas creado en esta tarea. Claude hace los commits.

## Verificación que debes entregar
- Tests nuevos para cada criterio de aceptación: caso positivo y negativo de cada regla.
- Datos de prueba fijos en `tests/fixtures/`, independientes del código probado (no construyas el resultado esperado llamando al propio código).
- Ningún test toca la red.
- Ejecuta `npm run check` y pega el resumen final con el NÚMERO EXACTO de tests. Si algo queda en rojo, dilo; no lo ocultes ni desactives tests.
- Termina con una lista honesta: qué has hecho, qué NO has hecho o queda a medias, qué pasa con entradas inválidas o ausentes, y qué podría romperse en otra parte.
