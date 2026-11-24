import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { scenario, context } from '../../../tests/fixtures/progress/scenario.ts';
import { fixture } from '../pack/test-helpers.ts';
import { buildCatalog } from '../study/index.ts';
import { buildProgressExport, progressMetaFromPacks } from './export.ts';

it('deduplicates identical attempts without changing a byte of the fixed export', () => {
  const input = scenario();
  const attempt = input.attempts.find(a => a.itemId === 'mat-i8');
  if (!attempt) throw new Error('Missing fixture');
  input.attempts.push(structuredClone(attempt));
  const expected = readFileSync(new URL('../../../tests/fixtures/progress/expected-ejmat-2026-12-02.json', import.meta.url), 'utf8');
  // The hand-written file is laid out for humans: compare the data, then the exact text against the same scenario without the copy.
  expect(buildProgressExport(input)).toEqual(JSON.parse(expected));
  expect(JSON.stringify(buildProgressExport(input), null, 2)).toBe(JSON.stringify(buildProgressExport(scenario()), null, 2));
});

it('rejects conflicting copies instead of exporting inconsistent counts', () => {
  const input = scenario();
  const attempt = input.attempts.find(a => a.itemId === 'mat-i8');
  if (!attempt) throw new Error('Missing fixture');
  input.attempts.push({ ...attempt, confidence: 'bastante' });
  expect(() => buildProgressExport(input)).toThrow(
    `El registro tiene un intento repetido con contenido distinto: ${attempt.attemptId}`);
});

it('exports a plain public catalog and metadata without database rows', () => {
  const packs = [fixture()];
  const output = buildProgressExport({ subjectId: 'ejmat', catalog: buildCatalog(packs, new Map()),
    meta: progressMetaFromPacks(packs), attempts: [], sessions: [], itemStates: new Map(), ...context });
  expect(output.capitulos).toHaveLength(1);
  expect(output.capitulos[0]).toMatchObject({ id: 'ejmat-c01', titulo: 'Vectores en el plano', porcentaje: 0 });
  expect(output.capitulos[0]?.bloques.map(b => [b.titulo, b.estado])).toEqual([
    ['Componentes y norma', 'pendiente'], ['Operaciones', 'pendiente'], ['Relaciones geométricas', 'pendiente'],
  ]);
});

it.each(['chapter', 'block'] as const)('rejects absent and blank %s titles', kind => {
  const input = scenario();
  const titles = kind === 'chapter' ? input.meta.chapterTitles : input.meta.blockTitles;
  const id = kind === 'chapter' ? 'ejmat-c01' : 'mat-b1';
  titles.delete(id);
  expect(() => buildProgressExport(input)).toThrow(`Falta el título ${id}`);
  titles.set(id, '   ');
  expect(() => buildProgressExport(input)).toThrow(`Falta el título ${id}`);
});

it('uses the latest chapter version independently of pack order without mutating inputs', () => {
  const latest = fixture();
  const old = structuredClone(latest);
  old.version = 0;
  old.capitulo.titulo = 'Anterior';
  old.bloques = [];
  const archived = new Set(['mat-b3']);
  const before = structuredClone([latest, old]);
  const meta = progressMetaFromPacks([latest, old], archived);
  expect(meta).toEqual(progressMetaFromPacks([old, latest], archived));
  expect(meta.chapterTitles.get('ejmat-c01')).toBe('Vectores en el plano');
  expect([...meta.blockTitles.values()]).toEqual(['Componentes y norma', 'Operaciones', 'Relaciones geométricas']);
  expect(meta.items.get('mat-i1')).toMatchObject({ id: 'mat-i1', tipo: 'info' });
  expect([latest, old]).toEqual(before);
  meta.archivedBlockIds.clear();
  expect(archived).toEqual(new Set(['mat-b3']));
});

it('rejects missing item content and excludes explicitly archived blocks and items', () => {
  const input = scenario();
  input.meta.items.delete('mat-i8');
  expect(() => buildProgressExport(input)).toThrow('Falta el contenido del ítem mat-i8');
  const item = input.catalog.items.get('mat-i8');
  if (!item) throw new Error('Missing fixture');
  input.catalog.items.set(item.id, { ...item, archived: true });
  input.meta.archivedBlockIds.add('mat-b3');
  const output = buildProgressExport(input);
  expect(output.puntos_ciegos).toEqual([]);
  expect(output.fallos_recurrentes).toEqual([]);
  expect(output.capitulos[0]?.bloques.map(b => b.id)).toEqual(['mat-b1', 'mat-b2']);
});
