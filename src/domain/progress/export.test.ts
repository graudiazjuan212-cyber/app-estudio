import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { scenario } from '../../../tests/fixtures/progress/scenario.ts';
import { buildProgressExport, formatIsoWithOffset, shortText, progressFileName } from './export.ts';

const expected = () => JSON.parse(readFileSync(new URL('../../../tests/fixtures/progress/expected-ejmat-2026-12-02.json', import.meta.url), 'utf8')) as unknown;
it('matches the handwritten scenario including serialized key order without mutation', () => {
  const input = scenario();
  const before = structuredClone(input);
  const output = buildProgressExport(input);
  expect(output).toEqual(expected());
  expect(JSON.stringify(output, null, 2)).toBe(JSON.stringify(expected(), null, 2));
  expect(buildProgressExport(input)).toEqual(output);
  expect(input).toEqual(before);
});
it.each([
  ['2026-12-02T20:10:00Z', 'Europe/Madrid', '2026-12-02T21:10:00+01:00'],
  ['2026-07-01T20:10:00Z', 'Europe/Madrid', '2026-07-01T22:10:00+02:00'],
  ['2026-12-02T20:10:00Z', 'America/New_York', '2026-12-02T15:10:00-05:00'],
  ['2026-12-02T20:10:00Z', 'UTC', '2026-12-02T20:10:00+00:00'],
  ['2026-03-29T00:30:00Z', 'Europe/Madrid', '2026-03-29T01:30:00+01:00'],
  ['2026-03-29T01:30:00Z', 'Europe/Madrid', '2026-03-29T03:30:00+02:00'],
])('formats %s in %s', (instant, zone, value) => { expect(formatIsoWithOffset(instant, zone)).toBe(value); });
it('rejects invalid dates and zones', () => {
  expect(() => formatIsoWithOffset('bad', 'UTC')).toThrow();
  expect(() => formatIsoWithOffset('2026-12-02T20:10:00Z', 'bad')).toThrow();
});
it.each([
  ['a'.repeat(80), 'a'.repeat(80)], ['a'.repeat(81), `${'a'.repeat(80)}\u2026`],
  ['{{1}} y {{2}}', '___ y ___'], ['  a \n b   c ', 'a b c'],
  ['$x$ **texto**', '$x$ **texto**'],
])('shortens text %s', (enunciado, value) => {
  expect(shortText({ id: 'i', tipo: 'vf', enunciado, correcta: true })).toBe(value);
});
it('uses flashcard front and info title and creates the file name', () => {
  expect(shortText({ id: 'i', tipo: 'flashcard', anverso: 'Frente', reverso: 'Dorso' })).toBe('Frente');
  expect(shortText({ id: 'i', tipo: 'info', titulo: 'Titulo', cuerpo: 'Cuerpo' })).toBe('Titulo');
  expect(progressFileName('ejmat', '2026-12-02')).toBe('progreso_ejmat_2026-12-02.json');
});
it('exports an unstudied subject', () => {
  const output = buildProgressExport({ ...scenario(), attempts: [], itemStates: new Map() });
  expect(output.sesiones).toEqual([]);
  expect(output.puntos_ciegos).toEqual([]);
  expect(output.fallos_recurrentes).toEqual([]);
  for (const chapter of output.capitulos) {
    expect(chapter.porcentaje).toBe(0);
    for (const b of chapter.bloques) expect(b).toMatchObject({ estado: 'pendiente', dias_dominio: [], proximo_repaso: null });
  }
});
it('ignores missing item states and archived items and blocks', () => {
  const input = scenario();
  const item = input.catalog.items.get('mat-i8');
  const block = input.catalog.blocks.get('mat-b3');
  if (!item || !block) throw new Error('Missing fixture');
  input.catalog.items.set(item.id, { ...item, archived: true });
  const archived = { ...block, archived: true };
  input.catalog.blocks.set(block.id, archived);
  input.itemStates.clear();
  const output = buildProgressExport(input);
  expect(output.puntos_ciegos).toEqual([]);
  expect(output.fallos_recurrentes).toEqual([]);
  expect(output.capitulos[0]?.bloques.map(b => b.id)).toEqual(['mat-b1', 'mat-b2']);
  expect(output.capitulos[0]?.bloques.every(b => b.proximo_repaso === null)).toBe(true);
});
it('clears mastery days after a later failure', () => {
  const input = scenario();
  const first = input.attempts.find(a => a.itemId === 'mat-i3');
  if (!first) throw new Error('Missing fixture');
  input.attempts.push({ ...first, attemptId: 'loss', at: '2026-12-01T10:00:00.000Z', studyDay: '2026-12-01', correct: false });
  expect(buildProgressExport(input).capitulos[0]?.bloques[0]).toMatchObject({ estado: 'en_curso', dias_dominio: [] });
});
it('counts both failures on the window boundary and excludes older, future and old generation failures', () => {
  const input = scenario();
  const a = input.attempts.find(a => a.itemId === 'mat-i8');
  if (!a) throw new Error('Missing fixture');
  input.attempts = ['2026-11-03', '2026-11-03', '2026-11-02', '2026-12-03'].map((day, i) => ({
    ...a, attemptId: `w${String(i)}`, at: `${day}T10:00:00.000Z`, studyDay: day,
  }));
  input.attempts.push({ ...a, attemptId: 'old', itemGen: 2 });
  expect(buildProgressExport(input).fallos_recurrentes.map(f => f.fallos)).toEqual([2]);
  input.attempts.shift();
  expect(buildProgressExport(input).fallos_recurrentes).toEqual([]);
});
it('retains the latest 60 sessions in ascending order and excludes unfinished or empty sessions', () => {
  const input = scenario();
  const a = input.attempts[0];
  if (!a) throw new Error('Missing fixture');
  input.sessions = Array.from({ length: 62 }, (_, i) => ({ id: `s${String(i).padStart(2, '0')}`,
    kind: 'exam', startedAt: '2026-12-01T09:00:00.000Z', endedAt: '2026-12-01T11:00:00.000Z' }));
  input.attempts = input.sessions.map((s, i) => ({ ...a, attemptId: s.id, sessionId: s.id,
    durationMs: i === 2 ? 15000 : 180000 }));
  const output = buildProgressExport(input);
  expect(output.sesiones).toHaveLength(60);
  expect(output.sesiones[0]).toMatchObject({ minutos: 0.3, tipo: 'examen' });
  expect(output.sesiones.at(-1)?.minutos).toBe(3);
  input.sessions.forEach(s => { s.endedAt = null; });
  expect(buildProgressExport(input).sesiones).toEqual([]);
});
it('rejects missing catalog text and invalid history', () => {
  const input = scenario();
  const chapter = input.catalog.chapters.get('ejmat-c01');
  if (!chapter) throw new Error('Missing fixture');
  input.catalog.chapters.set(chapter.id, { id: chapter.id, subjectId: chapter.subjectId, numero: chapter.numero, blockIds: chapter.blockIds });
  expect(() => buildProgressExport(input)).toThrow('cat');
  const invalid = scenario();
  invalid.attempts = invalid.attempts.map(a => ({ ...a, durationMs: -1 }));
  expect(() => buildProgressExport(invalid)).toThrow('Registro');
});

