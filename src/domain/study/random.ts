import { studyConfig } from '../../config.ts';

export function mulberry32(seed: number): () => number {
  if (!Number.isInteger(seed) || !Number.isFinite(seed)) throw new Error('Semilla inválida.');
  let state = seed >>> 0;
  const config = studyConfig.random;
  return () => {
    state = (state + config.increment) | 0;
    let value = Math.imul(state ^ (state >>> config.shiftA), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> config.shiftB), config.mix | value);
    return ((value ^ (value >>> config.shiftC)) >>> 0) / config.divisor;
  };
}

export function shuffle<T>(list: readonly T[], seed: number): T[] {
  const random = mulberry32(seed);
  const result = [...list];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    // Both indices are within the copied array, including when T contains undefined.
    const left = result[i] as T;
    result[i] = result[j] as T;
    result[j] = left;
  }
  return result;
}
