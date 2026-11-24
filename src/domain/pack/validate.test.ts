import { describe, expect, it } from 'vitest';
import { validatePack, validatePackText } from './validate.ts';
import { formatErrors } from './errors.ts';
import { changed, fixture, fixtureText } from './test-helpers.ts';

const expected = [
  ['01-json', '', 'El archivo no es un JSON válido'],
  ['02-schema', 'schema', 'Valor no permitido'],
  ['03-capitulo', 'capitulo', 'Falta el campo `capitulo`'],
  ['04-peso', 'bloques[0].peso', '`peso` debe ser 1, 3 o 5'],
  ['05-id-duplicado', 'bloques[0].items[1].id', 'Id de ítem duplicado o reservado'],
  ['06-requiere', 'bloques[0].requiere[0]', 'no existe en este paquete'],
  ['07-ciclo', 'bloques[1].requiere', 'mat-b1 → mat-b3 → mat-b2 → mat-b1'],
  ['08-dos-correctas', 'bloques[0].items[2].opciones', 'exactamente 1 opción correcta y tiene 2'],
  ['09-cero-correctas', 'bloques[0].items[2].opciones', 'exactamente 1 opción correcta y tiene 0'],
  ['10-marcador', 'bloques[1].items[2].huecos', 'Los marcadores deben empezar en 1'],
  ['11-latex', 'bloques[0].items[0].cuerpo', 'LaTeX inválido en «\\comandoInexistente»'],
  ['12-errata', 'bloques[0].items[2].enunciadoo', '¿querías decir `enunciado`?'],
  ['13-pasos', 'bloques[1].items[0].pasos', 'como mínimo 3'],
  ['14-error', 'bloques[1].items[3].pasos', 'exactamente 1 paso incorrecto'],
  ['15-dolar', 'bloques[0].items[0].cuerpo', '`$` sin cerrar'],
  ['16-fecha', 'generado', 'fecha real válida'],
  ['17-derecha', 'bloques[1].items[1].pares.derecha', 'Los textos de derecha deben ser distintos'],
  ['18-info-relaciona', 'bloques[0].items[0].relaciona', '`relaciona` no se puede usar en una tarjeta `info` (solo en preguntas evaluables).'],
] as const;
describe('pack validation', () => {
  it.each([
    ['mat-ejemplo-c01', 3, 14], ['mat-ejemplo-c01-v2', 3, 14],
    ['ioe-ejemplo-c01', 2, 10], ['codigo-ejemplo-c01', 1, 4],
  ] as const)('accepts %s', (name, blocks, items) => {
    const result = validatePackText(fixtureText(name));
    expect(result.ok, JSON.stringify(result)).toBe(true);
    if (!result.ok) return;
    expect(result.pack.bloques).toHaveLength(blocks);
    expect(result.pack.bloques.flatMap(b => b.items)).toHaveLength(items);
    expect(result.warnings).toEqual([]);
  });
  it.each(expected)('explains invalid %s', (name, path, message) => {
    const result = validatePackText(fixtureText(`invalid/${name}`));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some(error => error.path === path && error.message.includes(message))).toBe(true);
  });
  it('adds human context and retains technical paths', () => {
    const result = validatePackText(fixtureText('invalid/08-dos-correctas'));
    if (result.ok) throw new Error('Expected failure');
    expect(formatErrors(result.errors)).toContain('bloques[0].items[2].opciones: Bloque 1 «Componentes y norma», pregunta 3 (id mat-i3)');
  });
  it('formats an empty list', () => { expect(formatErrors([])).toBe(''); });
  it('warns for an info-only block', () => {
    const p = fixture();
    p.bloques = p.bloques.slice(0, 1);
    const b = p.bloques[0];
    if (!b) throw new Error('Missing block');
    b.items = b.items.slice(0, 1);
    const result = validatePack(p);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.warnings).toEqual([{ path: 'bloques[0]', message: 'Bloque 1 «Componentes y norma»: bloque sin preguntas evaluables' }]);
  });
  it('defaults requiere without modifying the input', () => {
    const input = changed(['bloques', 0, 'requiere'], undefined);
    const before = JSON.stringify(input);
    const result = validatePack(input);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.pack.bloques[0]?.requiere).toEqual([]);
    expect(JSON.stringify(input)).toBe(before);
  });
  it('collects structural, reference and math errors together', () => {
    const p = fixture();
    p.version = 0;
    const b = p.bloques[0];
    if (!b) throw new Error('Missing block');
    b.requiere = ['missing'];
    const item = b.items[0];
    if (item?.tipo === 'info') item.cuerpo = '$';
    const result = validatePack(p);
    if (result.ok) throw new Error('Expected failure');
    expect(result.errors.map(e => e.path)).toEqual(['version', 'bloques[0].requiere[0]', 'bloques[0].items[0].cuerpo']);
  });
  it('caps at 50 in appearance order', () => {
    const p = fixture();
    const b = p.bloques[0];
    if (!b) throw new Error('Missing block');
    b.items = Array.from({ length: 60 }, (_, i) => ({ id: `bad-${String(i)}`, tipo: 'vf', enunciado: '$', correcta: true }));
    const result = validatePack(p);
    if (result.ok) throw new Error('Expected failure');
    expect(result.errors).toHaveLength(50);
    expect(result.errors[49]?.path).toBe('bloques[0].items[49].enunciado');
  });
  it('strips a leading BOM', () => { expect(validatePackText('\uFEFF' + fixtureText('mat-ejemplo-c01')).ok).toBe(true); });
  it.each(['', '{"a":1,}'])('rejects malformed JSON %s', text => {
    const result = validatePackText(text);
    if (result.ok) throw new Error('Expected failure');
    expect(result.errors[0]?.message).toContain('El archivo no es un JSON válido:');
  });
  it.each(['[]', 'null', '"x"'])('rejects nonobject JSON %s', text => { expect(validatePackText(text).ok).toBe(false); });
  it('does not suggest an unrelated field', () => {
    const result = validatePack(changed(['bloques', 0, 'items', 2, 'zzz'], 'oops'));
    if (result.ok) throw new Error('Expected failure');
    expect(result.errors[0]?.message).toContain('Campo desconocido `zzz`.');
    expect(result.errors[0]?.message).not.toContain('querías');
  });
});
