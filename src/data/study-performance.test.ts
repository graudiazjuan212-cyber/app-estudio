import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { context, testDb } from '../../tests/fixtures/data/helpers.ts';
import { seedViews } from '../../tests/fixtures/data/performanceViews.ts';
import { buildSession, chapterPercent, rebuildFromAttempts, studyDay } from '../domain/study/index.ts';
import * as rebuild from '../domain/study/rebuild.ts';
import type { StudyDb } from './db.ts';
import { rebuildCache } from './cache.ts';
import { loadCatalog } from './catalog.ts';
import { startStudySession } from './study.ts';

let db: StudyDb;
beforeEach(async () => { db = await testDb(); });
afterEach(async () => { vi.restoreAllMocks(); await db.delete(); });
it.each(['unanswered', 'history', 'archived', 'open-gap'] as const)(
  'starts the same plan and percentages as a full history rebuild: %s', async scenario => {
    await seedViews(db, scenario);
    await rebuildCache(db, context);
    const input = { sessionId: 'planned', subjectId: 'alpha', kind: 'study' as const,
      chapterId: null, minutes: 10, seed: 937 };
    const catalog = await loadCatalog(db, 'alpha');
    const attempts = await db.attempts.where('subjectId').equals('alpha').toArray();
    const derived = rebuildFromAttempts(attempts, catalog, studyDay(context.now, context.tz));
    const expected = buildSession({ ...input, ...context, catalog, attempts, derived });
    const spy = vi.spyOn(rebuild, 'rebuildFromAttempts');
    expect(await startStudySession(db, input, context)).toEqual({ status: 'started', sessionId: 'planned' });
    const session = await db.sessions.get('planned');
    expect(session?.itemIds).toEqual(expected.itemIds);
    expect(session?.percentBefore).toEqual(Object.fromEntries([...catalog.chapters.values()]
      .map(chapter => [chapter.id, chapterPercent(chapter, catalog, derived.blocks)])));
    expect(spy).not.toHaveBeenCalled();
  });
it('falls back to reconstruction when a block cache is missing', async () => {
  await seedViews(db, 'history');
  await db.blockState.clear();
  const spy = vi.spyOn(rebuild, 'rebuildFromAttempts');
  expect(await startStudySession(db, { sessionId: 'fallback', subjectId: 'alpha', kind: 'study',
    chapterId: null, minutes: 10, seed: 937 }, context)).toMatchObject({ status: 'started' });
  expect(spy).toHaveBeenCalledOnce();
});
