import { expect, it } from 'vitest';
import { attempt, storedCard } from '../../../tests/fixtures/study/items.ts';
import { validAttempts, invalidAttempts } from '../../../tests/fixtures/study/attempts.ts';
import { validateAttempt, toStoredCard, fromStoredCard } from './types.ts';
import type { Attempt } from './types.ts';

it.each(validAttempts)('accepts valid $tipo attempt', value => { expect(validateAttempt(value)).toEqual([]); });
it.each(invalidAttempts)('rejects invalid fields %s', patch => {
  expect(validateAttempt({ ...attempt, ...patch }).length).toBeGreaterThan(0);
});
it.each([
  { confidence: 'unknown' }, { rating: 'unknown', tipo: 'flashcard', confidence: null },
  { tipo: 'unknown' }, { correct: null }, { dontKnow: null }, { at: undefined }, { studyDay: undefined },
])('rejects malformed runtime fields %s', patch => {
  expect(validateAttempt({ ...attempt, ...patch } as unknown as Attempt).length).toBeGreaterThan(0);
});
it('round trips stored dates exactly and without mutation', () => {
  const before = structuredClone(storedCard);
  const card = fromStoredCard(storedCard);
  expect(card.due).toEqual(new Date('2026-11-27T10:00:00.000Z'));
  expect(card.last_review).toEqual(new Date('2026-11-24T10:00:00.000Z'));
  expect(toStoredCard(card)).toEqual(storedCard);
  expect(fromStoredCard(toStoredCard(card))).toEqual(card);
  expect(storedCard).toEqual(before);
});
it('round trips an absent last review without adding a field', () => {
  const { last_review: omitted, ...stored } = storedCard;
  expect(omitted).toBe('2026-11-24T10:00:00.000Z');
  expect(toStoredCard(fromStoredCard(stored))).toEqual(stored);
});
it.each(['due', 'last_review'] as const)('rejects invalid stored %s', field => {
  expect(() => fromStoredCard({ ...storedCard, [field]: 'invalid' })).toThrow();
});
