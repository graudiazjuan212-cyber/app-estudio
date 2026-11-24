import { getSessionSummary, getSettings, getSubjectView, loadSessionRun } from '../data/index';
import { useData } from './DataProvider';
import { useAsync } from './useAsync';
import { LoadError } from '../ui/LoadState';
import { StudyButton } from './StudyButton';
import { practiceConfig } from '../config';
import { summaryLines } from './studyText';
export function SummaryScreen({ sessionId }: { sessionId: string }) {
  const { db, ctx, revision, bump } = useData();
  const view = useAsync(async () => {
    const run = await loadSessionRun(db, sessionId);
    if (!run) return null;
    const context = ctx();
    const [summary, settings, subject] = await Promise.all([
      getSessionSummary(db, sessionId, context), getSettings(db), getSubjectView(db, run.session.subjectId, context),
    ]);
    return { summary, settings, subject, subjectId: run.session.subjectId };
  }, [db, ctx, sessionId, revision]);
  return <section><h1>Resumen de la sesión</h1>
    {view.status === 'loading' && <p role="status">Cargando…</p>}
    {view.status === 'error' && <LoadError retry={bump} />}
    {view.status === 'ready' && !view.data && <p>No encuentro esta sesión.</p>}
    {view.data && <>{view.data.summary.kind === 'practice' && <p role="note">{practiceConfig.note}</p>}{summaryLines(view.data.summary, view.data.settings.dailyGoalMinutes, view.data.subject?.chapters ?? []).map(line => <p key={line}>{line}</p>)}
      <StudyButton subjectId={view.data.subjectId} label="Otra sesión" /></>}
    <a href="#/">Volver al inicio</a>
  </section>;
}
