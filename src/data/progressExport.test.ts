import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { context, scenario } from '../../tests/fixtures/progress/scenario.ts';
import { dump, packText, testDb } from '../../tests/fixtures/data/helpers.ts';
import type { StudyDb } from './db.ts';
import { packSchema } from '../domain/pack/schema.ts';
import { importPackText } from './importPack.ts';
import { recordAttempt } from './attempts.ts';
import { exportProgress } from './progressExport.ts';
import * as progressAttempts from './progressAttempts.ts';

let db: StudyDb;
beforeEach(async () => { db = await testDb(); await importPackText(db, packText(), context); });
afterEach(async () => { vi.restoreAllMocks(); await db.delete(); });
it('exports recorded history exactly and leaves every table unchanged', async () => {
  const input = scenario();
  for (const a of input.attempts.filter(a => a.subjectId === 'ejmat')) await recordAttempt(db, a, context);
  const otherPack = packSchema.parse(JSON.parse(packText()));
  otherPack.asignatura.id = 'otra';
  otherPack.capitulo.id = 'otra-c01';
  for (const block of otherPack.bloques) {
    block.id = `other-${block.id}`;
    block.requiere = block.requiere.map(id => `other-${id}`);
    for (const item of block.items) item.id = `other-${item.id}`;
  }
  await importPackText(db, JSON.stringify(otherPack), context);
  for (const a of input.attempts.filter(a => a.subjectId === 'otra')) await recordAttempt(db, {
    ...a, itemId: `other-${a.itemId}`, blockId: `other-${a.blockId}`, chapterId: 'otra-c01',
  }, context);
  for (const s of input.sessions) await db.sessions.put({ ...s, subjectId: s.id === 'other' ? 'otra' : 'ejmat', chapterId: 'ejmat-c01',
    itemIds: [], minutes: 0, percentBefore: {}, result: null });
  const before = await dump(db);
  const result = await exportProgress(db, 'ejmat', context);
  expect(result.status).toBe('ok');
  if (result.status !== 'ok') throw new Error('Export failed');
  const expected = JSON.parse(readFileSync(new URL('../../tests/fixtures/progress/expected-ejmat-2026-12-02.json', import.meta.url), 'utf8')) as unknown;
  expect(JSON.parse(result.json)).toEqual(expected);
  expect(result.json).toBe(`${JSON.stringify(expected, null, 2)}\n`);
  expect(result.fileName).toBe('progreso_ejmat_2026-12-02.json');
  expect(await dump(db)).toEqual(before);
});
it('returns empty for an unknown subject', async () => {
  expect(await exportProgress(db, 'missing', context)).toEqual({ status: 'empty', message: 'No encuentro esta asignatura.' });
});
it('exports subjects without attempts', async () => {
  const result = await exportProgress(db, 'ejmat', context);
  expect(result.status).toBe('ok');
  if (result.status !== 'ok') throw new Error('Export failed');
  expect(JSON.parse(result.json)).toMatchObject({ sesiones: [], puntos_ciegos: [], fallos_recurrentes: [] });
});
it('catches read failures without throwing', async () => {
  vi.spyOn(db.subjects, 'get').mockRejectedValueOnce(new Error('Lectura fallida'));
  await expect(exportProgress(db, 'ejmat', context)).resolves.toEqual({ status: 'error',
    message: 'No se pudo exportar el progreso: Lectura fallida' });
});

it('returns an error for conflicting copies supplied by the attempt reader without changing data', async () => {
  const input = scenario();
  const attempt = input.attempts.find(a => a.itemId === 'mat-i8');
  if (!attempt) throw new Error('Missing fixture');
  const before = await dump(db);
  vi.spyOn(progressAttempts, 'readProgressAttempts').mockResolvedValueOnce([
    ...input.attempts, { ...attempt, confidence: 'bastante' },
  ]);
  await expect(exportProgress(db, 'ejmat', context)).resolves.toEqual({ status: 'error',
    message: `No se pudo exportar el progreso: El registro tiene un intento repetido con contenido distinto: ${attempt.attemptId}` });
  expect(await dump(db)).toEqual(before);
});

it('excludes archived database blocks using explicit metadata', async () => {
  await db.blocks.update('mat-b3', { archived: true });
  const result = await exportProgress(db, 'ejmat', context);
  expect(result.status).toBe('ok');
  if (result.status !== 'ok') throw new Error('Export failed');
  expect(JSON.parse(result.json)).toMatchObject({ capitulos: [{ bloques: [
    { id: 'mat-b1' }, { id: 'mat-b2' },
  ] }] });
});
