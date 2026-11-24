import { expect, it } from 'vitest';
import { calibrationAttempts, defaults, estimates } from '../../../tests/fixtures/study/planning.ts';
import { estimateSeconds } from './estimate.ts';

it.each(estimates)('calibrates only at threshold and clamps: $count / $duration / $ramp', fixture => {
  expect(estimateSeconds('test', calibrationAttempts(fixture.count, fixture.duration, fixture.ramp))).toBe(fixture.expected);
});
it.each(defaults)('uses default for %s: %s seconds', (tipo, expected) => {
  expect(estimateSeconds(tipo, [])).toBe(expected);
});
it('calibrates by type across items and ignores other types', () => {
  const attempts = calibrationAttempts(29, 1000, true);
  attempts.push(...calibrationAttempts(30, 600000, false).map(a => ({ ...a, tipo: 'flashcard' as const })));
  expect(estimateSeconds('test', attempts)).toBe(30);
  expect(estimateSeconds('flashcard', attempts)).toBe(180);
});
it('does not mutate attempts', () => {
  const attempts = calibrationAttempts(31, 1000, true).reverse();
  const before = structuredClone(attempts);
  estimateSeconds('test', attempts);
  expect(attempts).toEqual(before);
});
it.each([-1, NaN, Infinity, 0.5])('rejects invalid duration %s', duration => {
  expect(() => estimateSeconds('test', calibrationAttempts(1, duration, false))).toThrow('Duración');
});
