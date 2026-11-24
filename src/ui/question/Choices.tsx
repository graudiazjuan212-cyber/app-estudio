import { RichText } from '../RichText';
import { displayOrder } from '../../domain/render/order';
import type { QuestionFeedback } from './types';
interface Option { texto: string; correcta: boolean; feedback?: string | undefined }
interface Props {
  options: Option[]; seed: number; selected: number[]; multiple?: boolean; label: string;
  disabled: boolean; feedback: QuestionFeedback | null; onSelect: (index: number) => void;
}
export function Choices({ options, seed, selected, multiple, label, disabled, feedback, onSelect }: Props) {
  return <div role={multiple ? 'group' : 'radiogroup'} aria-label={label}>
    {displayOrder(options.length, seed).map(index => {
      const option = required(options[index]);
      const chosen = selected.includes(index);
      return <div key={index}><button type="button" role={multiple ? 'checkbox' : 'radio'}
        aria-checked={chosen} disabled={disabled} onClick={() => { onSelect(index); }}>
        <RichText inline text={option.texto} />
        {feedback && <span> · {option.correcta ? 'Correcta' : 'Incorrecta'}{chosen ? ' · Tu elección' : ''}</span>}
      </button>{feedback && chosen && !option.correcta && option.feedback && <RichText text={option.feedback} />}</div>;
    })}
  </div>;
}

function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("Faltan datos de la pregunta.");
  return value;
}
