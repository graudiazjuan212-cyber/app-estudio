import { studyConfig } from '../config.ts';
import type { StudyDb } from './db.ts';

export interface Settings {
  sessionMinutes: 5 | 10 | 15;
  dailyGoalMinutes: 5 | 10 | 15;
  theme: 'system' | 'light' | 'dark';
}
function valid(key: string, value: unknown): boolean {
  if (!(key === 'theme' || key === 'sessionMinutes' || key === 'dailyGoalMinutes')) return false;
  return key === 'theme' ? studyConfig.themes.some(theme => theme === value)
    : studyConfig.dailyGoalMinutes.some(minutes => minutes === value);
}
export async function getSettings(db: StudyDb): Promise<Settings> {
  const rows = new Map((await db.settings.toArray()).map(row => [row.key, row.value]));
  const read = <K extends keyof Settings>(key: K, fallback: Settings[K]): Settings[K] =>
    valid(key, rows.get(key)) ? rows.get(key) as Settings[K] : fallback;
  return {
    sessionMinutes: read('sessionMinutes', studyConfig.defaultSessionMinutes),
    dailyGoalMinutes: read('dailyGoalMinutes', studyConfig.defaultDailyGoalMinutes),
    theme: read('theme', studyConfig.defaultTheme),
  };
}
export async function setSetting<K extends keyof Settings>(db: StudyDb, key: K, value: Settings[K]): Promise<void> {
  if (!valid(key, value)) throw new Error('El ajuste no tiene un valor permitido.');
  await db.settings.put({ key, value });
}
