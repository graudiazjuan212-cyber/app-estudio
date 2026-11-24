import { generateBackup } from './big-data';
import { qualityExpected } from '../../tests/fixtures/quality';
import { qualityConfig as c } from './quality-config';
import { packSchema } from '../../src/domain/pack';

export function accessibilityBackup() {
  const backup = generateBackup({ subjects: 1, blocks: 5, items: 9, attempts: 1 });
  const { data } = backup;
  data.attempts = []; data.sessions = [];
  for (const [index, block] of data.blocks.entries()) {
    for (const day of qualityExpected.blockDays[index] ?? []) {
      const at = `${day}T09:00:00.000Z`, sessionId = `${block.id}-${day}`;
      const items = data.items.filter(item => item.blockId === block.id && item.tipo !== 'info');
      for (const item of items) data.attempts.push({ attemptId: `${item.id}-${day}`, itemId: item.id,
        itemGen: 1, subjectId: item.subjectId, chapterId: item.chapterId, blockId: block.id,
        tipo: item.tipo, at, studyDay: day, tz: 'Europe/Madrid', correct: true, dontKnow: false,
        confidence: item.tipo === 'flashcard' ? null : 'seguro', rating: item.tipo === 'flashcard' ? 'facil' : null,
        durationMs: c.durationMs, sessionId, packVersion: 1, schedulerVersion: 1 });
      data.sessions.push({ id: sessionId, subjectId: block.subjectId, chapterId: block.chapterId,
        kind: 'study', startedAt: at, endedAt: at, itemIds: items.map(i => i.id), minutes: 2,
        percentBefore: {}, result: { total: items.length, correct: items.length } });
    }
  }
  const locked = data.blocks[4], prerequisite = data.blocks[3], pack = data.packs[0];
  if (!locked || !prerequisite || !pack) throw new Error('Falta el bloque bloqueado.');
  locked.requiere = [prerequisite.id];
  const json: unknown = JSON.parse(pack.json);
  // Keep the stored pack consistent with the rows that restoration rebuilds.
  const parsed = packSchema.parse(json);
  const block = parsed.bloques[4];
  if (!block) throw new Error('Falta el bloque del paquete.');
  block.requiere = locked.requiere; pack.json = JSON.stringify(parsed);
  data.sessions.push({ id: 'quality-open', subjectId: 'large-s0', chapterId: null, kind: 'study',
    startedAt: c.now, endedAt: null, itemIds: data.items.filter(i => i.blockId === prerequisite.id).map(i => i.id),
    minutes: 5, percentBefore: {}, result: null });
  return backup;
}
