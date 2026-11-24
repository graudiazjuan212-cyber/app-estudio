import { expect, it } from 'vitest';
import { tiedFailure, tiedSuccess, tiedExpected } from '../../../tests/fixtures/study/adversarial.ts';
import { applyAttempt, newItemState } from './scheduler.ts';
import type { ItemState } from './types.ts';

it('requests rebuild for a tied earlier id without mutating the state', () => {
  const prev = applyAttempt(null, tiedSuccess).state;
  const before = structuredClone(prev);
  const result = applyAttempt(prev, tiedFailure);
  expect(result).toEqual({ state: before, needsRebuild: true });
  expect(result.state).toBe(prev);
  expect(prev).toEqual(before);
});
it('applies tied increasing ids and matches the fixed M2-1 FSRS oracle', () => {
  const first = applyAttempt(null, tiedFailure);
  const second = applyAttempt(first.state, tiedSuccess);
  expect(first.needsRebuild).toBe(false);
  expect(second).toEqual({ state: tiedExpected, needsRebuild: false });
});
it('does not apply the same attemptId twice or increase reps', () => {
  const prev = applyAttempt(null, tiedSuccess).state;
  const result = applyAttempt(prev, structuredClone(tiedSuccess));
  expect(result).toEqual({ state: prev, needsRebuild: false });
  expect(result.state).toBe(prev);
  expect(result.state?.card.reps).toBe(1);
});
it('uses equivalent UTC representations as a tie', () => {
  const prev = applyAttempt(null, { ...tiedSuccess, at: '2026-11-24T10:00:00Z' }).state;
  expect(applyAttempt(prev, tiedFailure)).toEqual({ state: prev, needsRebuild: true });
});
it('prioritizes the instant over the id for a later review', () => {
  const prev = applyAttempt(null, tiedSuccess).state;
  const result = applyAttempt(prev, { ...tiedFailure, at: '2026-11-25T10:00:00.000Z' });
  expect(result.needsRebuild).toBe(false);
  expect(result.state?.lastAttemptId).toBe('a');
  expect(result.state?.card.reps).toBe(2);
});
it('requests rebuild for a legacy cache without guessing or mutating it', () => {
  const legacy = { itemId: 'i1', itemGen: 1, card: tiedExpected.card };
  const before = structuredClone(legacy);
  const result = applyAttempt(legacy as ItemState, tiedSuccess);
  expect(result).toEqual({ state: before, needsRebuild: true });
  expect(result.state).toBe(legacy);
  expect(legacy).toEqual(before);
});
it('initializes a serializable empty id and records the first actual attempt', () => {
  const empty = newItemState('i1', 1);
  expect(empty.lastAttemptId).toBe('');
  const result = applyAttempt(empty, tiedSuccess);
  expect(result.needsRebuild).toBe(false);
  expect(result.state.lastAttemptId).toBe('b');
  expect(JSON.parse(JSON.stringify(result.state))).toEqual(result.state);
  expect(empty.lastAttemptId).toBe('');
});
