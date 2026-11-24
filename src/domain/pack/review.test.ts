import { expect, it } from 'vitest';
import { extractMath } from './latex.ts';
import { validatePack } from './validate.ts';
import { changed, fixture } from './test-helpers.ts';
import { reviewFixtures } from './review-fixtures.ts';

it.each(reviewFixtures().math)('handles closed and unclosed code: $text', ({ text, expected }) => {
  expect(extractMath(text)).toEqual(expected);
});
it.each(reviewFixtures().unclosed)('still rejects an unclosed dollar after %s', text => {
  expect(() => extractMath(text)).toThrow('sin cerrar');
});
it.each(reviewFixtures().badMath)('validates math after unmatched backticks: %s', text => {
  const result = validatePack(changed(['bloques', 0, 'items', 0, 'cuerpo'], text));
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('Expected failure');
  expect(result.errors.some(error => error.message.includes('LaTeX inválido') || error.message.includes('sin cerrar'))).toBe(true);
});
it.each(reviewFixtures().messages)('explains invalid $path', ({ path, value, expected }) => {
  const result = validatePack(changed(path, value));
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('Expected failure');
  expect(result.errors.map(error => error.message).join('\n')).toContain(expected);
});
it.each(reviewFixtures().largeMessages)('explains excessive length of $path', ({ path, length, unit, expected }) => {
  const value = unit === 'text' ? 'x'.repeat(length)
    : Array.from({ length }, (_, i) => ({ texto: `Opción ${String(i)}`, correcta: i === 0 }));
  const result = validatePack(changed(path, value));
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('Expected failure');
  expect(result.errors.map(error => error.message).join('\n')).toContain(expected);
});
it.each(['relaciona', 'explicacion'] as const)('accepts %s on evaluable cards', field => {
  expect(validatePack(changed(['bloques', 0, 'items', 1, field], field === 'relaciona' ? true : 'Texto')).ok).toBe(true);
});
it('accepts all unchanged fields covered by the message regressions', () => {
  expect(validatePack(fixture()).ok).toBe(true);
});
