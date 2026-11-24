import type { Pack } from '../../../src/domain/pack/index.ts';
import type { StudyDb } from '../../../src/data/db.ts';
import { importPackText } from '../../../src/data/importPack.ts';
import { rebuildCache } from '../../../src/data/cache.ts';
import { attempt, context } from './helpers.ts';

export const viewScenarios = ['empty', 'unanswered', 'history', 'archived', 'open-gap'] as const;
export const viewExpected = {
  empty: { hasData: false, streak: 0, secondsToday: 0 },
  unanswered: { hasData: true, streak: 0, secondsToday: 0 },
  history: { hasData: true, streak: 3, secondsToday: 2 },
  archived: { hasData: true, streak: 3, secondsToday: 2 },
  'open-gap': { hasData: true, streak: 1, secondsToday: 2 },
};
export function smallPack(subject: string, blocks: number): Pack {
  return { schema: 'estudio-pack/1', asignatura: { id: subject, nombre: subject },
    capitulo: { id: `${subject}-c`, numero: 1, titulo: 'Capítulo' }, version: 1, generado: '2026-11-24',
    bloques: Array.from({ length: blocks }, (_, b) => ({ id: `${subject}-b${String(b)}`,
      titulo: 'Bloque', peso: 1, requiere: [], items: [
        { id: `${subject}-i${String(b)}`, tipo: 'vf', enunciado: 'Pregunta', correcta: true },
        { id: `${subject}-f${String(b)}`, tipo: 'flashcard', anverso: 'Cara', reverso: 'Respuesta' },
        { id: `${subject}-n${String(b)}`, tipo: 'info', titulo: 'Nota', cuerpo: 'Información' },
      ] })),
  };
}
/** Fixed seed, bounded to 3 blocks, 9 items, and 6 attempts; expectations above are handwritten. */
export async function seedViews(db: StudyDb, scenario: typeof viewScenarios[number]): Promise<void> {
  if (scenario === 'empty') return;
  let seed = 937;
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  await importPackText(db, JSON.stringify(smallPack('alpha', 2)), context);
  if (scenario === 'unanswered') return;
  await importPackText(db, JSON.stringify(smallPack('beta', 1)), context);
  const days = scenario === 'open-gap' ? ['2026-11-20', '2026-11-22', '2026-11-24']
    : ['2026-11-22', '2026-11-23', '2026-11-24'];
  for (const subject of ['alpha', 'beta']) for (const day of days) {
    await db.attempts.add(attempt({ attemptId: `${subject}-${day}`, itemId: `${subject}-i0`,
      subjectId: subject, chapterId: `${subject}-c`, blockId: `${subject}-b0`, tipo: 'vf',
      at: `${day}T10:00:00.000Z`, studyDay: day, confidence: 'seguro', correct: random() > 0.2 }));
  }
  await rebuildCache(db, context);
  // A due, unanswered flashcard exercises the strict cutoff, separately from today's attempts.
  await db.itemState.put({ itemId: 'alpha-f0', itemGen: 1, lastAttemptId: '', card: {
    due: '2026-11-20T00:00:00.000Z', stability: 0, difficulty: 0, elapsed_days: 0,
    scheduled_days: 0, reps: 0, lapses: 0, state: 0, learning_steps: 0,
  } });
  if (scenario === 'archived') {
    await db.items.update('alpha-f0', { archived: true });
    await db.blocks.update('alpha-b1', { archived: true });
  }
  if (scenario === 'open-gap') await db.sessions.add({ id: 'open', subjectId: 'alpha', kind: 'study',
    chapterId: null, startedAt: context.now, endedAt: null, itemIds: ['alpha-f0'], minutes: 10,
    percentBefore: { 'alpha-c': 0 }, result: null });
}
