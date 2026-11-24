// Frozen pre-M9-3 view implementation.
import { studyConfig } from '../../../src/config.ts';
import { chapterPercent, currentStreak, dailyGoalReached, evaluableIds, isDue,
  secondsStudiedToday, studyDay } from '../../../src/domain/study/index.ts';
import type { BlockState, Catalog } from '../../../src/domain/study/index.ts';
import type { StudyDb } from '../../../src/data/db.ts';
import type { DataContext } from '../../../src/data/cache.ts';
import { getSettings } from '../../../src/data/settings.ts';
import { backupReminderDue, getLastBackup } from '../../../src/data/reminder.ts';
import { getOpenSessions } from '../../../src/data/appStorage.ts';
import type { HomeView, SubjectView } from '../../../src/data/viewModels.ts';

function subjectPercent(catalog: Catalog, states: Map<string, BlockState>): number {
  let total = 0;
  let mastered = 0;
  for (const block of catalog.blocks.values()) {
    if (!evaluableIds(block, catalog).length) continue;
    total += block.peso;
    const status = states.get(block.id)?.status;
    if (status === 'dominado' || status === 'graduado') mastered += block.peso;
  }
  return total ? Math.floor(studyConfig.percentScale * mastered / total) : 0;
}
export async function referenceHomeView(db: StudyDb, ctx: DataContext): Promise<HomeView> {
  return db.transaction('r', [db.subjects, db.chapters, db.blocks, db.items, db.attempts,
    db.itemState, db.blockState, db.settings, db.meta, db.sessions], async () => {
    const today = studyDay(ctx.now, ctx.tz);
    const attempts = await db.attempts.toArray();
    const states = new Map((await db.blockState.toArray()).map(state => [state.blockId, state]));
    const itemStates = new Map((await db.itemState.toArray()).map(state => [state.itemId, state]));
    const answered = new Set(attempts.filter(a => a.studyDay === today).map(a => a.itemId));
    const subjects: HomeView['subjects'] = [];
    for (const subject of await db.subjects.toArray()) {
      const catalog = await loadCatalog(db, subject.id);
      const last = await db.attempts.where('[subjectId+studyDay]')
        .between([subject.id, ''], [subject.id, '\uffff']).last();
      const dueToday = [...catalog.items.values()].filter(item => {
        const state = itemStates.get(item.id);
        return item.tipo !== 'info' && !item.archived && state !== undefined &&
          !answered.has(item.id) && isDue(state, ctx.now, ctx.tz);
      }).length;
      subjects.push({ ...subject, percent: subjectPercent(catalog, states), dueToday, lastStudyDay: last?.studyDay ?? null });
    }
    const { dailyGoalMinutes } = await getSettings(db);
    const secondsToday = secondsStudiedToday(attempts, today);
    const open = (await getOpenSessions(db))[0];
    return { subjects, hasData: subjects.length > 0, dailyGoalMinutes, secondsToday,
      streak: currentStreak(attempts.map(a => a.studyDay), today),
      goalReached: dailyGoalReached(secondsToday, dailyGoalMinutes),
      backupReminder: backupReminderDue(await getLastBackup(db), ctx.now, attempts.length > 0),
      openSession: open ? { id: open.id, subjectId: open.subjectId, kind: open.kind } : null };
  });
}
export async function referenceSubjectView(db: StudyDb, subjectId: string, ctx: DataContext): Promise<SubjectView | null> {
  return db.transaction('r', [db.subjects, db.chapters, db.blocks, db.items, db.blockState], async () => {
    studyDay(ctx.now, ctx.tz);
    const subject = await db.subjects.get(subjectId);
    if (!subject) return null;
    const catalog = await loadCatalog(db, subjectId);
    const states = new Map((await db.blockState.where('subjectId').equals(subjectId).toArray()).map(s => [s.blockId, s]));
    const blocks = (await db.blocks.where('subjectId').equals(subjectId).toArray()).filter(b => !b.archived);
    const chapters = (await db.chapters.where('subjectId').equals(subjectId).toArray())
      .sort((a, b) => a.numero - b.numero || a.id.localeCompare(b.id)).map(chapter => {
        const chapterBlocks = blocks.filter(b => b.chapterId === chapter.id).sort((a, b) => a.order - b.order).map(block => {
          const catalogBlock = catalog.blocks.get(block.id);
          const state = states.get(block.id);
          return { id: block.id, titulo: block.titulo, peso: block.peso, requiere: block.requiere,
            evaluables: catalogBlock ? evaluableIds(catalogBlock, catalog).length : 0,
            status: state?.status ?? 'pendiente' as const,
            locked: state?.locked ?? block.requiere.some(id => !['dominado', 'graduado'].includes(states.get(id)?.status ?? '')) };
        });
        const entry = catalog.chapters.get(chapter.id);
        return { id: chapter.id, numero: chapter.numero, titulo: chapter.titulo,
          percent: entry ? chapterPercent(entry, catalog, states) : 0,
          hasEvaluables: chapterBlocks.some(b => b.evaluables > 0), blocks: chapterBlocks };
      });
    return { ...subject, percent: subjectPercent(catalog, states), chapters };
  });
}
// Frozen pre-M9-3 catalog reader.
async function loadCatalog(db: StudyDb, subjectId?: string): Promise<Catalog> {
  return db.transaction('r', [db.items, db.blocks, db.chapters], async () => {
    const chapters = await db.chapters.toArray();
    const blocks = (await db.blocks.toArray()).sort((a, b) => a.order - b.order);
    const items = (await db.items.toArray()).sort((a, b) => a.order - b.order);
    const catalog: Catalog = { items: new Map(), blocks: new Map(), chapters: new Map() };
    for (const chapter of chapters) {
      if (subjectId !== undefined && chapter.subjectId !== subjectId) continue;
      catalog.chapters.set(chapter.id, { id: chapter.id, subjectId: chapter.subjectId,
        numero: chapter.numero, blockIds: blocks.filter(b => b.chapterId === chapter.id).map(b => b.id) });
    }
    for (const block of blocks) {
      if (!catalog.chapters.has(block.chapterId)) continue;
      catalog.blocks.set(block.id, { id: block.id, subjectId: block.subjectId, chapterId: block.chapterId,
        peso: block.peso, requiere: [...block.requiere],
        itemIds: items.filter(i => i.blockId === block.id).map(i => i.id) });
    }
    for (const item of items) {
      if (catalog.blocks.has(item.blockId)) catalog.items.set(item.id, {
        id: item.id, tipo: item.tipo, blockId: item.blockId, itemGen: item.itemGen,
        archived: item.archived, relaciona: item.relaciona,
      });
    }
    return catalog;
  });
}
