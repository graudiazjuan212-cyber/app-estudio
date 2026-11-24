import { screenConfig, studyConfig } from '../config.ts';
import type { PackDiff } from '../domain/pack/index.ts';
export function formatStudyDay(day: string | null): string {
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return 'Aún no has estudiado';
  const date = new Date(`${day}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || !date.toISOString().startsWith(day)) return 'Aún no has estudiado';
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'full', timeZone: 'UTC' }).format(date);
}
export function formatMinutes(seconds: number): string {
  return String(Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds / studyConfig.secondsPerMinute) : 0);
}
export function diffSummary(diff: PackDiff): string {
  const n = diff.newItems.length, k = diff.keptItems.length, a = diff.archivedItems.length;
  return `${String(n)} ${n === 1 ? 'pregunta nueva' : 'preguntas nuevas'}, ${String(k)} ${k === 1 ? 'conservada' : 'conservadas'}, ${String(a)} ${a === 1 ? 'archivada' : 'archivadas'}, ${String(diff.typeChanged.length)} con tipo cambiado, ${String(diff.movedItems.length)} ${diff.movedItems.length === 1 ? 'movida' : 'movidas'}`;
}
export function blockRequirementText(titles: string[]): string {
  return titles.length ? `🔒 Bloqueado: primero domina ${titles.map(title => `«${title}»`).join(', ')}` : '';
}
export function bytesToMegabytes(bytes: number | null): string {
  return bytes !== null && Number.isFinite(bytes) && bytes >= 0 ? (bytes / screenConfig.bytesPerMegabyte).toFixed(screenConfig.decimalPlaces) : '—';
}
