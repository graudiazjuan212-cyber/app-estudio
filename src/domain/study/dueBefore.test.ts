import { expect, it } from 'vitest';
import { dueBeforeCases } from '../../../tests/fixtures/study/dueBefore.ts';
import { dueCutoffMs, isDue, isDueBefore, newItemState } from './scheduler.ts';

it.each(dueBeforeCases)('preserves the strict Madrid boundary at %s for %s', (now, due, cutoff, expected) => {
  const state = newItemState('item', 1);
  state.card.due = due;
  expect(dueCutoffMs(now, 'Europe/Madrid')).toBe(Date.parse(cutoff));
  expect(isDueBefore(state, Date.parse(cutoff))).toBe(expected);
  expect(isDue(state, now, 'Europe/Madrid')).toBe(expected);
});
it('rejects invalid stored dates and cutoff instead of treating them as not due', () => {
  const state = newItemState('item', 1);
  expect(() => isDueBefore(state, NaN)).toThrow();
  expect(() => isDueBefore({ ...state, card: { ...state.card, due: 'invalid' } }, 0)).toThrow();
  expect(() => isDueBefore({ ...state, card: { ...state.card, last_review: 'invalid' } }, 0)).toThrow();
});
