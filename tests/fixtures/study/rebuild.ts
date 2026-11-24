import type { Attempt } from '../../../src/domain/study/types.ts';
import { catalogFixture } from './catalog.ts';
import { D1, D2, D3, D4, ok, bad, dk } from './attempts.ts';

export function rebuildHistory(): Attempt[] {
  return [ok('i1', D1), bad('i2', D1, 'seguro'), dk('i3', D1),
    ok('i1', D2, 'bastante'), ok('i2', D2, 'bastante'), ok('i3', D2, 'duda'),
    bad('i1', D3, 'duda'), ok('i2', D3), ok('i3', D3),
    ok('i1', D4), bad('i2', D4, 'seguro'), ok('i3', D4, 'bastante')];
}
export function shuffledHistory(): Attempt[] {
  const history = rebuildHistory();
  return [11, 0, 8, 3, 10, 1, 6, 2, 9, 4, 7, 5].flatMap(i => history[i] ?? []);
}
export function performanceFixture() {
  const catalog = catalogFixture(2000);
  const attempts = [...catalog.items.keys()].flatMap(id => [
    D1, D2, D3, D4, '2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11',
  ].map(day => ok(id, day)));
  return { catalog, attempts };
}
