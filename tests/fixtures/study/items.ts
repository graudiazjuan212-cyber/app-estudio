import type { Item, ItemType } from '../../../src/domain/pack/index.ts';
import type { Attempt } from '../../../src/domain/study/types.ts';
export const items = {
  info: { id: 'i', tipo: 'info', titulo: 'Nota', cuerpo: 'Texto' },
  flashcard: { id: 'f', tipo: 'flashcard', anverso: 'A', reverso: 'B' },
  test: { id: 't', tipo: 'test', enunciado: 'Elige', opciones: [
    { texto: 'A', correcta: false }, { texto: 'B', correcta: true }, { texto: 'C', correcta: false }] },
  multi: { id: 'm', tipo: 'multi', enunciado: 'Elige', opciones: [
    { texto: 'A', correcta: true }, { texto: 'B', correcta: false }, { texto: 'C', correcta: true }] },
  vf: { id: 'v', tipo: 'vf', enunciado: 'Verdad', correcta: true },
  ordenar: { id: 'o', tipo: 'ordenar', enunciado: 'Ordena', pasos: ['A', 'B', 'C'] },
  emparejar: { id: 'p', tipo: 'emparejar', enunciado: 'Une', pares: [
    { izquierda: 'A', derecha: 'Uno' }, { izquierda: 'B', derecha: 'Dos' }, { izquierda: 'C', derecha: 'Tres' }] },
  huecos: { id: 'h', tipo: 'huecos', enunciado: '{{2}} {{1}}', huecos: [
    { n: 2, opciones: [{ texto: 'A', correcta: false }, { texto: 'B', correcta: true }] },
    { n: 1, opciones: [{ texto: 'C', correcta: true }, { texto: 'D', correcta: false }] }] },
  error: { id: 'e', tipo: 'error', enunciado: 'Marca', pasos: [
    { texto: 'A', incorrecto: false }, { texto: 'B', incorrecto: true }, { texto: 'C', incorrecto: false }] },
} satisfies Record<ItemType, Item>;
export const attempt: Attempt = {
  attemptId: 'a', itemId: 'x', itemGen: 1, subjectId: 's', chapterId: 'c', blockId: 'b', tipo: 'test',
  at: '2026-11-24T10:00:00.000Z', studyDay: '2026-11-24', tz: 'Europe/Madrid',
  correct: true, dontKnow: false, confidence: 'bastante', rating: null,
  durationMs: 100, sessionId: 's', packVersion: 1, schedulerVersion: 1,
};
export const storedCard = {
  due: '2026-11-27T10:00:00.000Z', stability: 3.2602, difficulty: 2,
  elapsed_days: 0, scheduled_days: 3, learning_steps: 0, reps: 1, lapses: 0, state: 2,
  last_review: '2026-11-24T10:00:00.000Z',
} as const;
