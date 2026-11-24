import { expect, it } from 'vitest';
import { examCatalog, examScores } from '../../../tests/fixtures/study/planning.ts';
import { buildChapterExam, examPassed } from './exam.ts';

it('E01 fills all real slots with distinct eligible chapter items', () => {
  const plan = buildChapterExam({ catalog: examCatalog(), subjectId: 'S', chapterId: 'c3', seed: 1 });
  expect(plan.itemIds).toHaveLength(5);
  expect(new Set(plan.itemIds).size).toBe(5);
  expect([...plan.slots].sort()).toEqual(['current', 'current', 'earlier', 'previous', 'relaciona']);
  plan.itemIds.forEach((id, i) => {
    const slot = plan.slots[i];
    if (slot === 'current') expect(id).toMatch(/^r/);
    if (slot === 'previous') expect(id).toMatch(/^q/);
    if (slot === 'earlier') expect(id).toMatch(/^p/);
    if (slot === 'relaciona') expect(['r3', 'p2']).toContain(id);
  });
});
it('E02 substitutes missing previous chapters using current items', () => {
  const plan = buildChapterExam({ catalog: examCatalog(), subjectId: 'S', chapterId: 'c1', seed: 1 });
  expect(plan.itemIds).toHaveLength(5);
  expect(new Set(plan.itemIds).size).toBe(5);
  expect(plan.itemIds.every(id => id.startsWith('p'))).toBe(true);
  expect(plan.slots.filter(slot => slot === 'current')).toHaveLength(2);
  expect(plan.slots.filter(slot => slot === 'substitute').length).toBeGreaterThanOrEqual(2);
});
it('E03 substitutes the missing earlier slot from the previous chapter', () => {
  const plan = buildChapterExam({ catalog: examCatalog(), subjectId: 'S', chapterId: 'c2', seed: 1 });
  expect(plan.itemIds).toHaveLength(5);
  expect(plan.slots.filter(slot => slot === 'current')).toHaveLength(2);
  expect(plan.slots.filter(slot => slot === 'previous')).toHaveLength(1);
  expect(plan.slots).not.toContain('earlier');
  expect(plan.itemIds[plan.slots.indexOf('substitute')]).toMatch(/^p/);
  expect(new Set(plan.itemIds).size).toBe(5);
});
it('E04 returns only available distinct items', () => {
  const plan = buildChapterExam({ catalog: examCatalog(1, 3), subjectId: 'S', chapterId: 'c1', seed: 1 });
  expect([...plan.itemIds].sort()).toEqual(['p1', 'p2', 'p3']);
});
it('E05 excludes archived, info, later chapters and another subject', () => {
  const catalog = examCatalog();
  const first = catalog.items.get('p1');
  const second = catalog.items.get('p2');
  if (first) first.archived = true;
  if (second) second.tipo = 'info';
  const chapter = catalog.chapters.get('c2');
  const block = catalog.blocks.get('B2');
  if (chapter) chapter.subjectId = 'T';
  if (block) block.subjectId = 'T';
  const plan = buildChapterExam({ catalog, subjectId: 'S', chapterId: 'c1', seed: 1 });
  expect([...plan.itemIds].sort()).toEqual(['p3', 'p4', 'p5', 'p6']);
});
it('E06 is deterministic, seed dependent and does not mutate the catalog', () => {
  const input = { catalog: examCatalog(), subjectId: 'S', chapterId: 'c3', seed: 1 };
  const before = structuredClone(input);
  expect(buildChapterExam(input)).toEqual(buildChapterExam(input));
  expect(buildChapterExam(input)).not.toEqual(buildChapterExam({ ...input, seed: 2 }));
  expect(input).toEqual(before);
});
it('falls back to current items when the previous chapter has no spare items', () => {
  const catalog = examCatalog(2);
  for (const item of catalog.items.values()) if (item.blockId === 'B1') item.archived = true;
  const plan = buildChapterExam({ catalog, subjectId: 'S', chapterId: 'c2', seed: 1 });
  expect(plan.itemIds).toHaveLength(5);
  expect(plan.itemIds.every(id => id.startsWith('q'))).toBe(true);
  expect(plan.slots.filter(slot => slot === 'substitute')).toHaveLength(3);
});
it('returns empty when no evaluable candidates exist', () => {
  expect(buildChapterExam({ catalog: examCatalog(1, 0), subjectId: 'S', chapterId: 'c1', seed: 1 }))
    .toEqual({ itemIds: [], slots: [] });
});
it('chooses earlier items from all chapters before the immediate previous chapter', () => {
  const catalog = examCatalog(4);
  const earlierIds = new Set<string>();
  for (let seed = 1; seed <= 20; seed++) {
    const plan = buildChapterExam({ catalog, subjectId: 'S', chapterId: 'c4', seed });
    const id = plan.itemIds[plan.slots.indexOf('earlier')];
    expect(id).toMatch(/^[pq]/);
    if (id) earlierIds.add(id[0] ?? '');
    expect(plan.itemIds[plan.slots.indexOf('previous')]).toMatch(/^r/);
  }
  expect([...earlierIds].sort()).toEqual(['p', 'q']);
});
it.each(['missing', 'c2'])('rejects an absent chapter %s', chapterId => {
  expect(() => buildChapterExam({ catalog: examCatalog(1), subjectId: 'S', chapterId, seed: 1 })).toThrow('Capítulo');
});
it.each(examScores)('scores %s correct of %s as %s', (correct, total, expected) => {
  expect(examPassed(correct, total)).toBe(expected);
});
it.each([[-1, 5], [6, 5], [0, -1], [1.5, 5], [NaN, 5], [0, Infinity]])('rejects invalid score %s / %s', (correct, total) => {
  expect(() => examPassed(correct, total)).toThrow('Resultado');
});
