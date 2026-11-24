/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { packSchema } from './schema.ts';
import { validatePack } from './validate.ts';
import { fixture } from './test-helpers.ts';

it('keeps the committed JSON Schema in sync', () => {
  const text = readFileSync(new URL('../../../docs/estudio-pack-1.schema.json', import.meta.url), 'utf8');
  expect(text, 'ejecuta npm run schema:export').toBe(`${JSON.stringify(z.toJSONSchema(packSchema), null, 2)}\n`);
});
it.each(['mat-ejemplo-c01', 'ioe-ejemplo-c01', 'codigo-ejemplo-c01'])('round trips JSON Schema for %s', name => {
  const json: unknown = JSON.parse(readFileSync(new URL('../../../docs/estudio-pack-1.schema.json', import.meta.url), 'utf8'));
  const schema = z.fromJSONSchema(json as z.core.JSONSchema.JSONSchema);
  expect(schema.safeParse(fixture(name)).success).toBe(true);
});
it('round-tripped schema rejects a structural violation', () => {
  const schema = z.fromJSONSchema(z.toJSONSchema(packSchema));
  const p = fixture();
  p.version = 0;
  expect(schema.safeParse(p).success).toBe(false);
});
it('validates 200 seeded varied packs and rejects a missing required field in each', () => {
  let seed = 1729;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
  const required = ['schema', 'asignatura', 'capitulo', 'version', 'generado', 'bloques'];
  for (let i = 0; i < 200; i++) {
    const p = fixture(i % 2 ? 'mat-ejemplo-c01' : 'ioe-ejemplo-c01');
    p.version = 1 + random() % 100;
    p.capitulo.numero = 1 + random() % 20;
    p.capitulo.titulo = `Capítulo ${String(random())}`;
    p.bloques.forEach(b => {
      b.peso = ([1, 3, 5] as const)[random() % 3] ?? 1;
      b.items = b.items.slice(0, 1 + random() % b.items.length);
      b.items.forEach(item => { item.etiquetas = [`etiqueta-${String(random())}`]; });
    });
    expect(validatePack(p).ok, `valid generated pack ${String(i)}`).toBe(true);
    const field = required[random() % required.length];
    if (!field) throw new Error('Missing field name');
    Reflect.deleteProperty(p, field);
    expect(validatePack(p).ok, `missing ${field} in pack ${String(i)}`).toBe(false);
  }
});
