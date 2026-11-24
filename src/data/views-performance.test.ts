import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { context, testDb } from '../../tests/fixtures/data/helpers.ts';
import { seedViews, viewScenarios, viewExpected } from '../../tests/fixtures/data/performanceViews.ts';
import { referenceHomeView, referenceSubjectView } from '../../tests/fixtures/data/referenceViews.ts';
import * as catalog from './catalog.ts';
import type { StudyDb } from './db.ts';
import { getHomeView, getSubjectView } from './views.ts';

let db: StudyDb;
beforeEach(async () => { db = await testDb(); });
afterEach(async () => { vi.restoreAllMocks(); await db.delete(); });
it.each(viewScenarios)('preserves exact home and subject outputs: %s', async scenario => {
  await seedViews(db, scenario);
  expect(await getHomeView(db, context)).toEqual(await referenceHomeView(db, context));
  expect(await getHomeView(db, context)).toMatchObject(viewExpected[scenario]);
  for (const id of ['alpha', 'beta', 'missing'])
    expect(await getSubjectView(db, id, context)).toEqual(await referenceSubjectView(db, id, context));
  const due = scenario === 'history' || scenario === 'open-gap' ? 1 : 0;
  if (scenario !== 'empty') expect((await getHomeView(db, context)).subjects[0]?.dueToday).toBe(due);
});
it('uses neither whole attempts/items nor loadCatalog in either view', async () => {
  await seedViews(db, 'history');
  const attempts = vi.spyOn(db.attempts, 'toArray');
  const items = vi.spyOn(db.items, 'toArray');
  const load = vi.spyOn(catalog, 'loadCatalog');
  await getHomeView(db, context);
  await getSubjectView(db, 'alpha', context);
  expect(attempts).not.toHaveBeenCalled();
  expect(items).not.toHaveBeenCalled();
  expect(load).not.toHaveBeenCalled();
});
