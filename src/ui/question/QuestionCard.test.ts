import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { QuestionCard } from './QuestionCard';
import { items } from '../../../tests/fixtures/study/items';

it('enables the direct flashcard action without showing its reverse', () => {
  const onSubmit = vi.fn<() => Promise<void>>();
  const html = renderToStaticMarkup(createElement(QuestionCard, { item: items.flashcard, seed: 1,
    feedback: null, error: null, onNext: vi.fn(), onSubmit }));
  expect(html).toContain('Mostrar respuesta');
  expect(html).toMatch(/<button>No lo sé<\/button>/);
  expect(html).not.toContain('<p>B</p>');
  expect(onSubmit).not.toHaveBeenCalled();
});
it('reveals the reverse on incorrect feedback without a manual reveal', () => {
  const html = renderToStaticMarkup(createElement(QuestionCard, { item: items.flashcard, seed: 1,
    feedback: { correct: false }, error: null, onNext: vi.fn(), onSubmit: vi.fn<() => Promise<void>>() }));
  expect(html).toContain('<p>B</p>');
  expect(html).toContain('✗ Incorrecto');
  expect(html).not.toContain('Mostrar respuesta');
});
it('keeps info disabled and offers no check action', () => {
  const html = renderToStaticMarkup(createElement(QuestionCard, { item: items.info, seed: 1,
    feedback: null, error: null, onNext: vi.fn(), onSubmit: vi.fn<() => Promise<void>>() }));
  expect(html).toMatch(/<button disabled="">No lo sé<\/button>/);
  expect(html).not.toContain('Comprobar');
});
