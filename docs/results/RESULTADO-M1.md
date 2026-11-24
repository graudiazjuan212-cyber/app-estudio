# RESULTADO M1 — Formato de paquete `estudio-pack/1`

Estado: **cerrado** (commits `41c3089`, `12e5b07`, `42abbc6`). Tareas: `docs/tasks/M1-1.md` (implementación), `M1-2.md` (correcciones de la revisión adversarial).

## Qué se hizo
- `src/domain/pack/`: esquema zod (`schema.ts`), validación con todos los errores a la vez (máx. 50) y mensajes en español con bloque/pregunta (`validate.ts`, `errors.ts`), normalización JSON iterativa con límite de profundidad (`normalize.ts`), extractor de LaTeX (`latex.ts`), `diffPack` (`diff.ts`).
- Fixtures inventados en `tests/fixtures/packs/`: 3 paquetes válidos (mat, ioe, código), `mat-ejemplo-c01-v2` (para diff), 18 inválidos con `LEEME.md`, y regresiones de la revisión.
- `docs/estudio-pack-1.schema.json` (generado con `npm run schema:export`, modo entrada) y `docs/FORMATO_PAQUETE.md` (contrato para el proyecto Universidad).
- Dependencias: `zod` 4.6.7, `katex` 0.19.1 (ADR-001).

## Verificaciones (ejecutadas por Claude)
| Comprobación | Resultado |
|---|---|
| `npm run check` tras M1-1 | verde: 37 → **197** tests (+160) |
| `npm run check` tras M1-2 | verde: 197 → **251** (+54) |
| Tras corrección final | 215 en `src/domain/pack` + 37 router = **252** (+1: 10 000 campos desconocidos < 1 s) |
| `npm run schema:export` | el JSON Schema regenerado coincide con el commiteado |
| Rendimiento | validar un paquete de 2000 ítems con LaTeX: ~180 ms |
| Revisión adversarial (Codex) | 2 pasadas. 1.ª: 4 hallazgos (RangeError por anidación, backtick suelto, propiedades heredadas, JSON Schema distinto) → corregidos en M1-2. 2.ª: 1 hallazgo (coste de sugerencias con miles de campos) → corregido |

## Decisiones
- ADR-021: el JSON Schema exportado es **orientativo** (modo entrada, no expresa 1 correcta exacta, textos distintos, `{{n}}`, ids únicos, ciclos, LaTeX); la validación real es `validatePack`.
- Fixtures de paquetes en `tests/fixtures/packs/` (CLAUDE.md manda sobre PLAN.md).

## No hecho / diferido
- Unicidad de ids **entre asignaturas** (ADR-011): necesita la base de datos → M3 (`importPack`).
- Comprobación de `versionRelation` con confirmación de versión menor → M3.
