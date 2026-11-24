import { expect, it } from 'vitest';
import { examVerdictText, sessionHeaderText, summaryLines } from './studyText';
import { emptySummary, emptyLines, fullLines, headerCases } from '../../tests/fixtures/session-text';
it.each(headerCases)('formats %s header at %s of %s', (kind, index, total, label, progress) => {
  expect(sessionHeaderText(kind, index, total)).toEqual({ kind: label, progress });
});
it('formats zero evaluables and unchanged chapters', () => {
  expect(summaryLines(emptySummary, 10, [])).toEqual(emptyLines);
});
it('formats all correct, changed chapter, blind spots and reached goal', () => {
  expect(summaryLines({ ...emptySummary, correct: 5, total: 5, blindSpotsCreated: 1,
    chapterChanges: [{ chapterId: 'c1', titulo: 'Vectores', before: 0, after: 20 }],
    streak: 1, goalReached: true }, 10, [{ id: 'c1', numero: 1 }])).toEqual(fullLines);
});
it('formats plural days and unfinished daily goal', () => {
  expect(summaryLines({ ...emptySummary, streak: 2, secondsToday: 125 }, 15, [])).toEqual([
    'No has respondido preguntas evaluables.', 'El progreso de los capítulos no ha cambiado hoy.',
    'Racha: 2 días', 'Llevas 2 de 15 min',
  ]);
});
it.each([[4, true, 'Examen superado ✓'], [3, false, 'Examen no superado ✗']] as const)(
  'formats exam with %s correct of five', (correct, passed, verdict) => {
    expect(examVerdictText(passed)).toBe(verdict);
    expect(summaryLines({ ...emptySummary, kind: 'exam', correct, total: 5, exam: { passed } }, 10, []).slice(-2))
      .toEqual([verdict, `${String(correct)} de 5 (hace falta el 80 %)`]);
  });
it('omits exam verdict and blind spots for an ordinary session', () => {
  const lines = summaryLines({ ...emptySummary, correct: 0, total: 5 }, 10, []);
  expect(lines[0]).toBe('Aciertos: 0 de 5');
  expect(lines.some(line => /Examen|Puntos ciegos/.test(line))).toBe(false);
});
