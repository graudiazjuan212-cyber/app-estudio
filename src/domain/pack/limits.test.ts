/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { validatePack } from './validate.ts';
import { changed, fixture } from './test-helpers.ts';
import type { Pack } from './schema.ts';

interface LimitFixture {
  lengths: { field: string; min: number; max: number }[];
  blankFields: string[]; badGapNumbers: number[]; badVersions: number[];
}
function limits(): LimitFixture {
  return JSON.parse(readFileSync(new URL('../../../tests/fixtures/packs/limits.json', import.meta.url), 'utf8')) as LimitFixture;
}
function withLength(field: string, length: number): unknown {
  const p = fixture();
  const options = Array.from({ length }, (_, i) => ({ texto: `Opción ${String(i)}`, correcta: i === 0 }));
  const base = ['bloques', 1, 'items'];
  if (field === 'multi') return changed(['bloques', 0, 'items', 3, 'opciones'], options);
  if (field === 'pairs') return changed([...base, 1, 'pares'], Array.from({ length }, (_, i) => ({ izquierda: `L${String(i)}`, derecha: `R${String(i)}` })));
  if (field === 'gapOptions') return changed([...base, 2, 'huecos', 0, 'opciones'], options);
  if (field === 'errorSteps') return changed([...base, 3, 'pasos'], Array.from({ length }, (_, i) => ({ texto: `Paso ${String(i)}`, incorrecto: i === 0 })));
  if (field === 'id') return changed(['bloques', 0, 'items', 0, 'id'], 'a'.repeat(length));
  if (field === 'gaps') {
    const item = p.bloques[1]?.items[2];
    if (item?.tipo !== 'huecos') throw new Error('Missing gaps');
    item.enunciado = length ? Array.from({ length }, (_, i) => `{{${String(i + 1)}}}`).join(' ') : 'Sin huecos';
    item.huecos = Array.from({ length }, (_, i) => ({ n: i + 1, opciones: [{ texto: 'A', correcta: true }, { texto: 'B', correcta: false }] }));
    return p;
  }
  if (field === 'blocks') {
    p.bloques = Array.from({ length }, (_, i) => ({ id: `b-${String(i)}`, titulo: 'Bloque', peso: 1, requiere: [],
      items: [{ id: `i-${String(i)}`, tipo: 'vf', enunciado: 'Texto', correcta: true }] }));
    return p;
  }
  if (field === 'items') {
    const b = p.bloques[0];
    if (!b) throw new Error('Missing block');
    b.items = Array.from({ length }, (_, i) => ({ id: `item-${String(i)}`, tipo: 'vf', enunciado: 'Texto', correcta: true }));
    return p;
  }
  throw new Error('Unknown limit fixture');
}
for (const { field, min, max } of limits().lengths) {
  it.each([[min, true], [max, true], [min - 1, false], [max + 1, false]] as const)(
    `${field}: length %i accepted=%s`, (length, ok) => {
      expect(validatePack(withLength(field, length)).ok).toBe(ok);
    });
}
it.each(limits().blankFields)('rejects whitespace in %s', field => {
  expect(validatePack(changed(['bloques', 0, 'items', 1, field], ' \n ')).ok).toBe(false);
});
it.each(limits().badVersions)('rejects version %s', version => {
  expect(validatePack(changed(['version'], version)).ok).toBe(false);
});
it.each(limits().badGapNumbers)('rejects gap number %s', n => {
  expect(validatePack(changed(['bloques', 1, 'items', 2, 'huecos', 1, 'n'], n)).ok).toBe(false);
});
it('rejects a duplicate gap number', () => {
  expect(validatePack(changed(['bloques', 1, 'items', 2, 'huecos', 1, 'n'], 1)).ok).toBe(false);
});
it('rejects incorrect and repeated gap options', () => {
  const p = ['bloques', 1, 'items', 2, 'huecos', 0, 'opciones'];
  for (const value of [
    [{ texto: 'A', correcta: true }, { texto: 'B', correcta: true }],
    [{ texto: 'A', correcta: false }, { texto: 'B', correcta: false }],
    [{ texto: ' A ', correcta: true }, { texto: 'a', correcta: false }],
  ]) expect(validatePack(changed(p, value)).ok).toBe(false);
});
it('accepts non-info relation flags and rejects even false on info', () => {
  expect(validatePack(changed(['bloques', 0, 'items', 1, 'relaciona'], true)).ok).toBe(true);
  expect(validatePack(changed(['bloques', 0, 'items', 0, 'relaciona'], false)).ok).toBe(false);
});
it('accepts a pure pack typed by the schema', () => {
  const p: Pack = fixture();
  expect(validatePack(p).ok).toBe(true);
});
