import type { SessionSummary } from '../../src/data/index';
export const emptySummary: SessionSummary = {
  sessionId: 'fixed', kind: 'study', correct: 0, total: 0, blindSpotsCreated: 0,
  chapterChanges: [], streak: 0, secondsToday: 0, goalReached: false, exam: null,
};
export const headerCases = [
  ['study', 0, 5, 'Estudiar', 'Pregunta 1 de 5'],
  ['review', 1, 5, 'Repaso del capítulo', 'Pregunta 2 de 5'],
  ['exam', 4, 5, 'Mini examen', 'Pregunta 5 de 5'],
  ['study', 0, 0, 'Estudiar', 'Pregunta 0 de 0'],
] as const;
export const emptyLines = ['No has respondido preguntas evaluables.',
  'El progreso de los capítulos no ha cambiado hoy.', 'Racha: 0 días', 'Llevas 0 de 10 min'];
export const fullLines = ['Aciertos: 5 de 5', 'Puntos ciegos nuevos: 1',
  'Fallos con mucha seguridad: se repasarán primero.', 'Capítulo 1 «Vectores»: 0 % → 20 %',
  'Racha: 1 día', 'Objetivo cumplido ✓'];
