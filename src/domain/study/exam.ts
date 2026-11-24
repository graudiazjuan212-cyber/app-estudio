import { studyConfig as config } from '../../config.ts';
import type { Catalog, CatalogItem } from './catalog.ts';
import { shuffle } from './random.ts';
import { compareText } from './history.ts';

export type ExamSlot = 'current' | 'previous' | 'earlier' | 'relaciona' | 'substitute';
export interface ExamPlan { itemIds: string[]; slots: ExamSlot[] }
export function buildChapterExam(input: { catalog: Catalog; subjectId: string; chapterId: string; seed: number }): ExamPlan {
  const { catalog, subjectId, chapterId, seed } = input;
  const chapter = catalog.chapters.get(chapterId);
  if (chapter?.subjectId !== subjectId) throw new Error('Capítulo ausente de la asignatura.');
  const previous = [...catalog.chapters.values()].filter(ch => ch.subjectId === subjectId && ch.numero < chapter.numero)
    .sort((a, b) => b.numero - a.numero || compareText(a.id, b.id))[0];
  const items = [...catalog.items.values()].filter(item => {
    const block = catalog.blocks.get(item.blockId);
    const ch = block && catalog.chapters.get(block.chapterId);
    return !item.archived && item.tipo !== 'info' && block?.subjectId === subjectId &&
      ch?.subjectId === subjectId && ch.numero <= chapter.numero;
  });
  const chapterOf = (item: CatalogItem) => catalog.blocks.get(item.blockId)?.chapterId;
  const current = items.filter(item => chapterOf(item) === chapterId);
  const prior = items.filter(item => previous !== undefined && chapterOf(item) === previous.id);
  const earlier = items.filter(item => {
    const id = chapterOf(item);
    const ch = id === undefined ? undefined : catalog.chapters.get(id);
    return previous !== undefined && ch !== undefined && ch.numero < previous.numero;
  });
  const chosen: { id: string; slot: ExamSlot }[] = [];
  const used = new Set<string>();
  const take = (group: CatalogItem[], count: number, slot: ExamSlot): number => {
    const candidates = shuffle(group.filter(item => !used.has(item.id)).sort((a, b) => compareText(a.id, b.id)), seed);
    const picked = candidates.slice(0, count);
    for (const item of picked) { chosen.push({ id: item.id, slot }); used.add(item.id); }
    return count - picked.length;
  };
  take(current, config.examSize.current, 'current');
  const missingPrevious = take(prior, config.examSize.previous, 'previous');
  const missingEarlier = take(earlier, config.examSize.earlier, 'earlier');
  // Reserve the real relaciona slot before filling missing slots with substitutes.
  const missingRelaciona = take(items.filter(item => item.relaciona), config.examSize.relaciona, 'relaciona');
  const missing = take(prior, missingPrevious + missingEarlier, 'substitute');
  take(current, missing, 'substitute');
  take(items, missingRelaciona, 'substitute');
  const result = shuffle(chosen, seed + 1);
  return { itemIds: result.map(item => item.id), slots: result.map(item => item.slot) };
}
export function examPassed(correct: number, total: number): boolean {
  if (!Number.isInteger(correct) || !Number.isInteger(total) || correct < 0 || total < 0 || correct > total)
    throw new Error('Resultado de examen inválido.');
  return total > 0 && correct * config.percentScale >= total * config.examPassPercent;
}
