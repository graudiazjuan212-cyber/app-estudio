import type { Catalog } from '../../../src/domain/study/catalog.ts';
import { attempt } from './items.ts';

export const estimates = [
  { count: 0, duration: 1000, ramp: false, expected: 30 },
  { count: 29, duration: 1000, ramp: false, expected: 30 },
  { count: 30, duration: 1000, ramp: true, expected: 15.5 },
  { count: 31, duration: 1000, ramp: true, expected: 16 },
  { count: 30, duration: 1000, ramp: false, expected: 5 },
  { count: 30, duration: 600000, ramp: false, expected: 180 },
];
export function calibrationAttempts(count: number, duration: number, ramp: boolean) {
  return Array.from({ length: count }, (_, i) => ({ ...attempt,
    itemId: `item-${String(i)}`, durationMs: duration * (ramp ? i + 1 : 1) }));
}
export const defaults = [
  ['info', 20], ['flashcard', 15], ['vf', 15], ['test', 30], ['multi', 40],
  ['huecos', 45], ['ordenar', 60], ['emparejar', 60], ['error', 60],
] as const;
export function examCatalog(chapters = 3, count = 6): Catalog {
  const catalog: Catalog = { items: new Map(), blocks: new Map(), chapters: new Map() };
  for (let n = 1; n <= chapters; n++) {
    const chapterId = `c${String(n)}`;
    const blockId = `B${String(n)}`;
    const prefix = ['p', 'q', 'r'][n - 1] ?? 'z';
    const ids = Array.from({ length: count }, (_, i) => `${prefix}${String(i + 1)}`);
    catalog.chapters.set(chapterId, { id: chapterId, subjectId: 'S', numero: n, blockIds: [blockId] });
    catalog.blocks.set(blockId, { id: blockId, subjectId: 'S', chapterId, peso: 1, requiere: [], itemIds: ids });
    for (const id of ids) catalog.items.set(id, { id, tipo: 'test', blockId, itemGen: 1,
      archived: false, relaciona: id === 'p2' || id === 'r3' });
  }
  return catalog;
}
export const examScores = [[4, 5, true], [3, 5, false], [8, 10, true], [7, 10, false],
  [0, 0, false], [5, 5, true]] as const;
export const streakCases: [string[], string, number][] = [
  [['2026-11-02', '2026-11-03', '2026-11-04'], '2026-11-04', 3],
  [['2026-11-02', '2026-11-03', '2026-11-04'], '2026-11-05', 3],
  [['2026-11-02', '2026-11-03', '2026-11-04'], '2026-11-06', 0],
  [['2026-11-02', '2026-11-03', '2026-11-05'], '2026-11-05', 1],
  [[], '2026-11-04', 0],
  [['2026-11-04', '2026-11-02', '2026-11-03', '2026-11-03'], '2026-11-04', 3],
  [['2026-11-29', '2026-11-30', '2026-12-01'], '2026-12-01', 3],
  [['2026-12-31', '2027-01-01'], '2027-01-01', 2],
  [['2028-02-28', '2028-02-29', '2028-03-01'], '2028-03-01', 3],
  [['2026-03-28', '2026-03-29', '2026-03-30'], '2026-03-30', 3],
  [['2026-10-24', '2026-10-25', '2026-10-26'], '2026-10-26', 3],
  [['2026-11-05'], '2026-11-04', 0],
];
export const todayDurations = [
  { ...attempt, studyDay: '2026-11-10', durationMs: 90000 },
  { ...attempt, studyDay: '2026-11-10', durationMs: 30000 },
  { ...attempt, studyDay: '2026-11-09', durationMs: 500000 },
];
export const fractionalDuration = { ...attempt, studyDay: '2026-11-10', durationMs: 1234 };
export const randomFixture = {
  seed: 1,
  sequence: [0.6270739405881613, 0.002735721180215478, 0.5274470399599522],
  input: ['a', 'b', 'c', 'd', 'e'],
  shuffled: ['e', 'c', 'b', 'a', 'd'],
};
