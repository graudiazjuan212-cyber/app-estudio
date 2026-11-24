import { useEffect, useId, useRef, useState } from 'react';
import type { Answer, Confidence, Submission } from '../../domain/study/index';
import { substituteMarkers } from '../../domain/render/question';
import { questionConfig } from '../../config';
import { RichText } from '../RichText';
import { InfoCard } from './InfoCard';
import { FlashCard } from './FlashCard';
import { TestQuestion } from './TestQuestion';
import { MultiQuestion } from './MultiQuestion';
import { TrueFalseQuestion } from './TrueFalseQuestion';
import { OrderQuestion } from './OrderQuestion';
import { MatchQuestion } from './MatchQuestion';
import { GapQuestion } from './GapQuestion';
import { ErrorStepQuestion } from './ErrorStepQuestion';
import type { QuestionProps } from './types';
import { completionWarning } from './completion';
import styles from './QuestionCard.module.css';
export type { QuestionProps, QuestionFeedback } from './types';
const components = { info: InfoCard, flashcard: FlashCard, test: TestQuestion, multi: MultiQuestion,
  vf: TrueFalseQuestion, ordenar: OrderQuestion, emparejar: MatchQuestion, huecos: GapQuestion, error: ErrorStepQuestion };
export function QuestionCard({ item, seed, onSubmit, feedback, error, onNext }: QuestionProps) {
  const alertId = useId();
  const [checked, setChecked] = useState(false);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [confidence, setConfidence] = useState<Confidence | null>(null);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const locked = useRef(false);
  const last = useRef<Submission | null>(null);
  const banner = useRef<HTMLDivElement>(null);
  useEffect(() => { if (feedback) banner.current?.focus(); }, [feedback]);
  const send = async (submission: Submission) => {
    if (locked.current || feedback) return;
    locked.current = true; last.current = submission; setPending(true); setFailed(null);
    try { await onSubmit(submission); setChecked(false); }
    catch (cause) { setFailed(cause instanceof Error ? cause.message : 'No se ha podido guardar.'); }
    finally { locked.current = false; setPending(false); }
  };
  const disabled = pending || feedback !== null || last.current !== null;
  const evaluable = item.tipo !== 'info' && item.tipo !== 'flashcard';
  const warning = checked ? completionWarning(answer, confidence) : '';
  const Component = components[item.tipo];
  return <article className={styles.card} aria-label="Pregunta">
    {'enunciado' in item && <RichText text={item.tipo === 'huecos' ? substituteMarkers(item.enunciado) : item.enunciado} />}
    <Component item={item} seed={seed} disabled={disabled} feedback={feedback} onChange={next => { if (item.tipo === 'flashcard') setRevealed(true); else setAnswer(next); }} />
    {!feedback && <>
      {evaluable && <><div role="radiogroup" aria-label="¿Cuánta seguridad tienes?">
        {questionConfig.confidences.map(([value, label]) => <button key={value} role="radio" aria-checked={confidence === value}
          disabled={disabled} onClick={() => { setConfidence(value); }}>{label}</button>)}</div>
        <button disabled={disabled} aria-describedby={warning ? alertId : undefined} onClick={() => {
          setChecked(true);
          if (answer && confidence) void send({ kind: 'answer', answer, confidence });
        }}>Comprobar</button>{warning && <p id={alertId} role="alert">{warning}</p>}</>}
      {item.tipo === 'info' && <button disabled={disabled} onClick={() => void send({ kind: 'seen' })}>Entendido</button>}
      {item.tipo === 'flashcard' && revealed && questionConfig.ratings.map(([rating, label]) =>
        <button key={rating} disabled={disabled} onClick={() => void send({ kind: 'flashcard', rating })}>{label}</button>)}
      <button disabled={disabled || item.tipo === 'info'} onClick={() => void send(item.tipo === 'flashcard' ? { kind: 'flashcard', rating: 'otra' } : { kind: 'dontKnow' })}>No lo sé</button>
    </>}
    {!feedback && (error ?? failed) && <div role="alert">{error ?? failed}
      <button disabled={pending} onClick={() => { if (last.current) void send(last.current); }}>Reintentar</button></div>}
    {feedback && <><div ref={banner} tabIndex={-1} role="status" aria-live="polite"
      className={feedback.correct === false ? styles.incorrect : styles.correct}>
      {feedback.correct === null ? 'Anotado' : feedback.correct ? '✓ Correcto' : '✗ Incorrecto'}</div>
      {'explicacion' in item && item.explicacion && <RichText text={item.explicacion} />}
      {item.tipo === 'error' && item.correccion && <RichText text={item.correccion} />}
      {item.tipo === 'vf' && feedback.correct === false && item.feedback && <RichText text={item.feedback} />}
      <button onClick={onNext}>Siguiente</button></>}
  </article>;
}
