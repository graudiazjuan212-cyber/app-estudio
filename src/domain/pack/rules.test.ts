import { expect, it } from 'vitest';
import { changed } from './test-helpers.ts';
import { validatePack } from './validate.ts';

const itemPath = (block: number, item: number, field: string) => ['bloques', block, 'items', item, field];
it.each([1, 3, 5, 2, 0])('checks weight %i', weight => {
  expect(validatePack(changed(['bloques', 0, 'peso'], weight)).ok).toBe([1, 3, 5].includes(weight));
});
it.each([
  ['3 options', 3, true], ['5 options', 5, true], ['2 options', 2, false], ['6 options', 6, false],
] as const)('checks test %s', (_, count, ok) => {
  const options = ['A', 'B', 'C', 'D', 'E', 'F'].slice(0, count).map((texto, i) => ({ texto, correcta: i === 0 }));
  expect(validatePack(changed(itemPath(0, 2, 'opciones'), options)).ok).toBe(ok);
});
it.each([2, 3, 8, 9])('checks %i ordering steps', count => {
  const steps = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].slice(0, count);
  expect(validatePack(changed(itemPath(1, 0, 'pasos'), steps)).ok).toBe(count >= 3 && count <= 8);
});
it.each([
  ['duplicate block', ['bloques', 1, 'id'], 'mat-b1'],
  ['item collides with block', itemPath(0, 1, 'id'), 'mat-b1'],
  ['item collides with chapter', itemPath(0, 1, 'id'), 'ejmat-c01'],
  ['item collides with subject', itemPath(0, 1, 'id'), 'ejmat'],
  ['self reference', ['bloques', 0, 'requiere'], ['mat-b1']],
  ['unknown root field', ['unknown'], true],
  ['unknown nested field', ['asignatura', 'unknown'], true],
  ['invalid id', itemPath(0, 1, 'id'), 'UPPER CASE'],
  ['blank text', itemPath(0, 1, 'anverso'), '  \n '],
  ['missing prompt', itemPath(0, 2, 'enunciado'), undefined],
  ['wrong boolean', itemPath(0, 4, 'correcta'), 'true'],
  ['info explanation', itemPath(0, 0, 'explicacion'), 'No aplica'],
  ['test duplicate choices', itemPath(0, 2, 'opciones'), [{ texto: ' A b ', correcta: true }, { texto: 'a   B', correcta: false }, { texto: 'C', correcta: false }]],
  ['multi all correct', itemPath(0, 3, 'opciones'), [{ texto: 'A', correcta: true }, { texto: 'B', correcta: true }, { texto: 'C', correcta: true }]],
  ['multi none correct', itemPath(0, 3, 'opciones'), [{ texto: 'A', correcta: false }, { texto: 'B', correcta: false }, { texto: 'C', correcta: false }]],
  ['ordering duplicate', itemPath(1, 0, 'pasos'), ['A', ' a ', 'B']],
  ['pair left duplicate', itemPath(1, 1, 'pares'), [{ izquierda: 'A', derecha: '1' }, { izquierda: 'a', derecha: '2' }, { izquierda: 'B', derecha: '3' }]],
  ['gap repetition', itemPath(1, 2, 'enunciado'), '{{1}} {{1}}'],
  ['gap skip', itemPath(1, 2, 'enunciado'), '{{1}} {{3}}'],
  ['gap zero', itemPath(1, 2, 'enunciado'), '{{0}} {{1}}'],
  ['gap malformed', itemPath(1, 2, 'enunciado'), '{{x}} {{2}}'],
  ['no incorrect step', itemPath(1, 3, 'pasos'), [{ texto: 'A', incorrecto: false }, { texto: 'B', incorrecto: false }, { texto: 'C', incorrecto: false }]],
] as const)('rejects %s', (_, path, value) => {
  expect(validatePack(changed([...path], value)).ok).toBe(false);
});
it.each([
  ['empty blocks', ['bloques'], []], ['empty items', ['bloques', 0, 'items'], []],
  ['invalid date format', ['generado'], '24/11/2026'],
  ['non-leap date', ['generado'], '2025-02-29'],
  ['missing input', [], undefined],
] as const)('rejects %s', (_, path, value) => {
  expect(validatePack(path.length ? changed([...path], value) : value).ok).toBe(false);
});
it('accepts a real leap day', () => { expect(validatePack(changed(['generado'], '2024-02-29')).ok).toBe(true); });
it.each([
  [itemPath(0, 1, 'anverso'), 4000], [itemPath(0, 0, 'cuerpo'), 8000],
  [itemPath(0, 1, 'fuente'), 200], [itemPath(0, 1, 'explicacion'), 4000],
  [['asignatura', 'nombre'], 80], [['capitulo', 'titulo'], 120],
  [['bloques', 0, 'titulo'], 120], [itemPath(0, 0, 'titulo'), 120],
] as const)('checks text length at %j', (path, max) => {
  expect(validatePack(changed([...path], 'a'.repeat(max))).ok).toBe(true);
  expect(validatePack(changed([...path], 'a'.repeat(max + 1))).ok).toBe(false);
});
it('checks tag counts and lengths', () => {
  expect(validatePack(changed(itemPath(0, 1, 'etiquetas'), Array<string>(10).fill('a'.repeat(40)))).ok).toBe(true);
  expect(validatePack(changed(itemPath(0, 1, 'etiquetas'), Array<string>(11).fill('tag'))).ok).toBe(false);
  expect(validatePack(changed(itemPath(0, 1, 'etiquetas'), ['a'.repeat(41)])).ok).toBe(false);
  expect(validatePack(changed(itemPath(0, 1, 'etiquetas'), [' '])).ok).toBe(false);
});
