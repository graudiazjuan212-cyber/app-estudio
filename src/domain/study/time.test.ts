import { expect, it } from 'vitest';
import { madridDays, otherDays, cutoffs } from '../../../tests/fixtures/study/time.ts';
import { studyDay, nextCutoff } from './time.ts';

it.each(madridDays)('Madrid study day at %s', (at, expected) => {
  expect(studyDay(at, 'Europe/Madrid')).toBe(expected);
  expect(studyDay(new Date(at), 'Europe/Madrid')).toBe(expected);
});
it.each(otherDays)('study day at %s in %s', (at, tz, expected) => {
  expect(studyDay(at, tz)).toBe(expected);
});
it.each(cutoffs)('next cutoff at %s', (at, expected) => {
  expect(nextCutoff(at, 'Europe/Madrid')).toBe(expected);
  expect(nextCutoff(new Date(at), 'Europe/Madrid')).toBe(expected);
});
it.each([studyDay, nextCutoff])('%s rejects invalid inputs', fn => {
  expect(() => fn('2026-11-24T10:00:00Z', 'Mars/Olimpo')).toThrow();
  expect(() => fn('no-es-fecha', 'Europe/Madrid')).toThrow();
  expect(() => fn(new Date('invalid'), 'Europe/Madrid')).toThrow();
});
