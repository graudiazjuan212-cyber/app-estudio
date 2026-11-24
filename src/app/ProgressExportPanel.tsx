import { getHomeView } from '../data/index.ts';
import { LoadError } from '../ui/LoadState.tsx';
import { useData } from './DataProvider.tsx';
import { useAsync } from './useAsync.ts';
import { ProgressExportButton } from './ProgressExportButton.tsx';

export function ProgressExportPanel() {
  const { db, ctx, revision, bump } = useData();
  const view = useAsync(() => getHomeView(db, ctx()), [db, ctx, revision]);
  return <section><h2>Exportar progreso</h2>
    {view.status === 'loading' && <p role="status">Cargando asignaturas…</p>}
    {view.status === 'error' && <LoadError retry={bump} />}
    {view.data && !view.data.hasData && <p>Importa una asignatura para exportar su progreso. Esto no sustituye a la copia de seguridad.</p>}
    {view.data?.subjects.map(subject => <section key={subject.id} aria-label={subject.nombre}>
      <h3>{subject.nombre}</h3><ProgressExportButton subjectId={subject.id} />
    </section>)}
  </section>;
}
