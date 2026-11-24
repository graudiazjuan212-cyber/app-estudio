import { markerCases, placeCases, unplaceCases, pairCases, indexCases } from '../../../tests/fixtures/question';
import { expect, it } from 'vitest';
import { originalIndex, placeStep, unplaceStep, togglePair, substituteMarkers } from './question';
it.each(markerCases)('markers %s', (input, expected) => { expect(substituteMarkers(input)).toBe(expected); });
it.each(placeCases)('place $order', ({ order, step, expected }) => { expect(placeStep(order, step)).toEqual(expected); });
it.each(unplaceCases)('unplace $order', ({ order, step, expected }) => { expect(unplaceStep(order, step)).toEqual(expected); });
it.each(pairCases)('pairs $left $right', ({ pairs, left, right, expected }) => {
  expect(togglePair(pairs as [number, number][], left, right)).toEqual(expected);
});
it.each(indexCases)('original index %s', (visible, expected) => {
  expect(originalIndex([2, 0, 1], visible)).toBe(expected);
});
