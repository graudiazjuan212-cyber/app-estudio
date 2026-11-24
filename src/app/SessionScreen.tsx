import { useCallback, useEffect, useRef, useState } from 'react';
import { loadSessionRun, finishStudySession, submitAnswer, submitPracticeAnswer } from '../data/index';
import type { SessionRun } from '../data/index';
import { buildHash } from '../domain/router';
import { seedFor } from '../domain/render/order';
import { QuestionCard } from '../ui/question/QuestionCard';
import type { QuestionFeedback } from '../ui/question/QuestionCard';
import { BlockDayProgress } from '../ui/BlockDayProgress';
import type { BlockDayProgress as DayProgress } from '../domain/study/index';
import { Dialog } from '../ui/Dialog';
import { LoadError } from '../ui/LoadState';
import { useData } from './DataProvider';
import { useAsync } from './useAsync';
import { practiceConfig } from '../config';
import { sessionHeaderText } from './studyText';

export function SessionScreen({ sessionId }: { sessionId: string }) {
  const { db, ctx, bump } = useData();
  const [notice, setNotice] = useState<string | null>(null);
  const [position, setPosition] = useState<number | null>(null);
  const [reload, setReload] = useState(0);
  const view = useAsync(() => loadSessionRun(db, sessionId), [db, sessionId, reload]);
  const finish = useCallback(async () => {
    await finishStudySession(db, sessionId, ctx()); bump();
    window.location.replace(buildHash({ name: 'summary', sessionId }));
  }, [db, sessionId, ctx, bump]);
  if (view.status === 'loading') return <p role="status">Cargando…</p>;
  if (view.status === 'error') return <LoadError retry={() => { setReload(n => n + 1); }} />;
  if (!view.data) return <><p>No encuentro esta sesión.</p><a href="#/">Volver al inicio</a></>;
  return <>{notice && <p role="status">{notice}</p>}<SessionRunScreen startIndex={position} onNotice={setNotice}
    reloadAt={index => { setPosition(index); setReload(n => n + 1); }} key={`${sessionId}-${String(reload)}`} run={view.data} finish={finish} /></>;
}
function SessionRunScreen({ run, finish, startIndex, reloadAt, onNotice }: {
  run: SessionRun; finish: () => Promise<void>; startIndex: number | null;
  reloadAt: (index: number) => void; onNotice: (message: string) => void;
}) {
  const { db, ctx, bump } = useData();
  const [index, setIndex] = useState(startIndex ?? run.nextIndex);
  const [dayProgress, setDayProgress] = useState<DayProgress | null>(null);
  const [feedback, setFeedback] = useState<QuestionFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const attempts = useRef(new Map<string, { id: string; start: number }>());
  const prompt = useRef<HTMLDivElement>(null);
  const exit = useRef<HTMLAnchorElement>(null);
  const current = run.items[index];
  const end = useCallback(async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(null);
    try { await finish(); }
    catch { setError('No se ha podido terminar la sesión. Reintenta.'); }
    finally { lock.current = false; setBusy(false); }
  }, [finish]);
  useEffect(() => {
    if (current) {
      if (!attempts.current.has(current.id)) attempts.current.set(current.id, { id: crypto.randomUUID(), start: performance.now() });
      const heading = prompt.current?.querySelector<HTMLElement>('article > :first-child');
      if (heading) { heading.tabIndex = -1; heading.focus(); }
      else prompt.current?.focus();
    } else { void end(); }
  }, [current, end]);
  return <section><h1>{sessionHeaderText(run.session.kind, index, run.items.length).kind}</h1>
    {run.session.kind === 'practice' && <p role="note">{practiceConfig.note}</p>}
    <p>{sessionHeaderText(run.session.kind, index, run.items.length).progress}</p>
    <progress role="progressbar" aria-label="Progreso de la sesión" value={index} max={run.items.length}
      aria-valuenow={index} aria-valuemin={0} aria-valuemax={run.items.length} />
    <a ref={exit} href="#/">Salir</a>
    <button disabled={busy || (!run.answered.length && !feedback && index === run.nextIndex)} onClick={() => { setConfirm(true); }}>Terminar ahora</button>
    {current && <div ref={prompt} tabIndex={-1}><QuestionCard key={current.id} item={current.item}
      seed={seedFor(run.session.id, current.id)} feedback={feedback} error={error}
      onSubmit={async submission => {
        const attempt = attempts.current.get(current.id);
        if (!attempt) throw new Error('La pregunta todavía no está preparada.');
        setError(null);
        try {
          const save = run.session.kind === 'practice' ? async (...args: Parameters<typeof submitPracticeAnswer>) =>
            ({ ...await submitPracticeAnswer(...args), dayProgress: null }) : submitAnswer;
          const result = await save(db, { sessionId: run.session.id, itemId: current.id,
            attemptId: attempt.id, fingerprint: current.fingerprint, submission, durationMs: Math.max(0, Math.round(performance.now() - attempt.start)) }, ctx());
          if (result.status === 'already-answered') {
            onNotice('Esta pregunta ya se respondió en otra ventana. Pasamos a la siguiente.');
            setFeedback(null); setIndex(n => n + 1); return;
          }
          if (result.status === 'changed') {
            onNotice('Esta pregunta ha cambiado en otra ventana. La hemos vuelto a cargar: respóndela de nuevo.');
            reloadAt(index); return;
          }
          setDayProgress(result.dayProgress);
          setFeedback({ correct: result.correct }); bump();
        } catch { setError('No se ha podido guardar la respuesta.'); throw new Error('No se ha podido guardar la respuesta.'); }
      }} onNext={() => { setFeedback(null); setError(null); setIndex(n => n + 1); }} /></div>}
    {run.session.kind !== 'practice' && <BlockDayProgress progress={dayProgress} />}
    {!current && error && <div role="alert">{error}<button disabled={busy} onClick={() => { void end(); }}>Reintentar</button></div>}
    {confirm && <Dialog title="¿Terminar la sesión?" returnFocus={exit} onClose={() => { if (!busy) setConfirm(false); }}>
      <p>Se conservarán las respuestas guardadas.</p>
      {error && <p role="alert">{error}</p>}
      <button disabled={busy} onClick={() => { void end(); }}>Terminar</button>
      <button disabled={busy} onClick={() => { setConfirm(false); }}>Cancelar</button>
    </Dialog>}
  </section>;
}
