import { createElement } from 'react';
import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BlockDayProgress, dayProgressText } from './BlockDayProgress';
import { progressCases } from '../../tests/fixtures/study/dayProgress';
it('renders no line for an absent progress', () => {
  expect(renderToStaticMarkup(createElement(BlockDayProgress, { progress: null }))).toBe('');
});
it.each(progressCases())('renders accessible progress: $name', ({ expected }) => {
  const text = dayProgressText(expected);
  const html = renderToStaticMarkup(createElement(BlockDayProgress, { progress: expected }));
  expect(html).toContain('role="status"');
  if (expected.voided) expect(text).toContain('no puede validar');
  else if (expected.validToday) expect(text).toContain(`(${String(expected.validDays)} de 2`);
  else if (expected.missing > expected.remaining) expect(text).toContain('solo quedan 0 preguntas');
  else expect(text).toContain(`Hoy: ${String(expected.answered)} de ${String(expected.total)} preguntas`);
});
it('uses singular for one missing success and counts today only once', () => {
  const singular = progressCases().find(c => c.name === 'singular missing');
  const valid = progressCases().find(c => c.name === 'today counted once');
  if (!singular || !valid) throw new Error('Missing fixed fixture');
  expect(dayProgressText(singular.expected)).toBe('Hoy: 3 de 5 preguntas · te falta 1 acierto para validar el día (0 de 2 días válidos)');
  expect(dayProgressText(valid.expected)).toBe('Día de hoy válido ✓ (2 de 2 días válidos)');
});
