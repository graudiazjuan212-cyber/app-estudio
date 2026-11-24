import { expect, it } from 'vitest';
import { masteryCases, successfulDay, validDay } from '../../../tests/fixtures/study/mastery.ts';
import { catalogFixture, fixtureBlock, fixtureChapter, weightedCatalog } from '../../../tests/fixtures/study/catalog.ts';
import { D1, D2, D3, D4, D5, D6, ok, bad, flash } from '../../../tests/fixtures/study/attempts.ts';
import { allBlockStates, blockState, chapterPercent } from './mastery.ts';
import type { BlockStatus } from './mastery.ts';

it.each(masteryCases())('$id matches the complete fixed state', ({ catalog, attempts, today, expected }) => {
  const actual = blockState(fixtureBlock(catalog), catalog, attempts, today);
  expect(actual).toEqual({ blockId: 'B', locked: false, ...expected });
  expect(allBlockStates(catalog, attempts, today).get('B')).toEqual(actual);
});
it('breaks first-attempt ties by attemptId, independently of input order', () => {
  const catalog = catalogFixture();
  const attempts = [ok('i1', D1), ok('i2', D1), ok('i3', D1),
    { ...ok('i4', D1), attemptId: 'z' }, { ...bad('i4', D1, 'duda'), attemptId: 'a' }];
  expect(blockState(fixtureBlock(catalog), catalog, attempts, D1).validDays).toEqual([]);
  expect(blockState(fixtureBlock(catalog), catalog, [...attempts].reverse(), D1).validDays).toEqual([]);
  attempts[3] = { ...ok('i4', D1), attemptId: '0' };
  expect(blockState(fixtureBlock(catalog), catalog, attempts, D1).validDays).toEqual([D1]);
});
it('does not count the loss day even when its first attempts pass the threshold', () => {
  const catalog = catalogFixture();
  expect(blockState(fixtureBlock(catalog), catalog,
    [...validDay(D1), ...successfulDay(D2), ...validDay(D3), ...successfulDay(D4)], D4))
    .toMatchObject({ status: 'en_curso', validDays: [D4], masteredOn: null, reviewDays: [] });
});
it('counts flashcard reviews as clean only for facil and loses mastery on otra', () => {
  const catalog = catalogFixture(1, 'flashcard');
  const attempts = [flash('f1', D1, 'facil'), flash('f1', D2, 'facil'),
    flash('f1', D3, 'facil'), flash('f1', D4, 'bien'), flash('f1', D5, 'dificil')];
  expect(blockState(fixtureBlock(catalog), catalog, attempts, D5).reviewDays).toEqual([
    { day: D3, clean: true }, { day: D4, clean: false }, { day: D5, clean: false },
  ]);
  expect(blockState(fixtureBlock(catalog), catalog, [...attempts, flash('f1', D6, 'otra')], D6))
    .toMatchObject({ status: 'en_curso', validDays: [], reviewDays: [] });
});
it('excludes archived, info and missing items, but keeps a valid day across a non-valid day', () => {
  const catalog = catalogFixture();
  const attempts = [...validDay(D1), bad('i1', D2, 'seguro'), ...successfulDay(D3),
    { ...bad('i1', D3, 'seguro'), tipo: 'info' as const, confidence: null }, bad('absent', D3, 'seguro')];
  expect(blockState(fixtureBlock(catalog), catalog, attempts, D3).validDays).toEqual([D1, D3]);
  catalog.items.set('i5', { id: 'i5', tipo: 'test', blockId: 'B', itemGen: 1, archived: true });
  expect(blockState(fixtureBlock(catalog), catalog, [bad('i5', D1, 'seguro')], D1).status).toBe('pendiente');
});
it('locks only pending blocks whose prerequisites are not mastered', () => {
  const catalog = weightedCatalog();
  const locks = (attempts: Parameters<typeof allBlockStates>[1]) =>
    [...allBlockStates(catalog, attempts, D3).values()].map(state => state.locked);
  expect(locks([])).toEqual([false, true, true]);
  const mastered = [ok('B1-item', D1), ok('B1-item', D2)];
  expect(locks(mastered)).toEqual([false, false, true]);
  expect(locks([...mastered, ok('B2-item', D2), bad('B1-item', D3, 'duda')])).toEqual([false, false, true]);
  expect(locks([...mastered, ok('B2-item', D1), ok('B2-item', D2)])).toEqual([false, false, false]);
});
it.each([
  [['pendiente', 'pendiente', 'pendiente'], 0],
  [['dominado', 'pendiente', 'pendiente'], 11],
  [['dominado', 'pendiente', 'graduado'], 66],
  [['dominado', 'dominado', 'dominado'], 100],
  [['dominado', 'en_curso', 'dominado'], 66],
  [['pendiente', 'dominado', 'pendiente'], 33],
  [['pendiente', 'pendiente', 'dominado'], 55],
] satisfies [BlockStatus[], number][])('floors weighted percentages for %j to %s', (statuses, expected) => {
  const catalog = weightedCatalog();
  const states = allBlockStates(catalog, [], D1);
  [...states.values()].forEach((state, i) => { state.status = statuses[i] ?? 'pendiente'; });
  expect(chapterPercent(fixtureChapter(catalog), catalog, states)).toBe(expected);
});
it('excludes non-evaluable weights and returns zero for empty denominators or absent states', () => {
  const catalog = weightedCatalog();
  catalog.items.set('B3-item', { id: 'B3-item', tipo: 'info', blockId: 'B3', itemGen: 1, archived: false });
  const states = allBlockStates(catalog, [ok('B1-item', D1), ok('B1-item', D2)], D3);
  expect(chapterPercent(fixtureChapter(catalog), catalog, states)).toBe(25);
  expect(chapterPercent(fixtureChapter(catalog), catalog, new Map())).toBe(0);
  const info = catalogFixture(1, 'info');
  expect(chapterPercent(fixtureChapter(info), info, new Map())).toBe(0);
  expect(chapterPercent({ ...fixtureChapter(info), blockIds: [] }, info, new Map())).toBe(0);
});
