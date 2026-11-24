import { expect, it } from 'vitest';
import { validatePack } from './validate.ts';
import { normalizeJson } from './normalize.ts';
import { changed, fixture } from './test-helpers.ts';
import { reviewFixtures } from './review-fixtures.ts';

function invalidInput(name: string): unknown {
  const cycle: Record<string, unknown> = {};
  cycle.self = cycle;
  const values: Record<string, unknown> = {
    cycle, bigint: BigInt(1), function: () => null, symbol: Symbol('invalid'),
    undefined, number: 42, getter: Object.defineProperty({}, 'bad', {
      enumerable: true, get() { throw new Error('Getter failed'); },
    }), nan: NaN, infinity: Infinity,
    proxy: new Proxy({}, { ownKeys() { throw new Error('Proxy failed'); } }),
  };
  if (name.startsWith('nested-')) return Object.assign(fixture(), { extra: values[name.slice('nested-'.length)] });
  return values[name];
}
it.each(reviewFixtures().normalizationNames)('returns one error without throwing for %s', name => {
  const result = validatePack(invalidInput(name));
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('Expected failure');
  expect(result.errors).toHaveLength(1);
  expect(result.errors[0]?.message).toContain(name === 'number' ? 'tipo incorrecto' : 'El contenido no es JSON válido');
});
it('rejects an unknown field nested 5000 levels without recursion', () => {
  const extra: Record<string, unknown> = {};
  let node = extra;
  for (let i = 0; i < reviewFixtures().deepLevels; i++) {
    const child: Record<string, unknown> = {};
    node.child = child;
    node = child;
  }
  const result = validatePack(changed(['extra'], extra));
  expect(result).toEqual({ ok: false, errors: [{ path: '', message: 'El archivo está demasiado anidado; reduce los niveles de anidación.' }] });
});
it('accepts a legitimate pack at normal depth', () => {
  expect(validatePack(fixture()).ok).toBe(true);
});
it('does not inspect a hostile value thrown by a getter', () => {
  const thrown = new Proxy(new Error('Getter failed'), { getPrototypeOf() { throw new Error('Inspection failed'); } });
  const input: unknown = Object.defineProperty({}, 'bad', { enumerable: true, get() { throw thrown; } });
  expect(validatePack(input)).toEqual({ ok: false, errors: [{ path: '', message: 'El contenido no es JSON válido; revisa los datos del archivo.' }] });
});
it('reads an own enumerable getter once and validates its copied value', () => {
  const input = fixture();
  let reads = 0;
  Object.defineProperty(input, 'version', { enumerable: true, get() {
    reads++;
    if (reads > 1) throw new Error('Read twice');
    return 1;
  } });
  expect(validatePack(input).ok).toBe(true);
  expect(reads).toBe(1);
});
it.each(['depthAccepted', 'depthRejected'] as const)('enforces the exact configured depth boundary: %s', key => {
  let input: unknown = 'leaf';
  for (let i = 0; i < reviewFixtures()[key]; i++) input = { child: input };
  if (key === 'depthAccepted') expect(normalizeJson(input)).toEqual(input);
  else expect(() => normalizeJson(input)).toThrow();
});
it('does not accept item fields or invalid LaTeX from a prototype', () => {
  const item = { id: 'proto-item', tipo: 'info', titulo: 'Título', cuerpo: '$\\comandoInexistente$' };
  const input = changed(['bloques', 0, 'items', 0], Object.create(item) as unknown);
  const result = validatePack(input);
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('Expected failure');
  expect(result.errors.some(error => error.path === 'bloques[0].items[0].tipo')).toBe(true);
});
it('accepts own enumerable fields on objects with a prototype', () => {
  const input: unknown = Object.assign(Object.create({ extra: '$\\comandoInexistente$' }) as object, fixture());
  const result = validatePack(input);
  expect(result.ok).toBe(true);
  if (result.ok) expect(Object.hasOwn(result.pack, 'extra')).toBe(false);
});
it('ignores non-enumerable properties and never invokes inherited toJSON', () => {
  const input = fixture();
  Object.setPrototypeOf(input, { toJSON() { throw new Error('Inherited method'); } });
  Object.defineProperty(input, 'extra', { get() { throw new Error('Hidden getter'); } });
  expect(validatePack(input).ok).toBe(true);
});
it('copies shared JSON data without treating it as a cycle or mutating the input', () => {
  const input = fixture();
  const first = input.bloques[0]?.items[0];
  const second = input.bloques[0]?.items[1];
  if (!first || !second) throw new Error('Missing items');
  first.etiquetas = ['compartida'];
  second.etiquetas = first.etiquetas;
  const result = validatePack(input);
  expect(result.ok).toBe(true);
  if (result.ok) result.pack.bloques[0]?.items[0]?.etiquetas?.push('nueva');
  expect(first.etiquetas).toEqual(['compartida']);
});
