import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { dataConfig } from '../config.ts';
import { getSettings, openStudyDb } from '../data/index.ts';
import type { DataContext, OpenResult, StudyDb } from '../data/index.ts';
interface DataValue { db: StudyDb; ctx: () => DataContext; revision: number; bump: () => void }
const Data = createContext<DataValue | null>(null);
export function useData(): DataValue {
  const value = useContext(Data);
  if (!value) throw new Error('Los datos todavía no están disponibles.');
  return value;
}
const defaultClock = () => new Date();
type Status = 'ready' | 'loading' | 'changed' | 'blocked' | Exclude<OpenResult, { ok: true }>['reason'];
export function DataProvider({ children, clock = defaultClock, tz }: {
  children: ReactNode; clock?: () => Date; tz?: string;
}) {
  const [db, setDb] = useState<StudyDb | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [retry, setRetry] = useState(0);
  const [revision, setRevision] = useState(0);
  const bump = useCallback(() => { setRevision(value => value + 1); }, []);
  const ctx = useCallback(() => ({ now: clock().toISOString(),
    tz: tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone }), [clock, tz]);
  useEffect(() => {
    let active = true;
    let connection: StudyDb | undefined;
    let changed = false;
    void openStudyDb(dataConfig.dbName, {
      onVersionChange: () => { changed = true; if (active) setStatus('changed'); },
      onBlocked: () => { if (active) setStatus('blocked'); },
    }).then(result => {
      if (result.ok) connection = result.db;
      if (!active) { connection?.close(); return; }
      if (!result.ok) setStatus(result.reason);
      else if (!changed) { setDb(result.db); setStatus('ready'); }
    });
    return () => { active = false; connection?.close(); };
  }, [retry]);
  useEffect(() => {
    if (!db) return;
    let active = true;
    void getSettings(db).then(settings => {
      if (!active) return;
      if (settings.theme === 'system') document.documentElement.removeAttribute('data-theme');
      else document.documentElement.dataset.theme = settings.theme;
    }).catch(() => { /* Opening state remains responsible for availability. */ });
    return () => { active = false; };
  }, [db, revision]);
  if (db && status === 'ready') return <Data.Provider value={{ db, ctx, revision, bump }}>{children}</Data.Provider>;
  const messages: Record<Status, string> = {
    ready: 'Abriendo tus datos…',
    loading: 'Abriendo tus datos…',
    'version-newer': 'Hay una versión nueva de la app. Recarga para actualizar.',
    blocked: 'Cierra las demás pestañas de la app.',
    'migration-failed': 'No se ha podido actualizar tu base de datos. Tus datos no se han tocado.',
    unavailable: 'Este navegador no permite guardar datos. Prueba con Chrome.',
    changed: 'La app se ha actualizado en otra ventana. Recarga.',
  };
  const reload = status === 'changed' || status === 'version-newer';
  const retryable = status === 'blocked' || status === 'migration-failed';
  return <main><p role="status">{messages[status]}</p>{(reload || retryable) &&
    <button type="button" onClick={() => {
      if (reload) window.location.reload();
      else { setDb(null); setStatus('loading'); setRetry(value => value + 1); }
    }}>{reload ? 'Recargar' : 'Reintentar'}</button>}</main>;
}
