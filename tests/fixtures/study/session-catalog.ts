import type { Catalog, CatalogItem } from '../../../src/domain/study/catalog.ts';
import type { DerivedState } from '../../../src/domain/study/rebuild.ts';
import type { Attempt } from '../../../src/domain/study/types.ts';
import type { SessionInput } from '../../../src/domain/study/session.ts';
import { attempt, storedCard } from './items.ts';

export const today = '2026-11-10';
export const now = '2026-11-10T10:00:00Z';
export const tz = 'Europe/Madrid';
export const aIds = ['a1', 'a2', 'a3', 'a4', 'a5'];
export const bIds = ['b1', 'b2', 'b3'];
export const allA = ['a0', ...aIds];

export function sessionCatalog(): Catalog {
  const items: CatalogItem[] = [
    { id: 'a0', tipo: 'info', blockId: 'A', itemGen: 1, archived: false, relaciona: false },
    ...aIds.map(id => ({ id, tipo: 'test' as const, blockId: 'A', itemGen: 1, archived: false, relaciona: false })),
    ...bIds.map(id => ({ id, tipo: 'flashcard' as const, blockId: 'B', itemGen: 1, archived: false, relaciona: false })),
  ];
  return { items: new Map(items.map(item => [item.id, item])), blocks: new Map([
    ['A', { id: 'A', subjectId: 'S', chapterId: 'c1', peso: 1, requiere: [], itemIds: allA }],
    ['B', { id: 'B', subjectId: 'S', chapterId: 'c1', peso: 1, requiere: ['A'], itemIds: bIds }],
  ]), chapters: new Map([['c1', { id: 'c1', subjectId: 'S', numero: 1, blockIds: ['A', 'B'] }]]) };
}
export function sessionAttempt(itemId: string, day = '2026-11-09', overrides: Partial<Attempt> = {}): Attempt {
  return { ...attempt, attemptId: `${itemId}-${day}`, itemId, subjectId: 'S', chapterId: 'c1', blockId: 'A',
    studyDay: day, at: `${day}T10:00:00.000Z`, durationMs: 30000, ...overrides };
}
export function sessionInput(minutes = 5): SessionInput {
  const derived: DerivedState = { items: new Map(), blindSpots: [], skipped: [], blocks: new Map([
    ['A', { blockId: 'A', status: 'pendiente', validDays: [], masteredOn: null, provisional: false, reviewDays: [], locked: false }],
    ['B', { blockId: 'B', status: 'pendiente', validDays: [], masteredOn: null, provisional: false, reviewDays: [], locked: true }],
  ]) };
  return { catalog: sessionCatalog(), derived, attempts: [], subjectId: 'S', now, tz, minutes, seed: 1 };
}
export function setDue(input: SessionInput, id: string, due = '2026-12-01T08:00:00.000Z'): void {
  input.derived.items.set(id, { itemId: id, itemGen: 1, lastAttemptId: 'a', card: { ...storedCard, due } });
}
export function replaceItem(input: SessionInput, id: string, patch: Partial<CatalogItem>): void {
  const item = input.catalog.items.get(id);
  if (!item) throw new Error('Missing fixture item');
  input.catalog.items.set(id, { ...item, ...patch });
}
export function manyInput(count = 50, blocks = 1, historyCount = count): SessionInput {
  const input = sessionInput(10);
  input.catalog = { items: new Map(), blocks: new Map(), chapters: new Map() };
  input.derived.blocks.clear();
  const blockIds = Array.from({ length: blocks }, (_, i) => `X${String(i)}`);
  input.catalog.chapters.set('c1', { id: 'c1', subjectId: 'S', numero: 1, blockIds });
  for (const blockId of blockIds) {
    input.catalog.blocks.set(blockId, { id: blockId, subjectId: 'S', chapterId: 'c1', peso: 1, requiere: [], itemIds: [] });
    input.derived.blocks.set(blockId, { blockId, status: 'en_curso', validDays: [], masteredOn: null,
      provisional: false, reviewDays: [], locked: false });
  }
  for (let i = 1; i <= count; i++) {
    const id = `x${String(i).padStart(2, '0')}`;
    const blockId = blockIds[(i - 1) % blocks] ?? 'X0';
    input.catalog.items.set(id, { id, tipo: 'test', blockId, itemGen: 1, archived: false, relaciona: false });
    input.catalog.blocks.get(blockId)?.itemIds.push(id);
    setDue(input, id, '2026-11-09T08:00:00.000Z');
    input.derived.blindSpots.push({ itemId: id, since: '2026-11-09' });
  }
  input.attempts = Array.from({ length: historyCount }, (_, i) => {
    const id = `x${String(i % count + 1).padStart(2, '0')}`;
    return sessionAttempt(id, '2026-11-09', { correct: false, confidence: 'seguro', attemptId: `history-${String(i)}` });
  });
  return input;
}

export const blindRounds = [
  ['x01', 'x02', 'x03', 'x04', 'x05', 'x06', 'x07', 'x08'],
  ['x21', 'x22', 'x23', 'x24', 'x25', 'x26', 'x27', 'x28'],
  ['x41', 'x42', 'x43', 'x44', 'x45', 'x46', 'x47', 'x48'],
];
