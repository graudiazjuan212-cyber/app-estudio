import type { Attempt } from './types.ts';

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length && keys.every(key =>
    Object.hasOwn(right, key) && deepEqual(left[key], right[key]));
}

export function groupAttempts(attempts: Attempt[]): Map<string, { first: Attempt; conflict: boolean }> {
  const groups = new Map<string, { first: Attempt; conflict: boolean }>();
  for (const attempt of attempts) {
    const group = groups.get(attempt.attemptId);
    if (group) group.conflict ||= !deepEqual(group.first, attempt);
    else groups.set(attempt.attemptId, { first: attempt, conflict: false });
  }
  return groups;
}
