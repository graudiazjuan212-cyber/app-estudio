import { useRef, useState } from 'react';
import { useData } from './DataProvider.tsx';
import { getSettings, startStudySession } from '../data/index.ts';
import type { StartStudyResult, StartStudyInput } from '../data/index.ts';
import { seedFor } from '../domain/render/order.ts';
import { buildHash } from '../domain/router.ts';
export function StudyButton({ subjectId, chapterId = null, kind = 'study', disabled = false, label = 'Estudiar' }: {
  subjectId: string; chapterId?: string | null; kind?: StartStudyInput['kind']; disabled?: boolean; label?: string;
}) {
  const { db, ctx } = useData();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<StartStudyResult | null>(null);
  async function start() {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try {
      const context = ctx();
      const settings = await getSettings(db);
      const next = await startStudySession(db, { subjectId, chapterId, kind, minutes: settings.sessionMinutes,
        sessionId: crypto.randomUUID(), seed: seedFor(subjectId, context.now) }, context);
      setResult(next);
      if (next.status === 'started') window.location.hash = buildHash({ name: 'session', sessionId: next.sessionId });
    } catch { setResult({ status: 'error', message: 'No se ha podido crear la sesión.' }); }
    finally { lock.current = false; setBusy(false); }
  }
  return <div><button disabled={disabled || busy} onClick={() => { void start(); }}>{label}</button>
    {result && result.status !== 'started' && <div role={result.status === 'error' ? 'alert' : 'status'}>{result.message}
      {result.status === 'error' && <button disabled={busy} onClick={() => { void start(); }}>Reintentar</button>}</div>}</div>;
}
