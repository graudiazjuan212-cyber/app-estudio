import { useEffect, useRef, useState } from 'react';
import { practiceConfig, studyConfig } from '../config.ts';
import { useData } from './DataProvider.tsx';
import { getSettings, startStudySession, startPracticeSession } from '../data/index.ts';
import type { StartStudyResult, StartStudyInput } from '../data/index.ts';
import { seedFor } from '../domain/render/order.ts';
import { buildHash } from '../domain/router.ts';
export function StudyButton({ subjectId, subjectName, chapterId = null, kind = 'study', disabled = false, label = 'Estudiar' }: {
  subjectId: string; subjectName?: string; chapterId?: string | null; kind?: StartStudyInput['kind']; disabled?: boolean; label?: string;
}) {
  const { db, ctx } = useData();
  const lock = useRef(false);
  const chosen = useRef(false);
  const [minutes, setMinutes] = useState<number>(studyConfig.defaultSessionMinutes);
  useEffect(() => {
    let active = true;
    void getSettings(db).then(settings => {
      if (active && !chosen.current) setMinutes(settings.sessionMinutes);
    }).catch(() => { /* Keep the default if settings cannot be read. */ });
    return () => { active = false; };
  }, [db]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<StartStudyResult | null>(null);
  async function start(practice = false) {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try {
      const context = ctx();
      const duration = kind === 'review'
        ? await getSettings(db).then(settings => settings.sessionMinutes).catch(() => studyConfig.defaultSessionMinutes)
        : minutes;
      const next = await (practice ? startPracticeSession : startStudySession)(db, { subjectId, chapterId, kind, minutes: duration,
        sessionId: crypto.randomUUID(), seed: seedFor(subjectId, context.now) }, context);
      setResult(next);
      if (next.status === 'started') window.location.hash = buildHash({ name: 'session', sessionId: next.sessionId });
    } catch { setResult({ status: 'error', message: 'No se ha podido crear la sesión.' }); }
    finally { lock.current = false; setBusy(false); }
  }
  return <div>{kind === 'study' && <select
    aria-label={subjectName ? 'Duración de la sesión de ' + subjectName : 'Duración de la sesión'}
    value={minutes} disabled={disabled || busy} onChange={event => {
      chosen.current = true; setMinutes(Number(event.target.value));
    }}>
    {studyConfig.sessionMinutesOptions.map(value => <option key={value} value={value}>{value} min</option>)}
  </select>}<button disabled={disabled || busy} onClick={() => { void start(); }}>{label}</button>
    {result && result.status !== 'started' && <div role={result.status === 'error' ? 'alert' : 'status'}>{result.message}
      {kind === 'study' && result.status === 'empty' && result.message !== practiceConfig.empty &&
        <button disabled={busy} onClick={() => { void start(true); }}>{practiceConfig.title}</button>}
      {result.status === 'error' && <button disabled={busy} onClick={() => { void start(); }}>Reintentar</button>}</div>}</div>;
}
