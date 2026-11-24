import { RichText } from '../ui/RichText';
import { exactCases } from '../../tests/fixtures/render/richtext';
import { useRef, useState } from 'react';
import math from '../../tests/fixtures/packs/mat-ejemplo-c01.json';
import ioe from '../../tests/fixtures/packs/ioe-ejemplo-c01.json';
import code from '../../tests/fixtures/packs/codigo-ejemplo-c01.json';
import { packSchema } from '../domain/pack/index';
import { submissionOutcome } from '../domain/study/index';
import { seedFor } from '../domain/render/order';
import { QuestionCard } from '../ui/question/QuestionCard';
import type { QuestionFeedback } from '../ui/question/types';
export default function DemoScreen() {
  const [items] = useState(() => [math, ioe, code].flatMap(pack => packSchema.parse(pack).bloques.flatMap(b => b.items)));
  const [selected, setSelected] = useState(0);
  const [reset, setReset] = useState(0);
  const [feedback, setFeedback] = useState<QuestionFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState(0);
  const [simulate, setSimulate] = useState(false);
  const fail = useRef(false);
  const item = required(items[selected]);
  const restart = () => { setReset(v => v + 1); setFeedback(null); setError(null); };
  return <><h1>Demo</h1><RichText text={required(exactCases.find(([id]) => id === 'R02'))[1]} /><label>Pregunta<select aria-label="Pregunta" value={selected} onChange={e => {
    setSelected(Number(e.target.value)); restart();
  }}>{items.map((entry, index) => <option key={entry.id} value={index}>{entry.tipo} · {entry.id}</option>)}</select></label>
    <label><input type="checkbox" checked={simulate} onChange={e => { setSimulate(e.target.checked); fail.current = e.target.checked; }} />Simular fallo de guardado</label>
    <p>Envíos: <span data-testid="submissions">{submissions}</span></p>
    <button onClick={restart}>Reiniciar pregunta</button>
    <QuestionCard key={`${item.id}-${String(reset)}`} item={item} seed={seedFor(item.id, 'demo')} feedback={feedback} error={error}
      onNext={() => { setSelected((selected + 1) % items.length); restart(); }} onSubmit={async submission => {
        setSubmissions(n => n + 1);
        await Promise.resolve();
        if (fail.current) { fail.current = false; setError('No se ha podido guardar.'); throw new Error('No se ha podido guardar.'); }
        const outcome = submissionOutcome(item, submission);
        if (!outcome.ok) { setError(outcome.reason); throw new Error(outcome.reason); }
        setError(null); setFeedback({ correct: item.tipo === 'info' || item.tipo === 'flashcard' ? null : outcome.correct });
      }} />
  </>;
}

function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("Faltan datos de la pregunta.");
  return value;
}