it('uses the reference FSRS-6 dues from chronological applyAttempt', () => {
  const input = scenario();
  for (const id of ['mat-i2', 'mat-i3', 'mat-i4', 'mat-i5'])
    expect(input.itemStates.get(id)?.card.due).toBe('2026-12-11T10:00:00.000Z');
  for (const id of ['mat-i6', 'mat-i7', 'mat-i9'])
    expect(input.itemStates.get(id)?.card.due).toBe('2026-12-01T10:00:00.000Z');
  expect(input.itemStates.get('mat-i8')?.card.due).toBe('2026-12-02T10:00:00.000Z');
  expect(input.itemStates.get('mat-i10')?.card.due).toBe('2026-12-03T10:00:00.000Z');
});
it('retains a first valid mastery day before mastery is reached', () => {
  const input = scenario();
  input.attempts = input.attempts.filter(a => a.studyDay === '2026-11-24');
  expect(buildProgressExport(input).capitulos[0]?.bloques[0]).toMatchObject({
    estado: 'en_curso', dias_dominio: ['2026-11-24'],
  });
});
it('uses study day of the first attempt including info and rounds all durations', () => {
  const input = scenario();
  input.attempts = input.attempts.filter(a => a.sessionId === 's1').map(a => a.tipo === 'info'
    ? { ...a, at: '2026-11-24T01:00:00.000Z', studyDay: '2026-11-23' } : a);
  expect(buildProgressExport(input).sesiones).toEqual([
    { fecha: '2026-11-23', minutos: 2.3, preguntas: 4, aciertos: 4, tipo: 'estudio' },
  ]);
});
it('sorts recurring failures by descending count then item id and counts unknown and Again', () => {
  const input = scenario();
  const a = input.attempts.find(a => a.itemId === 'mat-i3');
  const f = input.attempts.find(a => a.itemId === 'mat-i2');
  if (!a || !f) throw new Error('Missing fixture');
  input.attempts = [
    { ...a, attemptId: 'u1', correct: false, dontKnow: true, confidence: null },
    { ...a, attemptId: 'u2', correct: false, dontKnow: true, confidence: null },
    { ...f, attemptId: 'f1', correct: false, rating: 'otra' },
    { ...f, attemptId: 'f2', correct: false, rating: 'otra' },
    { ...f, attemptId: 'f3', correct: false, rating: 'otra' },
  ];
  expect(buildProgressExport(input).fallos_recurrentes.map(f => [f.item, f.fallos])).toEqual([
    ['mat-i2', 3], ['mat-i3', 2],
  ]);
  input.attempts.pop();
  expect(buildProgressExport(input).fallos_recurrentes.map(f => f.item)).toEqual(['mat-i2', 'mat-i3']);
});
