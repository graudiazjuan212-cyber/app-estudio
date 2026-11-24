import { catalogFixture, fixtureBlock } from './catalog.ts';
import { D1, D2, ok, bad, dk } from './attempts.ts';
import type { Attempt } from '../../../src/domain/study/types.ts';

const good = (count: number) => Array.from({ length: count }, (_, i) => ok(`i${String(i + 1)}`, D2));
export function progressCases() {
  const row = (name: string, count: number, attempts: Attempt[], answered: number, successes: number,
    needed: number, missing: number, remaining: number, voided = false, validToday = false, validDays = 0) => ({
    name, catalog: catalogFixture(count), attempts, today: D2,
    expected: { total: count, answered, successes, needed, missing, remaining, voided, validToday, validDays, requiredDays: 2 },
  });
  return [
    row('N4 empty', 4, [], 0, 0, 4, 4, 4),
    row('N5 empty', 5, [], 0, 0, 4, 4, 5),
    row('N10 empty', 10, [], 0, 0, 8, 8, 10),
    row('two successes', 4, good(2), 2, 2, 4, 2, 2),
    row('singular missing', 5, good(3), 3, 3, 4, 1, 2),
    row('dont know voids', 5, [...good(4), dk('i5', D2)], 5, 4, 4, 0, 0, true),
    row('sure failure voids', 5, [...good(4), bad('i5', D2, 'seguro')], 5, 4, 4, 0, 0, true),
    row('doubt failure allows validity', 5, [...good(4), bad('i5', D2, 'duda')], 5, 4, 4, 0, 0, false, true, 1),
    row('first failure wins despite unsorted retry', 5, [ok('i1', D2, 'seguro', 1), bad('i1', D2, 'duda')], 1, 0, 4, 4, 4),
    row('first success wins', 5, [...good(1), { ...bad('i1', D2, 'duda'), at: `${D2}T11:00:00.000Z` }], 1, 1, 4, 3, 4),
    row('later sure failure still voids', 5, [...good(4), { ...bad('i1', D2, 'seguro'), at: `${D2}T11:00:00.000Z` }], 4, 4, 4, 0, 1, true),
    row('impossible after two doubt failures', 5, [...good(3), bad('i4', D2, 'duda'), bad('i5', D2, 'duda')], 5, 3, 4, 1, 0),
    row('today counted once', 5, [...good(4), ...['i1','i2','i3','i4'].map(id => ok(id, D1))], 4, 4, 4, 0, 1, false, true, 2),
    row('other day ignored', 5, [ok('i1', D1)], 0, 0, 4, 4, 5),
    row('other block ignored', 5, [{ ...dk('other', D2), blockId: 'other' }], 0, 0, 4, 4, 5),
    row('N10 valid', 10, good(8), 8, 8, 8, 0, 2, false, true, 1),
  ];
}
export function excludedProgress() {
  const catalog = catalogFixture(5);
  const archived = catalog.items.get('i5');
  const changed = catalog.items.get('i4');
  if (!archived || !changed) throw new Error('Missing fixed fixture');
  catalog.items.set('i5', { ...archived, archived: true });
  catalog.items.set('i4', { ...changed, itemGen: 2 });
  return { catalog, block: fixtureBlock(catalog), attempts: [...good(3), dk('i4', D2), dk('i5', D2)], today: D2 };
}
