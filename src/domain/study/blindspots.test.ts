import { expect, it } from 'vitest';
import { blindCases } from '../../../tests/fixtures/study/blindspots.ts';
import { catalogFixture } from '../../../tests/fixtures/study/catalog.ts';
import { D1, D2, bad, ok } from '../../../tests/fixtures/study/attempts.ts';
import { pendingBlindSpots } from './blindspots.ts';

it.each(blindCases())('$id matches fixed blind spots even with shuffled input', ({ catalog, attempts, expected }) => {
  expect(pendingBlindSpots(catalog, attempts)).toEqual(expected);
  expect(pendingBlindSpots(catalog, [...attempts].reverse())).toEqual(expected);
});
it('ignores absent and info items and leaves the input untouched', () => {
  const catalog = catalogFixture(1, 'info');
  const attempts = [bad('i1', D1, 'seguro'), bad('absent', D1, 'seguro')];
  const before = structuredClone({ catalog, attempts });
  expect(pendingBlindSpots(catalog, attempts)).toEqual([]);
  expect({ catalog, attempts }).toEqual(before);
});
it('requires a chronologically later attempt as well as a later study day', () => {
  const catalog = catalogFixture();
  const attempts = [bad('i1', D1, 'seguro'), { ...ok('i1', D2), at: `${D1}T09:00:00.000Z` }];
  expect(pendingBlindSpots(catalog, attempts)).toEqual([{ itemId: 'i1', since: D1 }]);
});
it('resolves tied instants according to attemptId', () => {
  const catalog = catalogFixture();
  const failure = { ...bad('i1', D1, 'seguro'), attemptId: 'a' };
  const success = { ...ok('i1', D2), at: failure.at, attemptId: 'b' };
  expect(pendingBlindSpots(catalog, [success, failure])).toEqual([]);
  expect(pendingBlindSpots(catalog, [{ ...success, attemptId: '0' }, failure]))
    .toEqual([{ itemId: 'i1', since: D1 }]);
});
