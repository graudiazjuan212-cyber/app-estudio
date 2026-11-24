import type { Catalog } from '../../../src/domain/study/catalog.ts';
import type { Attempt } from '../../../src/domain/study/types.ts';
import type { BlindSpot } from '../../../src/domain/study/blindspots.ts';
import { catalogFixture } from './catalog.ts';
import { D1, D2, D3, D4, bad, ok, dk, flash } from './attempts.ts';

interface BlindCase { id: string; catalog: Catalog; attempts: Attempt[]; expected: BlindSpot[] }
export function blindCases(): BlindCase[] {
  const first = bad('i1', D1, 'seguro');
  const pending = [{ itemId: 'i1', since: D1 }];
  const row = (id: string, attempts: Attempt[], expected: BlindSpot[], catalog = catalogFixture()): BlindCase =>
    ({ id, attempts, expected, catalog });
  const archived = catalogFixture();
  archived.items.set('i1', { id: 'i1', tipo: 'test', blockId: 'B', itemGen: 1, archived: true });
  const generation = catalogFixture();
  generation.items.set('i1', { id: 'i1', tipo: 'test', blockId: 'B', itemGen: 2, archived: false });
  return [
    row('B01', [first], pending),
    row('B02', [first, ok('i1', D1, 'seguro', 1)], pending),
    row('B03', [first, ok('i1', D2, 'bastante')], []),
    row('B04', [first, ok('i1', D2, 'seguro')], []),
    row('B05', [first, ok('i1', D2, 'duda')], pending),
    row('B06', [bad('i1', D1, 'bastante')], []),
    row('B07', [bad('i1', D1, 'duda')], []),
    row('B08', [dk('i1', D1)], []),
    row('B09', [first, ok('i1', D2, 'bastante'), bad('i1', D4, 'seguro')], [{ itemId: 'i1', since: D4 }]),
    row('B10', [first, bad('i1', D2, 'seguro')], pending),
    row('B11', [bad('i2', D1, 'seguro'), { ...first, at: `${D1}T10:00:01.000Z` }],
      [{ itemId: 'i1', since: D1 }, { itemId: 'i2', since: D1 }]),
    row('B12', [bad('i1', D3, 'seguro'), bad('i2', D1, 'seguro')],
      [{ itemId: 'i2', since: D1 }, { itemId: 'i1', since: D3 }]),
    row('B13', [flash('f1', D1, 'otra')], [], catalogFixture(1, 'flashcard')),
    row('B14', [first], [], archived),
    row('B15', [first], [], generation),
  ];
}
