import { useData } from './DataProvider.tsx';
import { useAsync } from './useAsync.ts';
import { getHomeView } from '../data/index.ts';
import { buildHash } from '../domain/router.ts';
import { studyConfig } from '../config.ts';
import { ProgressBar } from '../ui/ProgressBar.tsx';
import { formatMinutes, formatStudyDay } from '../ui/format.ts';
import { LoadError } from '../ui/LoadState.tsx';
import { StudyButton } from './StudyButton.tsx';
import styles from '../ui/Screens.module.css';
export function HomeScreen() {
  const { db, ctx, revision, bump } = useData();
  const view = useAsync(() => getHomeView(db, ctx()), [db, ctx, revision]);
  const data = view.data;
  return <div className={styles.screen}><h1>Estudio</h1><a href="#/ajustes">Ajustes</a>
    {view.status === 'loading' && <p role="status">Cargando…</p>}
    {view.status === 'error' && <LoadError retry={bump} />}
    {data && <><section><p>Racha: {data.streak} {data.streak === 1 ? 'día' : 'días'}</p>
      <p>Hoy: {formatMinutes(data.secondsToday)} de {data.dailyGoalMinutes} min</p>
      <progress aria-label="Objetivo diario" value={data.secondsToday} max={data.dailyGoalMinutes * studyConfig.secondsPerMinute} />
      {data.goalReached && <p>✓ Objetivo cumplido</p>}</section>
      {!data.hasData && <section><h2>Todavía no tienes asignaturas</h2><p>Importa un paquete de preguntas desde Ajustes.</p><a href="#/ajustes">Ir a Ajustes</a></section>}
      {data.backupReminder && <aside><p>Hace tiempo que no haces una copia de seguridad.</p><a href="#/ajustes">Hacer copia</a></aside>}
      {data.openSession && <section><h2>Tienes una sesión sin terminar</h2><a href={buildHash({ name: 'session', sessionId: data.openSession.id })}>Continuar</a></section>}
      {data.subjects.map(subject => <article key={subject.id}><h2>{subject.nombre}</h2><ProgressBar percent={subject.percent} label={`Progreso de ${subject.nombre}`} />
        <p>{subject.dueToday ? `${String(subject.dueToday)} repasos hoy` : 'Sin repasos hoy'}</p><p>Último día: {formatStudyDay(subject.lastStudyDay)}</p>
        <StudyButton subjectId={subject.id} subjectName={subject.nombre} /><a href={buildHash({ name: 'subject', subjectId: subject.id })}>Ver asignatura</a></article>)}</>}
  </div>;
}
