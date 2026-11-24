import { expect, it, vi } from 'vitest';
import { displayOrder, fnv1a32, seedFor } from './order.ts';
import { shuffle } from '../study/random.ts';
import { hashVectors, invalidLengths, orderInput, rotatedOrder, seedParts, seedText } from '../../../tests/fixtures/render/order.ts';

it.each(hashVectors)('hashes %s to the known FNV-1a vector', (input, expected) => {
  expect(fnv1a32(input)).toBe(expected);
});
it('joins seed parts with a pipe', () => {
  expect(seedFor(...seedParts)).toBe(fnv1a32(seedText));
  expect(seedFor()).toBe(2166136261);
});
it('returns a deterministic permutation', () => {
  expect(displayOrder(5, 7).sort()).toEqual(orderInput);
  expect(displayOrder(5, 7)).toEqual(displayOrder(5, 7));
  expect(displayOrder(8, 1)).not.toEqual(displayOrder(8, 2));
});
it('handles empty and singleton orders even with identity avoidance', () => {
  expect(displayOrder(0, 7)).toEqual([]);
  expect(displayOrder(1, 7)).toEqual([0]);
  expect(displayOrder(0, 7, { avoidIdentity: true })).toEqual([]);
  expect(displayOrder(1, 7, { avoidIdentity: true })).toEqual([0]);
});
it('never returns identity when requested for lengths 2 through 8 and seeds 0 through 199', () => {
  for (let length = 2; length <= 8; length++) {
    for (let seed = 0; seed < 200; seed++) {
      const result = displayOrder(length, seed, { avoidIdentity: true });
      expect(result.some((value, index) => value !== index)).toBe(true);
      expect(new Set(result).size).toBe(length);
      expect(result.every(value => value >= 0 && value < length)).toBe(true);
    }
  }
});
it.each(invalidLengths)('rejects invalid length %s', length => {
  expect(() => displayOrder(length, 7)).toThrow(RangeError);
});
it('does not mutate the input passed to shuffle', () => {
  const input = Object.freeze([...orderInput]);
  shuffle(input, 7);
  expect(input).toEqual(orderInput);
});
it('rotates after ten unsuccessful retries', async () => {
  vi.resetModules();
  vi.doMock('../study/random.ts', () => ({ shuffle: vi.fn((input: number[]) => [...input]) }));
  try {
    const { displayOrder: forcedOrder } = await import('./order.ts');
    const { shuffle: forcedShuffle } = await import('../study/random.ts');
    expect(forcedOrder(5, 7, { avoidIdentity: true })).toEqual(rotatedOrder);
    expect(forcedShuffle).toHaveBeenCalledTimes(11);
    expect(forcedShuffle).toHaveBeenLastCalledWith([0, 1, 2, 3, 4], 17);
    expect(forcedOrder(5, 7, { avoidIdentity: false })).toEqual(orderInput);
  } finally {
    vi.doUnmock('../study/random.ts');
    vi.resetModules();
  }
});
