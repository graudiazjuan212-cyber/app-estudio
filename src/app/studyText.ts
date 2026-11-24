import type { SessionSummary, StartStudyInput } from '../data/index';
import { practiceConfig, studyConfig } from '../config';
import { formatMinutes } from '../ui/format';
export function sessionHeaderText(kind: StartStudyInput['kind'], index: number, total: number) {
  return { kind: kind === 'practice' ? practiceConfig.title : kind === 'exam' ? 'Mini examen' : kind === 'review' ? 'Repaso del capítulo' : 'Estudiar',
    progress: `Pregunta ${String(Math.min(index + 1, total))} de ${String(total)}` };
}
export function examVerdictText(passed: boolean): string {
  return passed ? 'Examen superado ✓' : 'Examen no superado ✗';
}
export function summaryLines(summary: SessionSummary, goal: number, chapters: { id: string; numero: number }[]): string[] {
  return [summary.total === 0 ? 'No has respondido preguntas evaluables.' : `Aciertos: ${String(summary.correct)} de ${String(summary.total)}`,
    ...(summary.blindSpotsCreated > 0 ? [`Puntos ciegos nuevos: ${String(summary.blindSpotsCreated)}`, 'Fallos con mucha seguridad: se repasarán primero.'] : []),
    ...(summary.kind === 'practice' ? [] : summary.chapterChanges.length ? summary.chapterChanges.map(ch =>
      `Capítulo ${String(chapters.find(entry => entry.id === ch.chapterId)?.numero ?? '—')} «${ch.titulo}»: ${String(ch.before)} % → ${String(ch.after)} %`)
      : ['El progreso de los capítulos no ha cambiado hoy.']),
    `Racha: ${String(summary.streak)} ${summary.streak === 1 ? 'día' : 'días'}`,
    summary.goalReached ? 'Objetivo cumplido ✓' : `Llevas ${formatMinutes(summary.secondsToday)} de ${String(goal)} min`,
    ...(summary.exam ? [examVerdictText(summary.exam.passed), `${String(summary.correct)} de ${String(summary.total)} (hace falta el ${String(studyConfig.examPassPercent)} %)`] : [])];
}
