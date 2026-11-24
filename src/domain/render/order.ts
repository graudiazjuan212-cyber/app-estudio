import { renderConfig } from '../../config.ts';
import { shuffle } from '../study/random.ts';

export function fnv1a32(text: string): number {
  let hash: number = renderConfig.hashOffset;
  for (let index = 0; index < text.length; index++) {
    hash = Math.imul(hash ^ text.charCodeAt(index), renderConfig.hashPrime);
  }
  return hash >>> 0;
}

export function seedFor(...parts: (string | number)[]): number {
  return fnv1a32(parts.join('|'));
}

export function displayOrder(length: number, seed: number, opts?: { avoidIdentity?: boolean }): number[] {
  if (!Number.isInteger(length) || length < 0) throw new RangeError('Longitud inválida.');
  const indices = Array.from({ length }, (_, index) => index);
  if (length <= 1) return indices;
  let result = shuffle(indices, seed);
  if (!opts?.avoidIdentity) return result;
  for (let retry = 1; result.every((value, index) => value === index); retry++) {
    if (retry > renderConfig.orderRetries) return [...indices.slice(1), 0];
    result = shuffle(indices, seed + retry);
  }
  return result;
}
