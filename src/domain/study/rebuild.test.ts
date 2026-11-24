import { expect, it } from 'vitest';
import { catalogFixture, fixtureBlock } from '../../../tests/fixtures/study/catalog.ts';
import { rebuildHistory, shuffledHistory, performanceFixture } from '../../../tests/fixtures/study/rebuild.ts';
import { D1, D2, D3, D4, ok, bad } from '../../../tests/fixtures/study/attempts.ts';
import { successfulDay } from '../../../tests/fixtures/study/mastery.ts';
import type { ItemState } from './types.ts';
import { applyAttempt } from './scheduler.ts';
import { rebuildFromAttempts } from './rebuild.ts';

it('replays the fixed twelve-attempt history exactly like incremental applyAttempt', () => {
  const attempts = rebuildHistory();
  const expected = new Map<string, ItemState>();
  for (const a of attempts) {
    const { state } = applyAttempt(expected.get(a.itemId) ?? null, a);
    if (state) expected.set(a.itemId, state);
  }
  const result = rebuildFromAttempts(attempts, catalogFixture(3), D4);
  expect(result.items).toEqual(expected);
  expect(result.skipped).toEqual([]);
  expect(result.blindSpots).toEqual([{ itemId: 'i2', since: D4 }]);
});
it('rebuilds identically from a fixed shuffle', () => {
  const catalog = catalogFixture(3);
  expect(rebuildFromAttempts(shuffledHistory(), catalog, D4))
    .toEqual(rebuildFromAttempts(rebuildHistory(), catalog, D4));
});
it('starts a changed type at generation two and reports the old generation', () => {
  const catalog = catalogFixture(1, 'flashcard');
  catalog.items.set('f1', { id: 'f1', tipo: 'flashcard', blockId: 'B', itemGen: 2, archived: false });
  const old = { ...bad('f1', D1, 'seguro'), itemGen: 1 };
  const current = { ...ok('f1', D2), itemGen: 2, tipo: 'flashcard' as const,
    confidence: null, rating: 'facil' as const };
  const result = rebuildFromAttempts([old, current], catalog, D3);
  expect(result.items.get('f1')).toEqual(applyAttempt(null, current).state);
  expect(result.items.get('f1')?.card.reps).toBe(1);
  expect(result.skipped).toEqual([{ attemptId: old.attemptId,
    reason: 'La generación del ítem no coincide con la actual.' }]);
  expect(result.blindSpots).toEqual([]);
  expect(result.blocks.get('B')?.validDays).toEqual([D2]);
});
it('uses the current block even when all attempts name the previous block', () => {
  const catalog = catalogFixture();
  const block = fixtureBlock(catalog);
  catalog.blocks.delete('B');
  catalog.blocks.set('new', { ...block, id: 'new' });
  for (const item of catalog.items.values()) item.blockId = 'new';
  const result = rebuildFromAttempts([...successfulDay(D1), ...successfulDay(D2)], catalog, D3);
  expect(result.blocks.get('new')).toMatchObject({ status: 'dominado', validDays: [D1, D2] });
  expect(result.blocks.has('B')).toBe(false);
});
it('skips invalid and unknown attempts without throwing or contaminating derived states', () => {
  const invalid = { ...bad('i1', D2, 'seguro'), at: `${D2}T10:00:00.000` };
  const absent = bad('missing', D1, 'seguro');
  const result = rebuildFromAttempts([ok('i1', D1), invalid, absent], catalogFixture(1), D3);
  expect(result.skipped).toHaveLength(2);
  expect(result.skipped).toContainEqual({ attemptId: invalid.attemptId, reason: 'Intento inválido: Invalid UTC instant' });
  expect(result.skipped).toContainEqual({ attemptId: absent.attemptId, reason: 'El ítem no está en el catálogo.' });
  expect(result.items.get('i1')?.card.reps).toBe(1);
  expect(result.blocks.get('B')?.validDays).toEqual([D1]);
  expect(result.blindSpots).toEqual([]);
});
it('returns no item states and pending blocks for an empty history', () => {
  const result = rebuildFromAttempts([], catalogFixture(), D1);
  expect(result.items.size).toBe(0);
  expect(result.skipped).toEqual([]);
  expect(result.blindSpots).toEqual([]);
  expect([...result.blocks.values()]).toEqual([{ blockId: 'B', status: 'pendiente',
    validDays: [], masteredOn: null, provisional: false, reviewDays: [], locked: false }]);
});
it('keeps valid attempts chronological when an unparseable instant interrupts the input', () => {
  const invalid = { ...bad('i1', D2, 'seguro'), at: 'not-a-date' };
  const result = rebuildFromAttempts([ok('i1', D3), invalid, ok('i1', D1)], catalogFixture(1), D4);
  expect(result.items.get('i1')?.card.reps).toBe(2);
  expect(result.items.get('i1')?.card.last_review).toBe(`${D3}T10:00:00.000Z`);
  expect(result.skipped).toEqual([{ attemptId: invalid.attemptId, reason: 'Intento inválido: Invalid UTC instant' }]);
  expect(result.blocks.get('B')?.validDays).toEqual([D1, D3]);
});
it('does not mutate the attempts or catalog', () => {
  const attempts = shuffledHistory();
  const catalog = catalogFixture(3);
  const before = structuredClone({ attempts, catalog });
  rebuildFromAttempts(attempts, catalog, D4);
  expect({ attempts, catalog }).toEqual(before);
});
it('preserves archived FSRS state while excluding it from mastery and blind spots', () => {
  const catalog = catalogFixture(1);
  catalog.items.set('i1', { id: 'i1', tipo: 'test', blockId: 'B', itemGen: 1, archived: true });
  const result = rebuildFromAttempts([bad('i1', D1, 'seguro')], catalog, D2);
  expect(result.items.get('i1')?.card.reps).toBe(1);
  expect(result.skipped).toEqual([]);
  expect(result.blocks.get('B')?.status).toBe('pendiente');
  expect(result.blindSpots).toEqual([]);
});
it('does not create FSRS state for info', () => {
  const result = rebuildFromAttempts([{ ...ok('i1', D1), tipo: 'info', confidence: null }],
    catalogFixture(1, 'info'), D1);
  expect(result.items.size).toBe(0);
  expect(result.skipped).toEqual([]);
  expect(result.blocks.get('B')?.status).toBe('pendiente');
});
it('orders tied instants by attemptId, including equivalent UTC representations', () => {
  const first = { ...bad('i1', D1, 'seguro'), attemptId: 'a', at: `${D1}T10:00:00Z` };
  const second = { ...ok('i1', D1), attemptId: 'b' };
  const expected = applyAttempt(applyAttempt(null, first).state, second).state;
  expect(rebuildFromAttempts([second, first], catalogFixture(1), D1).items.get('i1')).toEqual(expected);
});
it('rebuilds 20,000 attempts across 2,000 items in under 1,500 ms', () => {
  const { catalog, attempts } = performanceFixture();
  expect(attempts).toHaveLength(20000);
  const start = performance.now();
  const result = rebuildFromAttempts(attempts, catalog, '2026-11-12');
  const elapsed = performance.now() - start;
  expect(result.items.size).toBe(2000);
  expect(result.skipped).toEqual([]);
  expect(elapsed).toBeLessThan(1500);
});
