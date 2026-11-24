# RESULTADO M4 — Renderizado de preguntas

Estado: **cerrado** (commits `6ae5e65` M4-1, `7fe50c9` M4-2). Especificaciones: `docs/tasks/M4-1.md`, `M4-2.md`.

## Qué se hizo
- `src/domain/render/richtext.ts`: Markdown (`markdown-it`, HTML desactivado, sin enlaces `javascript:`) + KaTeX (`$…$`, `$$…$$`, `\$` escapado) con caché acotada a 500; `order.ts`: orden estable de opciones (`fnv1a32`, `seedFor`, `displayOrder`, nunca la identidad en `ordenar`).
- `src/ui/RichText.tsx` (único `dangerouslySetInnerHTML`, justificado), CSS con scroll horizontal en código y fórmulas.
- `src/domain/study/submission.ts` (`Submission`, `submissionOutcome`): corrección y mapeo a los campos del intento en el dominio.
- `src/ui/question/`: los 9 tipos (`InfoCard`, `FlashCard`, `TestQuestion`, `MultiQuestion`, `TrueFalseQuestion`, `OrderQuestion`, `MatchQuestion`, `GapQuestion`, `ErrorStepQuestion`) y `QuestionCard` (confianza antes de «Comprobar», «No lo sé», un solo envío, «Reintentar» con el mismo envío, feedback solo tras guardar, foco al banner).
- `#/demo` (`DemoScreen`) **solo en `dist-e2e`** (`VITE_ENABLE_DEMO=true`); el build normal no lo contiene (comprobado).

## Verificaciones (ejecutadas por Claude)
| Tarea | Tests unitarios acumulados | E2E |
|---|---|---|
| M4-1 | 847 (+48; +3 de higiene) | — |
| M4-2 | **963** (+62) | **24** (23 nuevos + humo), 24/24 en Chrome Pixel 7 |
- Los E2E aseveran: feedback «Correcto»/«Incorrecto» para los 9 tipos en acierto y fallo, «No lo sé», «Comprobar» desactivado sin confianza/respuesta completa, un solo envío con doble clic, «Reintentar» tras fallo de guardado, KaTeX visible, objetivos táctiles ≥ 44 px, `<script>` como texto sin diálogos.
- Fallos que Codex no podía ver y corregí: tipos de `markdown-it` 15 (`InstanceType<typeof MarkdownIt>`), BOM en archivos nuevos (ahora lo vigila `src/repo-hygiene.test.ts`), expectativas de KaTeX 0.19.1 (ADR-025).

## No hecho / diferido
Accesibilidad automática (axe), contraste en oscuro y rendimiento medido: M9. Resaltado de color del código: fuera de la v1 (ADR-006).
