import { expect, it } from 'vitest';
import { buildPracticeSession, consecutivePracticeFailures, practiceWeight } from './practice';
import { weights, failureRuns, practiceHistory, practiceInput, weightedInput } from '../../../tests/fixtures/study/practice';
import { replaceItem } from '../../../tests/fixtures/study/session-catalog';

it.each(weights)('uses configured positive weight %j = %s', (input, expected) => {
  expect(practiceWeight(input)).toBe(expected); expect(practiceWeight(input)).toBeGreaterThan(0);
});
it.each(failureRuns)('counts only consecutive latest failures %j = %s', (outcomes, expected) => {
  expect(consecutivePracticeFailures(practiceHistory(outcomes).reverse())).toBe(expected);
});
it.each([-1, 0.5, NaN, Infinity])('rejects invalid practice streak %s', practiceFailures => {
  expect(() => practiceWeight({ practiceFailures })).toThrow();
});
it('resets weight after a practice success', () => {
  expect(practiceWeight({ practiceFailures: consecutivePracticeFailures(practiceHistory([false, false, true])) })).toBe(1);
});
it('is deterministic and changes order across fixed seeds', () => {
  const input = practiceInput(); input.minutes = 10;
  expect(buildPracticeSession(input)).toEqual(buildPracticeSession(input));
  const orders = new Set([1, 2, 3, 4].map(seed => buildPracticeSession({ ...input, seed }).itemIds.join(',')));
  expect(orders.size).toBeGreaterThan(1);
});
it('excludes info, archives, locked blocks and unseen questions', () => {
  const input = practiceInput(); input.minutes = 10;
  replaceItem(input, 'a2', { archived: true });
  replaceItem(input, 'a3', { blockId: 'B' });
  input.attempts = input.attempts.filter(a => a.itemId !== 'a4');
  expect(buildPracticeSession(input).itemIds.sort()).toEqual(['a1', 'a5']);
});
it('respects costs, without replacement, and forces one if none fits', () => {
  const input = practiceInput(); input.minutes = 1;
  const plan = buildPracticeSession(input);
  expect(plan.itemIds).toHaveLength(2); expect(new Set(plan.itemIds).size).toBe(2); expect(plan.estimatedSeconds).toBe(60);
  const forced = buildPracticeSession({ ...input, minutes: 0.1 });
  expect(forced.itemIds).toHaveLength(1); expect(forced.estimatedSeconds).toBe(30);
});
it('returns empty without prior normal attempts', () => {
  expect(buildPracticeSession({ ...practiceInput(), attempts: [] })).toEqual({ itemIds: [], estimatedSeconds: 0 });
});
it.each([0, -1, NaN, Infinity])('rejects invalid duration %s', minutes => {
  expect(() => buildPracticeSession({ ...practiceInput(), minutes })).toThrow();
});
it('matches hand calculated proportions for 4000 fixed seeds, including mastered items', () => {
  const input = weightedInput();
  const counts = new Map<string, number>();
  for (let seed = 1; seed <= 4000; seed++) {
    const id = buildPracticeSession({ ...input, seed }).itemIds[0] ?? '';
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  // Sum = 19.25, expected 4000*w/19.25, rounded by hand.
  for (const [id, expected] of [['a1', 1870.13], ['a2', 1038.96], ['a3', 831.17], ['a4', 207.79], ['a5', 51.95]] as const) {
    expect(counts.get(id)).toBeGreaterThan(expected * 0.75);
    expect(counts.get(id)).toBeLessThan(expected * 1.25);
  }
});
it('increases next-session frequency after failures and restores base frequency after success', () => {
  const input = practiceInput();
  const count = (outcomes: boolean[]) => {
    let hits = 0;
    for (let seed = 1; seed <= 4000; seed++) if (buildPracticeSession({ ...input, seed,
      practiceAttempts: practiceHistory(outcomes) }).itemIds[0] === 'a1') hits++;
    return hits;
  };
  expect(count([false, false, false])).toBeGreaterThan(count([]));
  expect(count([false, false, false, true])).toBe(count([]));
});
