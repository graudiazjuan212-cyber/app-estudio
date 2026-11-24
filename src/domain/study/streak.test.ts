import { expect, it } from 'vitest';
import { fractionalDuration, streakCases, todayDurations } from '../../../tests/fixtures/study/planning.ts';
import { currentStreak, dailyGoalReached, nextDay, previousDay, secondsStudiedToday } from './streak.ts';

it.each(streakCases)('counts consecutive days %j ending near %s as %s', (days, today, expected) => {
  const before = [...days];
  expect(currentStreak(days, today)).toBe(expected);
  expect(days).toEqual(before);
});
it('shifts UTC days over month, year, leap day and DST boundaries', () => {
  expect(previousDay('2026-03-01')).toBe('2026-02-28');
  expect(nextDay('2028-02-28')).toBe('2028-02-29');
  expect(nextDay('2026-12-31')).toBe('2027-01-01');
  expect(previousDay('2027-01-01')).toBe('2026-12-31');
  expect(previousDay('2028-03-01')).toBe('2028-02-29');
  expect(nextDay('2026-03-29')).toBe('2026-03-30');
  expect(previousDay('2026-10-26')).toBe('2026-10-25');
});
it.each(['', '2026-02-30', '2026-2-03', 'invalid'])('rejects invalid day %s', day => {
  expect(() => previousDay(day)).toThrow('Día');
  expect(() => nextDay(day)).toThrow('Día');
  expect(() => currentStreak([day], '2026-11-10')).toThrow('Día');
  expect(() => currentStreak([], day)).toThrow('Día');
});
it('sums only today in seconds, preserving fractions', () => {
  expect(secondsStudiedToday(todayDurations, '2026-11-10')).toBe(120);
  expect(secondsStudiedToday([fractionalDuration], '2026-11-10')).toBe(1.234);
  expect(secondsStudiedToday(todayDurations, '2026-11-08')).toBe(0);
  expect(secondsStudiedToday([], '2026-11-10')).toBe(0);
});
it('checks the exact daily goal threshold', () => {
  expect(dailyGoalReached(300, 5)).toBe(true);
  expect(dailyGoalReached(299.9, 5)).toBe(false);
  expect(dailyGoalReached(301, 5)).toBe(true);
});
it.each([-1, NaN, Infinity, 0.5])('rejects invalid study duration %s', durationMs => {
  expect(() => secondsStudiedToday(todayDurations.map(a => ({ ...a, durationMs })), '2026-11-10')).toThrow('Duración');
});
it.each([[-1, 5], [NaN, 5], [Infinity, 5], [300, 0], [300, -1], [300, NaN]])('rejects invalid goal inputs %s / %s', (seconds, goal) => {
  expect(() => dailyGoalReached(seconds, goal)).toThrow('Objetivo');
});
