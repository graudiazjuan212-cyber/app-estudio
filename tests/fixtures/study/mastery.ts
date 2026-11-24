import type { Attempt } from '../../../src/domain/study/types.ts';
import type { BlockState } from '../../../src/domain/study/mastery.ts';
import type { Catalog } from '../../../src/domain/study/catalog.ts';
import { catalogFixture } from './catalog.ts';
import { D1, D2, D3, D4, D5, D6, D7, ok, bad, dk, flash } from './attempts.ts';

export function successfulDay(day: string): Attempt[] {
  return ['i1', 'i2', 'i3', 'i4', 'i5'].map(id => ok(id, day));
}
export function validDay(day: string): Attempt[] {
  return [...['i1', 'i2', 'i3', 'i4'].map(id => ok(id, day)), bad('i5', day, 'duda')];
}
interface MasteryCase {
  id: string; catalog: Catalog; attempts: Attempt[]; today: string;
  expected: Omit<BlockState, 'blockId' | 'locked'>;
}
export function masteryCases(): MasteryCase[] {
  const mastered = [...validDay(D1), ...successfulDay(D2)];
  const reviews = (days: string[]) => days.flatMap(successfulDay);
  const clean = (days: string[]) => days.map(day => ({ day, clean: true }));
  const graduated = [...mastered, ...reviews([D3, D4, D5])];
  const dirty = [...mastered, ...reviews([D3, D4, D5, D6]).map(a =>
    a.itemId === 'i2' && a.studyDay === D4 ? { ...a, confidence: 'bastante' as const } : a)];
  const row = (id: string, attempts: Attempt[], today: string, status: BlockState['status'],
    validDays: string[] = [], masteredOn: string | null = null, provisional = false,
    reviewDays: BlockState['reviewDays'] = [], catalog = catalogFixture()): MasteryCase =>
    ({ id, attempts, today, catalog, expected: { status, validDays, masteredOn, provisional, reviewDays } });
  const threshold = (count: number, correct: number) => [...catalogFixture(count).items.keys()]
    .map((id, i) => i < correct ? ok(id, D1) : bad(id, D1, 'duda'));
  const archived = catalogFixture();
  archived.items.set('i5', { id: 'i5', tipo: 'test', blockId: 'B', itemGen: 1, archived: true });
  const generation = catalogFixture();
  generation.items.set('i1', { id: 'i1', tipo: 'test', blockId: 'B', itemGen: 2, archived: false });
  return [
    row('M01', [], D1, 'pendiente'),
    row('M02', validDay(D1), D1, 'en_curso', [D1]),
    row('M03', threshold(5, 3), D1, 'en_curso'),
    row('M04', threshold(10, 8), D1, 'en_curso', [D1], null, false, [], catalogFixture(10)),
    row('M05', threshold(10, 7), D1, 'en_curso', [], null, false, [], catalogFixture(10)),
    row('M06', threshold(100, 79), D1, 'en_curso', [], null, false, [], catalogFixture(100)),
    row('M07', threshold(100, 80), D1, 'en_curso', [D1], null, false, [], catalogFixture(100)),
    row('M08', mastered, D3, 'dominado', [D1, D2], D2),
    row('M09', mastered, D2, 'dominado', [D1, D2], D2, true),
    row('M10', [...validDay(D1), ...successfulDay(D2).slice(0, 4), dk('i5', D2)], D3, 'en_curso', [D1]),
    row('M11', [...validDay(D1), ...['i1', 'i2', 'i3', 'i4'].map(id => ok(id, D2, 'bastante')),
      bad('i5', D2, 'seguro')], D3, 'en_curso', [D1]),
    row('M12', [...validDay(D1), ok('i5', D1, 'seguro', 1)], D2, 'en_curso', [D1]),
    row('M13', [bad('i1', D1, 'duda'), ...successfulDay(D1).slice(1), ok('i1', D1, 'seguro', 1)],
      D1, 'en_curso', [D1]),
    row('M14', [bad('i1', D1, 'duda'), bad('i2', D1, 'duda'), ...successfulDay(D1).slice(2),
      ok('i1', D1, 'seguro', 1), ok('i2', D1, 'seguro', 1)], D1, 'en_curso'),
    row('M15', [...mastered, { ...bad('i3', D2, 'seguro'), at: `${D2}T10:00:01.000Z` }],
      D2, 'en_curso', [D1]),
    row('M16', [...mastered, bad('i3', D3, 'duda')], D3, 'en_curso'),
    row('M17', [...mastered, bad('i3', D3, 'duda'), ...validDay(D4), ...successfulDay(D5)],
      D6, 'dominado', [D4, D5], D5),
    row('M18', graduated, D5, 'graduado', [D1, D2], D2, true, clean([D3, D4, D5])),
    row('M19', [...mastered, ...reviews([D3, D4])], D4, 'dominado', [D1, D2], D2, false, clean([D3, D4])),
    row('M20', dirty, D6, 'dominado', [D1, D2], D2, false,
      [{ day: D3, clean: true }, { day: D4, clean: false }, ...clean([D5, D6])]),
    row('M21', [...dirty, ...successfulDay(D7)], D7, 'graduado', [D1, D2], D2, true,
      [{ day: D3, clean: true }, { day: D4, clean: false }, ...clean([D5, D6, D7])]),
    row('M22', [...graduated, ok('i2', D5, 'duda', 1)], D5, 'dominado', [D1, D2], D2, false,
      [...clean([D3, D4]), { day: D5, clean: false }]),
    row('M23', [...graduated, bad('i3', D6, 'duda')], D6, 'en_curso'),
    row('M24', [...['f1', 'f2', 'f3', 'f4'].map(id => flash(id, D1, 'facil')), flash('f5', D1, 'otra'),
      ...['f1', 'f2', 'f3', 'f4', 'f5'].map(id => flash(id, D2, 'facil'))],
      D3, 'dominado', [D1, D2], D2, false, [], catalogFixture(5, 'flashcard')),
    row('M25', successfulDay(D1).slice(0, 4), D1, 'en_curso', [D1], null, false, [], archived),
    row('M26', successfulDay(D1).slice(0, 4), D1, 'en_curso', [], null, false, [], generation),
    row('M27', [], D1, 'pendiente', [], null, false, [], catalogFixture(1, 'info')),
  ];
}
