import type { Item } from '../../src/domain/pack/index.ts';
export const question: Item = { id: 'q', tipo: 'test', enunciado: 'Uno', opciones: [
  { texto: 'A', correcta: true, feedback: 'Bien' },
  { texto: 'B', correcta: false }, { texto: 'C', correcta: false },
] };
export const reordered: Item = { opciones: [
  { feedback: 'Bien', correcta: true, texto: 'A' },
  { correcta: false, texto: 'B' }, { correcta: false, texto: 'C' },
], enunciado: 'Uno', tipo: 'test', id: 'q' };
export const steps: Item = { id: 's', tipo: 'ordenar', enunciado: 'Ordena', pasos: ['A', 'B', 'C'] };
export const reloadCases = [
  [false, false, true], [false, true, false], [true, false, true], [true, true, true],
] as const;
export const pendingCases = [
  [false, false, false], [false, true, false], [true, false, true], [true, true, false],
] as const;
