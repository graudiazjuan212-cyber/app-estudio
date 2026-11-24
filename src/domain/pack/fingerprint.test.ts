import { expect, it } from 'vitest';
import { question, reordered, steps } from '../../../tests/fixtures/fingerprint.ts';
import { itemFingerprint } from './fingerprint.ts';
it('B1: canonicalizes recursively, has the specified format and does not mutate inputs', () => {
  const before = structuredClone([question, reordered]);
  expect(itemFingerprint(question)).toBe('11042167:165');
  expect(itemFingerprint(question)).toBe(itemFingerprint(reordered));
  expect(itemFingerprint(question)).toMatch(/^[0-9a-f]{8}:\d+$/);
  expect([question, reordered]).toEqual(before);
});
it.each(['prompt', 'correct', 'feedback'] as const)('B1: fingerprints changes to %s', field => {
  const item = structuredClone(question);
  if (item.tipo !== 'test') throw new Error('Invalid fixture');
  if (field === 'prompt') item.enunciado = 'Una';
  else item.opciones = item.opciones.map((option, index) => index !== 0 ? option : {
    ...option, ...(field === 'correct' ? { correcta: false } : { feedback: 'Biem' }),
  });
  expect(itemFingerprint(item)).not.toBe(itemFingerprint(question));
});
it('B1: preserves array ordering in the fingerprint', () => {
  if (steps.tipo !== 'ordenar') throw new Error('Invalid fixture');
  expect(itemFingerprint({ ...steps, pasos: ['B', 'A', 'C'] })).not.toBe(itemFingerprint(steps));
  expect(steps.pasos).toEqual(['A', 'B', 'C']);
});
