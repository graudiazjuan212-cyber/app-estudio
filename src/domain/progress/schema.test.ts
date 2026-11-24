import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { progressConfig } from '../../config.ts';
import { progressSchema } from './schema.ts';
import { buildProgressExport } from './export.ts';
import { scenario } from '../../../tests/fixtures/progress/scenario.ts';

const read = (path: string): unknown => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8')) as unknown;
it('keeps the committed input JSON Schema synchronized', () => {
  expect(read('../../../docs/estudio-progreso-1.schema.json'), 'ejecuta npm run schema:export').toEqual({
    ...z.toJSONSchema(progressSchema, { io: 'input' }), description: progressConfig.semanticDescription,
  });
});
it('validates the handwritten expected result with Zod and the exported JSON Schema', () => {
  const expected = read('../../../tests/fixtures/progress/expected-ejmat-2026-12-02.json');
  expect(progressSchema.safeParse(expected).success).toBe(true);
  const schema = JSON.parse(readFileSync(new URL('../../../docs/estudio-progreso-1.schema.json', import.meta.url), 'utf8')) as Record<string, unknown>;
  expect(z.fromJSONSchema(schema).safeParse(expected).success).toBe(true);
});
function checkRequired(value: unknown, path: (string | number)[] = []): void {
  if (Array.isArray(value)) {
    value.forEach((entry: unknown, i) => { checkRequired(entry, [...path, i]); });
  } else if (value !== null && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) {
      const output = structuredClone(buildProgressExport(scenario()));
      let cursor: unknown = output;
      for (const part of path) cursor = (cursor as Record<string | number, unknown>)[part];
      Reflect.deleteProperty(cursor as object, key);
      expect(progressSchema.safeParse(output).success, [...path, key].join('.')).toBe(false);
      checkRequired(entry, [...path, key]);
    }
  }
}
it('rejects every missing required field recursively', () => { checkRequired(buildProgressExport(scenario())); });
it.each(['extra', 'weight', 'date', 'correct', 'failures', 'text', 'decimal'])('rejects invalid %s', kind => {
  const value = buildProgressExport(scenario());
  const block = value.capitulos[0]?.bloques[0];
  const session = value.sesiones[0];
  const failure = value.fallos_recurrentes[0];
  if (!block || !session || !failure) throw new Error('Missing fixture');
  if (kind === 'extra') Object.assign(block, { extra: true });
  if (kind === 'weight') Object.assign(block, { peso: 2 });
  if (kind === 'date') session.fecha = '2026-02-30';
  if (kind === 'correct') session.aciertos = session.preguntas + 1;
  if (kind === 'failures') failure.fallos = 1;
  if (kind === 'text') failure.enunciado_corto = 'a'.repeat(200);
  if (kind === 'decimal') session.minutos = 0.33;
  expect(progressSchema.safeParse(value).success).toBe(false);
});
