# PARA REVISAR — M0 (autoauditoría)

a) **¿Qué queda a medias?** Despliegue real: el workflow nunca se ha ejecutado en GitHub. Puede fallar por algo que local no se ve (p. ej. Chrome en `ubuntu-latest`, permisos de Pages). Se prueba en M9 con la autorización de Juan.

b) **¿Qué pasa con una entrada inválida o ausente?** Ruta desconocida (`#/unknown`) → Inicio (cubierto en unitario y E2E). Hash vacío → Inicio.

c) **¿Qué podría romperse en otra parte?**
   - `base` cambia entre `dev` (`/`), `build` y `preview` (`/app-estudio/`): cualquier URL absoluta nueva debe pasar por la base de Vite.
   - E2E depende de Chrome instalado en el equipo; si se actualiza mucho, revisar. En CI se instala con `playwright install chrome`.
   - Tests unitarios con `environment: 'node'`: los tests de componentes no existen (ADR-015); la UI se prueba por E2E.

d) **Estructura:** el plan dice `src/db`, `CLAUDE.md`/`AGENTS.md` dicen `src/data`. Se adopta `src/data` (ADR-019); `src/db/.gitkeep` se sustituye en M3.

e) **Calidad de los tests del router:** 37 casos con datos fijos en `tests/fixtures/router.ts`. Falta comprobar si algún caso espera lo que devuelve el propio código; se revisará al tocar el router.
