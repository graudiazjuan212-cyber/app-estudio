import type { Item } from '../pack/index.ts';
import type { FlashRating } from './types.ts';

export type Answer =
  | { tipo: 'test'; selected: number }
  | { tipo: 'multi'; selected: number[] }
  | { tipo: 'vf'; value: boolean }
  | { tipo: 'ordenar'; order: number[] }
  | { tipo: 'emparejar'; pairs: [number, number][] }
  | { tipo: 'huecos'; chosen: number[] }
  | { tipo: 'error'; step: number };
export type GradeResult = { ok: true; correct: boolean } | { ok: false; reason: string };

const invalid = (): GradeResult => ({ ok: false, reason: 'Malformed answer' });
const result = (correct: boolean): GradeResult => ({ ok: true, correct });
const isObject = (value: unknown): boolean => value !== null && typeof value === 'object';
const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';
const index = (value: unknown, length: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < length;
function indices(value: unknown, length: number): value is number[] {
  return Array.isArray(value) && Array.from(value as unknown[]).every(v => index(v, length)) &&
    new Set(value as unknown[]).size === value.length;
}
export function ratingToCorrect(r: FlashRating): boolean { return r !== 'otra'; }
export function grade(item: Item, answer: Answer): GradeResult {
  if (!isObject(answer) || item.tipo !== answer.tipo) return invalid();
  switch (answer.tipo) {
    case 'test':
      if (item.tipo !== 'test' || !index(answer.selected, item.opciones.length)) return invalid();
      return result(item.opciones[answer.selected]?.correcta === true);
    case 'multi': {
      if (item.tipo !== 'multi' || !indices(answer.selected, item.opciones.length)) return invalid();
      const expected = item.opciones.flatMap((o, i) => o.correcta ? [i] : []);
      return result(expected.length === answer.selected.length && expected.every(i => answer.selected.includes(i)));
    }
    case 'vf':
      if (item.tipo !== 'vf' || !isBoolean(answer.value)) return invalid();
      return result(answer.value === item.correcta);
    case 'ordenar':
      if (item.tipo !== 'ordenar' || !indices(answer.order, item.pasos.length) ||
        answer.order.length !== item.pasos.length) return invalid();
      return result(answer.order.every((v, i) => v === i));
    case 'emparejar': {
      if (item.tipo !== 'emparejar' || !Array.isArray(answer.pairs) || answer.pairs.length !== item.pares.length) return invalid();
      const pairs: unknown[] = Array.from(answer.pairs);
      if (!pairs.every((p): p is [number, number] => Array.isArray(p) && p.length === 2 &&
        index(p[0], item.pares.length) && index(p[1], item.pares.length))) return invalid();
      if (new Set(pairs.map(p => p[0])).size !== pairs.length ||
        new Set(pairs.map(p => p[1])).size !== pairs.length) return invalid();
      return result(pairs.every(([left, right]) => left === right));
    }
    case 'huecos': {
      if (item.tipo !== 'huecos' || !Array.isArray(answer.chosen) || answer.chosen.length !== item.huecos.length) return invalid();
      const chosen: unknown[] = Array.from(answer.chosen);
      if (!chosen.every((v, i) => index(v, item.huecos[i]?.opciones.length ?? 0))) return invalid();
      return result(answer.chosen.every((v, i) => item.huecos[i]?.opciones[v]?.correcta === true));
    }
    case 'error':
      if (item.tipo !== 'error' || !index(answer.step, item.pasos.length)) return invalid();
      return result(item.pasos.filter(p => p.incorrecto).length === 1 && item.pasos[answer.step]?.incorrecto === true);
    default: return invalid();
  }
}
