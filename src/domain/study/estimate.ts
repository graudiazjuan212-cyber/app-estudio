import { studyConfig as config } from '../../config.ts';
import type { ItemType } from '../pack/index.ts';
import type { Attempt } from './types.ts';

export function estimateSeconds(tipo: ItemType, attempts: Attempt[]): number {
  const durations = attempts.filter(a => a.tipo === tipo).map(a => {
    if (!Number.isInteger(a.durationMs) || a.durationMs < 0) throw new Error('Duración de intento inválida.');
    return a.durationMs / config.millisecondsPerSecond;
  });
  if (durations.length < config.calibrationMinAttempts) return config.secondsPerType[tipo];
  durations.sort((a, b) => a - b);
  const middle = Math.floor(durations.length / 2);
  const upper = durations[middle];
  const lower = durations[durations.length % 2 === 0 ? middle - 1 : middle];
  if (upper === undefined || lower === undefined) throw new Error('Faltan duraciones para calibrar.');
  return Math.min(config.calibrationClampSeconds[1], Math.max(config.calibrationClampSeconds[0], (lower + upper) / 2));
}
