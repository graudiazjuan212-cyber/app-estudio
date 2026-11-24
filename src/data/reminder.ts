import { z } from 'zod';
import { dataConfig, studyConfig } from '../config.ts';
import type { StudyDb } from './db.ts';

function instantMillis(value: string): number {
  return z.iso.datetime({ offset: true }).safeParse(value).success ? Date.parse(value) : NaN;
}
export async function markBackupDone(db: StudyDb, now: string): Promise<void> {
  if (!Number.isFinite(instantMillis(now))) throw new Error('El instante de la copia no es válido.');
  await db.meta.put({ key: 'lastBackupAt', value: now });
}
export async function getLastBackup(db: StudyDb): Promise<string | null> {
  const row = await db.meta.get('lastBackupAt');
  return typeof row?.value === 'string' ? row.value : null;
}
export function backupReminderDue(lastBackupAt: string | null, now: string, hasAttempts: boolean): boolean {
  const current = instantMillis(now);
  if (!Number.isFinite(current)) return true;
  if (lastBackupAt === null) return hasAttempts;
  const previous = instantMillis(lastBackupAt);
  return !Number.isFinite(previous) || current - previous >= dataConfig.backupReminderDays * studyConfig.millisecondsPerDay;
}
