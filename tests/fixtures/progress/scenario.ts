import { readFileSync } from 'node:fs';
import { packSchema } from '../../../src/domain/pack/schema.ts';
import { applyAttempt, buildCatalog } from '../../../src/domain/study/index.ts';
import type { Attempt, ItemState } from '../../../src/domain/study/index.ts';
import type { ProgressInput } from '../../../src/domain/progress/export.ts';

export const context = { now: '2026-12-02T20:10:00.000Z', tz: 'Europe/Madrid' };
export function scenario(): ProgressInput {
  const pack = packSchema.parse(JSON.parse(readFileSync(new URL('../packs/mat-ejemplo-c01.json', import.meta.url), 'utf8')));
  const catalog = buildCatalog([pack], new Map());
  const chapter = catalog.chapters.get(pack.capitulo.id);
  if (!chapter) throw new Error('Missing fixture chapter');
  const titledChapter = { ...chapter, titulo: pack.capitulo.titulo };
  catalog.chapters.set(chapter.id, titledChapter);
  for (const block of pack.bloques) {
    const entry = catalog.blocks.get(block.id);
    if (!entry) throw new Error('Missing fixture block');
    const titledBlock = { ...entry, titulo: block.titulo, archived: false };
    catalog.blocks.set(block.id, titledBlock);
    for (const data of block.items) {
      const item = catalog.items.get(data.id);
      if (!item) throw new Error('Missing fixture item');
      catalog.items.set(data.id, { ...item, ...{ data } });
    }
  }
  const rows: [string, string, string, number, boolean, 'duda' | 'bastante' | 'seguro'][] = [
    ['s0', '2026-10-15', 'mat-i10', 15000, false, 'duda'],
    ['s1', '2026-11-24', 'mat-i1', 20000, true, 'bastante'],
    ['s1', '2026-11-24', 'mat-i2', 30000, true, 'bastante'],
    ['s1', '2026-11-24', 'mat-i3', 30000, true, 'bastante'],
    ['s1', '2026-11-24', 'mat-i4', 30000, true, 'bastante'],
    ['s1', '2026-11-24', 'mat-i5', 30000, true, 'bastante'],
    ['s2', '2026-11-27', 'mat-i2', 45000, true, 'bastante'],
    ['s2', '2026-11-27', 'mat-i3', 45000, true, 'bastante'],
    ['s2', '2026-11-27', 'mat-i4', 45000, true, 'bastante'],
    ['s2', '2026-11-27', 'mat-i5', 45000, true, 'bastante'],
    ['s3', '2026-11-28', 'mat-i6', 20000, true, 'bastante'],
    ['s3', '2026-11-28', 'mat-i7', 20000, true, 'bastante'],
    ['s3', '2026-11-28', 'mat-i8', 20000, false, 'seguro'],
    ['s3', '2026-11-28', 'mat-i9', 20000, true, 'bastante'],
    ['s3', '2026-11-28', 'mat-i10', 20000, true, 'bastante'],
    ['s4', '2026-12-01', 'mat-i8', 10000, false, 'duda'],
  ];
  const attempts: Attempt[] = rows.map(([sessionId, day, itemId, durationMs, correct, confidence], index) => {
    const item = catalog.items.get(itemId);
    if (!item) throw new Error('Missing fixture item');
    return { attemptId: `a${String(index).padStart(2, '0')}`, itemId, itemGen: 1, subjectId: 'ejmat',
      chapterId: 'ejmat-c01', blockId: item.blockId, tipo: item.tipo, at: `${day}T10:00:00.000Z`,
      studyDay: day, tz: context.tz, correct, dontKnow: false,
      confidence: item.tipo === 'info' || item.tipo === 'flashcard' ? null : confidence,
      rating: item.tipo === 'flashcard' ? 'bien' : null,
      durationMs, sessionId, packVersion: 1, schedulerVersion: 1 };
  });
  const other = attempts[0];
  if (!other) throw new Error('Missing fixture attempt');
  attempts.push({ ...other, attemptId: 'other', subjectId: 'otra', sessionId: 'other' });
  const sessions = [
    ['s0', '2026-10-15'], ['s1', '2026-11-24'], ['s2', '2026-11-27'],
    ['s3', '2026-11-28'], ['s4', '2026-12-01'], ['s5', '2026-12-02'], ['other', '2026-10-15'],
  ].map(([id = '', day = '']) => ({ id, kind: id === 's3' ? 'review' as const : 'study' as const,
    subjectId: id === 'other' ? 'otra' : 'ejmat', startedAt: `${day}T09:00:00.000Z`,
    endedAt: id === 's5' ? null : `${day}T11:00:00.000Z` }));
  const itemStates = new Map<string, ItemState>();
  for (const a of attempts.filter(a => a.subjectId === 'ejmat')) {
    const { state } = applyAttempt(itemStates.get(a.itemId) ?? null, a);
    if (state) itemStates.set(a.itemId, state);
  }
  return { subjectId: 'ejmat', catalog, attempts, sessions, itemStates, ...context };
}
