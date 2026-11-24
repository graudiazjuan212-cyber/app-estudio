import { BlockDayProgress } from '../ui/BlockDayProgress';
import { useData } from './DataProvider.tsx';
import { useAsync } from './useAsync.ts';
import { getSubjectView } from '../data/index.ts';
import { ProgressBar } from '../ui/ProgressBar.tsx';
import { StatusBadge } from '../ui/StatusBadge.tsx';
import { blockRequirementText } from '../ui/format.ts';
import { LoadError } from '../ui/LoadState.tsx';
import { StudyButton } from './StudyButton.tsx';
import { ProgressExportButton } from './ProgressExportButton.tsx';
import styles from '../ui/Screens.module.css';
export function SubjectScreen({ subjectId }: { subjectId: string }) {
  const { db, ctx, revision, bump } = useData();
  const view = useAsync(() => getSubjectView(db, subjectId, ctx()), [db, subjectId, ctx, revision]);
  const data = view.data;
  const titles = new Map(data?.chapters.flatMap(ch => ch.blocks.map(b => [b.id, b.titulo] as const)));
  return <div className={styles.screen}><a href="#/">Volver al inicio</a>
    {view.status === 'loading' && <p role="status">Cargando…</p>}
    {view.status === 'error' && <LoadError retry={bump} />}
    {data === null && <p>No encuentro esta asignatura.</p>}
    {data && <><h1>{data.nombre}</h1><ProgressBar percent={data.percent} label="Progreso global" /><StudyButton subjectId={subjectId} />
      <ProgressExportButton subjectId={subjectId} />
      {data.chapters.map(ch => <section key={ch.id}><h2>{ch.numero}. {ch.titulo}</h2><ProgressBar percent={ch.percent} label={`Progreso de ${ch.titulo}`} />
        <StudyButton subjectId={subjectId} chapterId={ch.id} kind="review" label="Repasar capítulo" />
        <StudyButton subjectId={subjectId} chapterId={ch.id} kind="exam" label="Mini examen" disabled={!ch.hasEvaluables} />
        {!ch.hasEvaluables && <p>Este capítulo aún no tiene preguntas</p>}
        {ch.blocks.map(b => <article key={b.id}><h3>{b.titulo}</h3><p>{b.peso === 1 ? 'Básico' : b.peso === 3 ? 'Intermedio' : 'Tipo examen'}</p>
          <StatusBadge status={b.status} /><BlockDayProgress progress={b.dayProgress} />{b.locked && <p>{blockRequirementText(b.requiere.map(id => titles.get(id) ?? id))}</p>}</article>)}</section>)}</>}
  </div>;
}
