import { expect, it } from 'vitest';
import { blockDayProgress } from './dayProgress.ts';
import { allBlockStates } from './mastery.ts';
import { progressCases, excludedProgress } from '../../../tests/fixtures/study/dayProgress.ts';
import { catalogFixture, fixtureBlock } from '../../../tests/fixtures/study/catalog.ts';
import { D2 } from '../../../tests/fixtures/study/attempts.ts';

it.each(progressCases())('$name', ({ catalog, attempts, today, expected }) => {
  expect(blockDayProgress({ block: fixtureBlock(catalog), catalog, attempts, today })).toEqual(expected);
});
const masteryNames = ['N5 empty', 'singular missing', 'dont know voids', 'doubt failure allows validity', 'today counted once'];
it.each(progressCases().filter(c => masteryNames.includes(c.name)))('matches mastery: $name', ({ catalog, attempts, today }) => {
  const state = allBlockStates(catalog, attempts, today).get('B');
  expect(blockDayProgress({ block: fixtureBlock(catalog), catalog, attempts, today }).validToday)
    .toBe(state?.validDays.includes(today));
});
it('excludes archived items and old generations of attempts', () => {
  expect(blockDayProgress(excludedProgress())).toEqual({ total: 4, answered: 3, successes: 3,
    needed: 4, missing: 1, remaining: 1, voided: false, validToday: false, validDays: 0, requiredDays: 2 });
});
it('does not validate an empty or info-only block', () => {
  const catalog = catalogFixture(1, 'info');
  expect(blockDayProgress({ block: fixtureBlock(catalog), catalog, attempts: [], today: D2 }))
    .toMatchObject({ total: 0, needed: 0, validToday: false });
});
it('uses persisted history while reading only today', () => {
  const fixture = progressCases().find(c => c.name === 'two successes');
  if (!fixture) throw new Error('Missing fixture');
  const block = fixtureBlock(fixture.catalog);
  const state = { blockId: 'B', status: 'en_curso' as const, validDays: ['2026-11-01'], masteredOn: null,
    provisional: false, locked: false, reviewDays: [] };
  expect(blockDayProgress({ ...fixture, block, state }).validDays).toBe(1);
});
