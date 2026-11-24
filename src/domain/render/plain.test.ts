import { expect, it } from 'vitest';
import { plainText } from './plain';

// Expected readings written by hand: the accessible name must be short, readable and never empty for a formula.
it.each([
  ['$10$', '10'],
  ['$\\sqrt{x}$ metros', 'raíz x metros'],
  ['$x^2+y^2$', 'x elevado a 2+y elevado a 2'],
  ['$\\frac{a}{b}$', 'fracción a b'],
  ['$a_1$', 'a sub 1'],
  ['$$\\pi$$', 'pi'],
  ['$x \\leq 3$', 'x menor o igual que 3'],
  ['**negrita** y `código`', 'negrita y código'],
  ['\\$5 y $x$', '$5 y x'],
  ['Sin fórmulas', 'Sin fórmulas'],
  ['$sin cerrar', '$sin cerrar'],
  ['   ', ''],
  ['', ''],
  ['$\\constructor$', 'constructor'],
])('reads %s as %s', (text, expected) => {
  expect(plainText(text)).toBe(expected);
});
