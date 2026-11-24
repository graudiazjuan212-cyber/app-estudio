// @vitest-environment node
import { expect, it } from 'vitest';
import { renderRich, renderRichInline, richCacheSize } from './richtext.ts';
import {
  blankLineMath, containsCases, exactCases, forbiddenCases, inlineInput,
  specialCases, twoFormulaInput,
} from '../../../tests/fixtures/render/richtext.ts';

it.each(exactCases)('%s renders exact HTML', (_id, input, expected) => {
  expect(renderRich(input)).toBe(expected);
});
it.each(containsCases)('%s includes required markup', (_id, input, expected) => {
  expect(renderRich(input)).toContain(expected);
});
it.each(forbiddenCases)('%s excludes unsafe or unwanted markup', (_id, input, forbidden) => {
  expect(renderRich(input)).not.toContain(forbidden);
});
it('R11 renders two independent formulas', () => {
  expect(renderRich(twoFormulaInput).split('<span class="katex">')).toHaveLength(3);
});
it('renders display math across blank lines', () => {
  expect(renderRich(blankLineMath)).toContain('katex-display');
});
it('keeps inline output free of paragraphs and caches modes separately', () => {
  expect(renderRich(inlineInput)).toContain('<p>');
  const inline = renderRichInline(inlineInput);
  expect(inline).not.toContain('<p>');
  expect(inline).toContain('<strong>a</strong>');
  expect(inline).toContain('<span class="katex">');
  expect(renderRichInline(inlineInput)).toBe(inline);
  expect(renderRich(inlineInput)).toBe(renderRich(inlineInput));
});
it('bounds the shared cache and can render an evicted entry again', () => {
  for (let index = 0; index < 600; index++) renderRich(String(index));
  expect(richCacheSize()).toBeLessThanOrEqual(500);
  expect(renderRich('**a**')).toBe('<p><strong>a</strong></p>\n');
});
it('accepts 100000 characters', () => {
  expect(() => renderRich('a'.repeat(100000))).not.toThrow();
});
it.each(specialCases)('accepts special input %s in both modes', input => {
  expect(() => renderRich(input)).not.toThrow();
  expect(() => renderRichInline(input)).not.toThrow();
});
