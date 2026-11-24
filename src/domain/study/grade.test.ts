import { expect, it } from 'vitest';
import { items } from '../../../tests/fixtures/study/items.ts';
import { gradeCases, malformedAnswers } from '../../../tests/fixtures/study/answers.ts';
import type { Answer } from './grade.ts';
import { grade, ratingToCorrect } from './grade.ts';

it.each(gradeCases)('grades $answer with correct=$correct without mutation', ({ answer, correct }) => {
  const item = items[answer.tipo];
  const beforeItem = structuredClone(item);
  const beforeAnswer = structuredClone(answer);
  expect(grade(item, answer)).toEqual({ ok: true, correct });
  expect(item).toEqual(beforeItem);
  expect(answer).toEqual(beforeAnswer);
});
it.each(malformedAnswers)('rejects malformed $tipo answer', answer => {
  const result = grade(items[answer.tipo], answer as unknown as Answer);
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.reason.length).toBeGreaterThan(0);
});
it.each(Object.values(items))('rejects mismatching or non-evaluable $tipo', item => {
  const answer: Answer = item.tipo === 'vf' ? { tipo: 'test', selected: 1 } : { tipo: 'vf', value: true };
  expect(grade(item, answer).ok).toBe(false);
});
it.each([null, undefined, {}, { tipo: 'unknown' }])('rejects missing or unknown answer %s', answer => {
  expect(grade(items.test, answer as Answer).ok).toBe(false);
});
it.each([
  ['otra', false], ['dificil', true], ['bien', true], ['facil', true],
] as const)('maps rating %s', (rating, expected) => { expect(ratingToCorrect(rating)).toBe(expected); });

it.each(['info', 'flashcard'] as const)('rejects a matching non-evaluable %s answer', tipo => {
  expect(grade(items[tipo], { tipo } as unknown as Answer).ok).toBe(false);
});
