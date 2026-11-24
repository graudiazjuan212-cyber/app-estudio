import { expect, it } from 'vitest';
import { tiedSuccess, invalidDays, validDays, invalidZones, validZones }
  from '../../../tests/fixtures/study/adversarial.ts';
import { validateAttempt } from './types.ts';
import type { Attempt } from './types.ts';

it.each(invalidDays)('rejects impossible or malformed study day %s', studyDay => {
  expect(validateAttempt({ ...tiedSuccess, studyDay })).toEqual(['Invalid study day']);
});
it.each(validDays)('accepts real calendar day %s without recalculating it', studyDay => {
  const attempt = { ...tiedSuccess, studyDay };
  const before = structuredClone(attempt);
  expect(validateAttempt(attempt)).toEqual([]);
  expect(attempt).toEqual(before);
});
it.each(invalidZones)('rejects unsupported or empty time zone %s', tz => {
  expect(validateAttempt({ ...tiedSuccess, tz })).toEqual(['Invalid time zone']);
});
it.each(validZones)('accepts supported time zone %s', tz => {
  expect(validateAttempt({ ...tiedSuccess, tz })).toEqual([]);
});
it.each([undefined, null, 42])('rejects missing or malformed calendar fields %s', value => {
  expect(validateAttempt({ ...tiedSuccess, studyDay: value, tz: value } as unknown as Attempt))
    .toEqual(['Invalid study day', 'Invalid time zone']);
});
