/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { attempt, storedCard } from '../../../tests/fixtures/study/items.ts';
import type { Attempt, Confidence, ItemState } from './types.ts';
import { fromStoredCard, toStoredCard } from './types.ts';
import { applyAttempt, fsrsRating, isDue, newItemState } from './scheduler.ts';

interface Golden { at: string; correct: boolean; confidence: Confidence;
  scheduled_days: number; due: string; reps: number; lapses: number }
function golden(): Golden[] {
  return JSON.parse(readFileSync(new URL('../../../tests/fixtures/study/fsrs-golden.json', import.meta.url), 'utf8')) as Golden[];
}
function reviewed(patch: Partial<Attempt> = {}): ItemState {
  const { state } = applyAttempt(null, { ...attempt, ...patch });
  if (!state) throw new Error('Expected scheduled state');
  return state;
}
it('matches every fixed FSRS-6 (ts-fsrs 5.4.2) golden interval', () => {
  let state: ItemState | null = null;
  for (const row of golden()) {
    const applied: { state: ItemState | null; needsRebuild: boolean } = applyAttempt(state, { ...attempt, at: row.at, correct: row.correct, confidence: row.confidence });
    expect(applied.needsRebuild).toBe(false);
    expect(applied.state?.card).toMatchObject({ scheduled_days: row.scheduled_days,
      due: row.due, reps: row.reps, lapses: row.lapses });
    state = applied.state;
  }
});
it.each([
  [{ confidence: 'duda' }, 2], [{ confidence: 'bastante' }, 3], [{ confidence: 'seguro' }, 4],
  [{ correct: false }, 1], [{ correct: false, dontKnow: true, confidence: null }, 1],
  [{ tipo: 'info', confidence: null }, null],
  [{ tipo: 'flashcard', rating: 'otra', confidence: null, correct: false }, 1],
  [{ tipo: 'flashcard', rating: 'dificil', confidence: null }, 2],
  [{ tipo: 'flashcard', rating: 'bien', confidence: null }, 3],
  [{ tipo: 'flashcard', rating: 'facil', confidence: null }, 4],
] satisfies [Partial<Attempt>, number | null][])('maps %s to %s', (patch, expected) => {
  expect(fsrsRating({ ...attempt, ...patch })).toBe(expected);
});
it('orders the first confidence intervals', () => {
  const hard = reviewed({ confidence: 'duda' });
  const good = reviewed();
  const easy = reviewed({ confidence: 'seguro' });
  expect(hard.card.due <= good.card.due).toBe(true);
  expect(easy.card.due >= good.card.due).toBe(true);
});
it('orders flashcard intervals', () => {
  const dues = (['otra', 'dificil', 'bien', 'facil'] as const).map(rating => reviewed({
    tipo: 'flashcard', confidence: null, rating, correct: rating !== 'otra',
  }).card.due);
  expect(dues).toEqual([...dues].sort());
});
it('schedules a failure earlier than success at the same history point', () => {
  const prev = reviewed();
  const at = '2026-11-27T10:00:00.000Z';
  const failure = applyAttempt(prev, { ...attempt, at, correct: false });
  const success = applyAttempt(prev, { ...attempt, at });
  expect(failure.state.card.due < success.state.card.due).toBe(true);
});
it('schedules unknown exactly like Again', () => {
  expect(reviewed({ dontKnow: true, correct: false, confidence: null })).toEqual(reviewed({ correct: false }));
});
it('does not create or change info state', () => {
  const info: Attempt = { ...attempt, tipo: 'info', confidence: null };
  expect(applyAttempt(null, info)).toEqual({ state: null, needsRebuild: false });
  const prev = reviewed();
  expect(applyAttempt(prev, info)).toEqual({ state: prev, needsRebuild: false });
  expect(applyAttempt(prev, info).state).toBe(prev);
});
it('requests rebuilding for earlier reviews without changing prev', () => {
  const prev = reviewed();
  const before = structuredClone(prev);
  const applied = applyAttempt(prev, { ...attempt, at: '2026-11-23T10:00:00.000Z' });
  expect(applied).toEqual({ state: prev, needsRebuild: true });
  expect(applied.state).toBe(prev);
  expect(prev).toEqual(before);
});
it.each(['2026-11-24T10:00:00.000Z', '2026-11-27T10:00:00.000Z'])('accepts non-earlier %s without mutation', at => {
  const prev = reviewed();
  const before = structuredClone(prev);
  expect(applyAttempt(prev, { ...attempt, at }).needsRebuild).toBe(false);
  expect(prev).toEqual(before);
});
it.each([{ itemGen: 2 }, { itemId: 'other' }])('rejects mismatching identity %s', patch => {
  const prev = reviewed();
  expect(() => applyAttempt(prev, { ...attempt, ...patch })).toThrow('identity');
});
it('creates an empty deterministic state and seeds its first review with a.at', () => {
  const empty = newItemState('x', 1);
  const before = structuredClone(empty);
  expect(empty.card.reps).toBe(0);
  expect(empty.card.last_review).toBeUndefined();
  expect(applyAttempt(empty, attempt).state).toEqual(reviewed());
  expect(empty).toEqual(before);
});
it.each([['', 1], ['x', 0], ['x', 1.5]] as const)('rejects invalid identity %s %s', (id, gen) => {
  expect(() => newItemState(id, gen)).toThrow();
});
it('survives JSON serialization and can continue scheduling', () => {
  const prev = reviewed();
  const restored = JSON.parse(JSON.stringify(prev)) as ItemState;
  expect(restored).toEqual(prev);
  const next = { ...attempt, at: '2026-11-27T10:00:00.000Z' };
  expect(applyAttempt(restored, next)).toEqual(applyAttempt(prev, next));
  expect(toStoredCard(fromStoredCard(restored.card))).toEqual(restored.card);
});
it.each([
  ['2026-11-25T02:59:00.000Z', true], ['2026-11-25T03:00:00.000Z', false],
  ['2026-11-23T10:00:00.000Z', true], ['2026-11-26T10:00:00.000Z', false],
] as const)('isDue for %s is %s', (due, expected) => {
  const state: ItemState = { itemId: 'x', itemGen: 1, card: { ...storedCard, due } };
  expect(isDue(state, attempt.at, attempt.tz)).toBe(expected);
});
it.each([{ at: 'invalid' }, { confidence: null }])('rejects invalid scheduling input %s', patch => {
  const prev = reviewed();
  const before = structuredClone(prev);
  expect(() => applyAttempt(prev, { ...attempt, ...patch })).toThrow();
  expect(prev).toEqual(before);
});
it('rejects invalid due inputs', () => {
  const prev = reviewed();
  expect(() => isDue(prev, 'invalid', attempt.tz)).toThrow();
  expect(() => isDue(prev, attempt.at, 'Mars/Olimpo')).toThrow();
  expect(() => isDue({ ...prev, card: { ...prev.card, due: 'invalid' } }, attempt.at, attempt.tz)).toThrow();
});
