import { expect, it } from 'vitest';
import { mulberry32, shuffle } from './random.ts';
import { randomFixture } from '../../../tests/fixtures/study/planning.ts';

it('implements the fixed mulberry32 sequence for seed 1', () => {
  const random = mulberry32(randomFixture.seed);
  expect([random(), random(), random()]).toEqual(randomFixture.sequence);
});
it('shuffles deterministically without mutating and preserves the permutation', () => {
  const original = Object.freeze([...randomFixture.input]);
  expect(shuffle(original, 1)).toEqual(randomFixture.shuffled);
  expect(shuffle(original, 1)).toEqual(shuffle(original, 1));
  expect(shuffle(original, 1)).not.toEqual(shuffle(original, 2));
  expect(shuffle(original, 2).sort()).toEqual(original);
  expect(original).toEqual(randomFixture.input);
});
it('handles empty and singleton lists and repeated values', () => {
  expect(shuffle([], 1)).toEqual([]);
  expect(shuffle(['a'], 1)).toEqual(['a']);
  expect(shuffle(['a', 'a', 'b'], 1).sort()).toEqual(['a', 'a', 'b']);
});
it.each([NaN, Infinity, 1.5])('rejects invalid seed %s', seed => {
  expect(() => mulberry32(seed)).toThrow('Semilla');
});
