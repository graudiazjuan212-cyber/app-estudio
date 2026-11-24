import { studyConfig as config } from '../../config.ts';
import type { Attempt } from './types.ts';

function dayDate(day: string): Date {
  const date = new Date(`${day}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== day)
    throw new Error('Día de estudio inválido.');
  return date;
}
function shiftDay(day: string, offset: number): string {
  const date = dayDate(day);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}
export function previousDay(day: string): string { return shiftDay(day, -1); }
export function nextDay(day: string): string { return shiftDay(day, 1); }
export function currentStreak(studyDays: string[], today: string): number {
  dayDate(today);
  for (const day of studyDays) dayDate(day);
  const days = new Set(studyDays);
  let cursor = days.has(today) ? today : previousDay(today);
  let count = 0;
  while (days.has(cursor)) { count++; cursor = previousDay(cursor); }
  return count;
}
export function secondsStudiedToday(attempts: Attempt[], today: string): number {
  dayDate(today);
  let milliseconds = 0;
  for (const a of attempts) if (a.studyDay === today) {
    if (!Number.isInteger(a.durationMs) || a.durationMs < 0) throw new Error('Duración de intento inválida.');
    milliseconds += a.durationMs;
  }
  return milliseconds / config.millisecondsPerSecond;
}
export function dailyGoalReached(seconds: number, goalMinutes: number): boolean {
  if (!Number.isFinite(seconds) || seconds < 0 || !Number.isFinite(goalMinutes) || goalMinutes <= 0)
    throw new Error('Objetivo diario o tiempo inválido.');
  return seconds >= goalMinutes * config.secondsPerMinute;
}
