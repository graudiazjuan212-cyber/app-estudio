import { expect, it } from 'vitest';
import { catalogFixture } from '../../../tests/fixtures/study/catalog.ts';
import { tiedFailure, tiedSuccess, tiedExpected, conflictPatches, impossibleSuccesses,
  validSuccesses, invalidZones } from '../../../tests/fixtures/study/adversarial.ts';
import { rebuildFromAttempts } from './rebuild.ts';

it('reconstructs either tied input order to the same fixed state', () => {
  const catalog = catalogFixture(1);
  const forward = rebuildFromAttempts([tiedFailure, tiedSuccess], catalog, '2026-11-24');
  const reverse = rebuildFromAttempts([tiedSuccess, tiedFailure], catalog, '2026-11-24');
  expect(forward).toEqual(reverse);
  expect(forward.items.get('i1')).toEqual(tiedExpected);
  expect(forward.skipped).toEqual([]);
});
it('applies identical copies once, independently of property insertion order', () => {
  const { confidence, ...rest } = tiedSuccess;
  const copy = { confidence, ...rest };
  const catalog = catalogFixture(1);
  const single = rebuildFromAttempts([tiedSuccess], catalog, '2026-11-24');
  const duplicate = rebuildFromAttempts([tiedSuccess, copy], catalog, '2026-11-24');
  expect(duplicate.items).toEqual(single.items);
  expect(duplicate.blocks).toEqual(single.blocks);
  expect(duplicate.blindSpots).toEqual(single.blindSpots);
  expect(duplicate.skipped).toEqual([{ attemptId: 'b', reason: 'Duplicado idéntico del intento.' }]);
});
it.each(conflictPatches)('rejects all copies when any field differs: %s', patch => {
  const attempts = [tiedSuccess, { ...tiedSuccess, ...patch }, structuredClone(tiedSuccess)];
  const before = structuredClone(attempts);
  const result = rebuildFromAttempts(attempts, catalogFixture(1), '2026-11-24');
  expect(result.items.size).toBe(0);
  expect(result.blocks.get('B')?.validDays).toEqual([]);
  expect(result.blocks.get('B')?.status).toBe('pendiente');
  expect(result.blindSpots).toEqual([]);
  expect(result.skipped).toEqual(Array.from({ length: 3 }, () => ({ attemptId: 'b',
    reason: 'attemptId repetido con contenido distinto.' })));
  expect(attempts).toEqual(before);
});
it('rejects both confidence conflicts and preserves unrelated valid attempts', () => {
  const result = rebuildFromAttempts([tiedSuccess, { ...tiedSuccess, confidence: 'duda' }, tiedFailure],
    catalogFixture(1), '2026-11-24');
  expect(result.items.get('i1')?.card.reps).toBe(1);
  expect(result.items.get('i1')?.lastAttemptId).toBe('a');
  expect(result.blocks.get('B')?.validDays).toEqual([]);
  expect(result.skipped).toEqual([
    { attemptId: 'b', reason: 'attemptId repetido con contenido distinto.' },
    { attemptId: 'b', reason: 'attemptId repetido con contenido distinto.' },
  ]);
});
it('does not grant mastery for successes on impossible calendar days', () => {
  const result = rebuildFromAttempts(impossibleSuccesses, catalogFixture(1), '2026-11-25');
  expect(result.items.size).toBe(0);
  expect(result.blocks.get('B')?.status).toBe('pendiente');
  expect(result.blocks.get('B')?.validDays).toEqual([]);
  expect(result.skipped).toEqual([
    { attemptId: 'invalid-day-1', reason: 'Intento inválido: Invalid study day' },
    { attemptId: 'invalid-day-2', reason: 'Intento inválido: Invalid study day' },
  ]);
});
it('still grants mastery for successes on two real days', () => {
  const result = rebuildFromAttempts(validSuccesses, catalogFixture(1), '2026-11-25');
  expect(result.blocks.get('B')?.status).toBe('dominado');
  expect(result.blocks.get('B')?.validDays).toEqual(['2026-11-24', '2026-11-25']);
  expect(result.skipped).toEqual([]);
});
it.each(invalidZones)('skips invalid time zone %s with the validation reason', tz => {
  const result = rebuildFromAttempts([{ ...tiedSuccess, tz }], catalogFixture(1), '2026-11-24');
  expect(result.items.size).toBe(0);
  expect(result.skipped).toEqual([{ attemptId: 'b', reason: 'Intento inválido: Invalid time zone' }]);
});
