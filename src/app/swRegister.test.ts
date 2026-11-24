import { expect, it } from 'vitest';
import { pendingCases, reloadCases } from '../../tests/fixtures/fingerprint.ts';
import { reloadAfterLeavingSession, shouldReloadNow } from './swRegister.ts';
it.each(reloadCases)('C1: reload initiatedHere=%s sessionActive=%s -> %s', (initiatedHere, sessionActive, expected) => {
  expect(shouldReloadNow({ initiatedHere, sessionActive })).toBe(expected);
});
it.each(pendingCases)('C1: pending reload=%s sessionActive=%s -> %s', (reloadPending, sessionActive, expected) => {
  expect(reloadAfterLeavingSession({ reloadPending, sessionActive })).toBe(expected);
});
