import { studyConfig } from '../../config.ts';

function parseInstant(instant: string | Date): Date {
  const date = new Date(instant);
  if (!Number.isFinite(date.getTime())) throw new Error('Invalid instant');
  return date;
}
function localParts(date: Date, tz: string): { date: string; hour: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === type)?.value ?? '';
  return { date: `${part('year')}-${part('month')}-${part('day')}`, hour: Number(part('hour')) };
}
function shiftDay(day: string, offset: number): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}
export function studyDay(instant: string | Date, tz: string): string {
  const local = localParts(parseInstant(instant), tz);
  return local.hour < studyConfig.dayCutoffHour ? shiftDay(local.date, -1) : local.date;
}
export function nextCutoff(instant: string | Date, tz: string): string {
  const target = shiftDay(studyDay(instant, tz), 1);
  const midnight = new Date(`${target}T00:00:00.000Z`).getTime();
  // Search in UTC for the first local wall hour at the target cutoff. No fixed-hour
  // subtraction from the review instant: DST changes retain the local boundary.
  const radius = studyConfig.cutoffSearchDays * studyConfig.millisecondsPerDay;
  let low = midnight - radius;
  let high = midnight + radius;
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    const local = localParts(new Date(middle), tz);
    if (local.date < target || (local.date === target && local.hour < studyConfig.dayCutoffHour)) low = middle;
    else high = middle;
  }
  const result = new Date(high);
  const local = localParts(result, tz);
  if (local.date !== target || local.hour !== studyConfig.dayCutoffHour) throw new Error('Local cutoff does not exist');
  return result.toISOString();
}
