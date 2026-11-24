import { expect, it } from 'vitest';
import { extractMath } from './latex.ts';

it.each([
  ['$a$', [{ kind: 'inline', source: 'a' }]],
  ['$$a$$', [{ kind: 'display', source: 'a' }]],
  ['\\$5', []], ['`$bad`', []], ['```python\nprint("$")\n```', []],
  ['``a `$ b``', []],
  ['$a$ y $$b$$', [{ kind: 'inline', source: 'a' }, { kind: 'display', source: 'b' }]],
  ['$$a\n+b$$', [{ kind: 'display', source: 'a\n+b' }]],
  ['Precio: 5 \\$.', []],
] as const)('extracts math from %s', (text, result) => { expect(extractMath(text)).toEqual(result); });
it.each(['$', '$abc', '$$abc', '$a$ y $b'])('rejects unclosed %s', text => {
  expect(() => extractMath(text)).toThrow('`$` sin cerrar');
});
