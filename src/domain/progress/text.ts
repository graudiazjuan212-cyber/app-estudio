import { progressConfig as c } from '../../config.ts';
import type { Item } from '../pack/index.ts';

export function shortText(item: Item): string {
  const base = item.tipo === 'info' ? item.titulo : item.tipo === 'flashcard' ? item.anverso : item.enunciado;
  const text = base.replace(/\{\{\d+\}\}/g, '___').replace(/\s+/g, ' ').trim();
  return text.length > c.shortTextMax ? `${text.slice(0, c.shortTextMax)}…` : text;
}
export function progressFileName(subjectId: string, today: string): string {
  return `progreso_${subjectId}_${today}.json`;
}
export function formatIsoWithOffset(instant: string, tz: string): string {
  const date = new Date(instant);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit',
    minute: '2-digit', second: '2-digit', hourCycle: 'h23', timeZoneName: 'longOffset',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => {
    const value = parts.find(p => p.type === type)?.value;
    if (!value) throw new Error('No se puede formatear la fecha de exportación.');
    return value;
  };
  const zone = get('timeZoneName').replace('GMT', '') || '+00:00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}${zone}`;
}
