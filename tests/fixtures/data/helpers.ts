/// <reference types="node" />
import 'fake-indexeddb/auto';
import { readFileSync, readdirSync } from 'node:fs';
import type { Attempt } from '../../../src/domain/study/index.ts';
import { openStudyDb } from '../../../src/data/open.ts';
import type { StudyDb } from '../../../src/data/db.ts';
import type { Pack } from '../../../src/domain/pack/index.ts';

export const context = { now: '2026-11-24T10:00:00.000Z', tz: 'Europe/Madrid' };
export const session = { id: 'session', subjectId: 'ejmat', kind: 'study' as const,
  chapterId: 'ejmat-c01', startedAt: context.now, itemIds: ['mat-i3'], minutes: 10, percentBefore: { 'ejmat-c01': 0 } };
export const testConfig = { blockedTimeoutMs: 25, performanceMaxMs: 4000, performanceBlocks: 10, performanceItems: 200 };
export function packText(name = 'mat-ejemplo-c01'): string {
  return readFileSync(new URL(`../packs/${name}.json`, import.meta.url), 'utf8');
}
export function packFixture(): Pack { return JSON.parse(packText()) as Pack; }
export function invalidNames(): string[] {
  return readdirSync(new URL('../packs/invalid/', import.meta.url)).filter(n => n.endsWith('.json'));
}
export function goldenDue(): string {
  const golden = JSON.parse(readFileSync(new URL('../study/fsrs-golden.json', import.meta.url), 'utf8')) as { due: string }[];
  const first = golden[0];
  if (!first) throw new Error('Falta el dorado.');
  return first.due;
}
export async function testDb(): Promise<StudyDb> {
  const opened = await openStudyDb(`test-${crypto.randomUUID()}`);
  if (!opened.ok) throw new Error(opened.message);
  return opened.db;
}
export async function dump(db: StudyDb): Promise<Record<string, unknown[]>> {
  return db.transaction('r', db.tables, async () => {
    const rows: Record<string, unknown[]> = {};
    for (const table of db.tables) rows[table.name] = await table.toArray() as unknown[];
    return rows;
  });
}
export function attempt(patch: Partial<Attempt> = {}): Attempt {
  return { attemptId: 'a', itemId: 'mat-i3', itemGen: 1, subjectId: 'ejmat', chapterId: 'ejmat-c01',
    blockId: 'mat-b1', tipo: 'test', at: context.now, studyDay: '2026-11-24', tz: context.tz,
    correct: true, dontKnow: false, confidence: 'bastante', rating: null, durationMs: 1000,
    sessionId: 'session', packVersion: 1, schedulerVersion: 1, ...patch };
}
export function sequence(): Attempt[] {
  return ['24', '25', '26', '27'].flatMap(day => [
    { itemId: 'mat-i3', tipo: 'test' as const }, { itemId: 'mat-i4', tipo: 'multi' as const },
    { itemId: 'mat-i5', tipo: 'vf' as const },
  ].map(item => attempt({ ...item, attemptId: `${day}-${item.itemId}`,
    at: `2026-11-${day}T10:00:00.000Z`, studyDay: `2026-11-${day}` })));
}
export function syntheticPack(): string {
  const pack = packFixture();
  pack.bloques = Array.from({ length: testConfig.performanceBlocks }, (_, b) => ({
    id: `synthetic-b${String(b)}`, titulo: 'Bloque', peso: 1, requiere: [],
    items: Array.from({ length: testConfig.performanceItems }, (_, i) => ({
      id: `synthetic-${String(b)}-${String(i)}`, tipo: 'vf', enunciado: 'Pregunta', correcta: true,
    })),
  }));
  return JSON.stringify(pack);
}
