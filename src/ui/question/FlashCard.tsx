import { useState } from 'react';
import { RichText } from '../RichText';
import type { InputProps } from './types';
export function FlashCard({ item, disabled, feedback, onChange }: InputProps) {
  const [revealed, setRevealed] = useState(false);
  if (item.tipo !== 'flashcard') return null;
  return <><RichText text={item.anverso} />{revealed || feedback ? <RichText text={item.reverso} /> :
    <button disabled={disabled} onClick={() => { setRevealed(true); onChange(null); }}>Mostrar respuesta</button>}
</>;
}
