import { useState } from 'react';
import { RichText } from '../RichText';
import type { InputProps } from './types';
export function ErrorStepQuestion({ item, disabled, onChange }: InputProps) {
  const [selected, setSelected] = useState<number | null>(null);
  if (item.tipo !== 'error') return null;
  return <div role="radiogroup" aria-label="Paso incorrecto">{item.pasos.map((step, index) =>
    <button key={index} role="radio" aria-checked={selected === index} disabled={disabled}
      onClick={() => { setSelected(index); onChange({ tipo: 'error', step: index }); }}>
      Paso {index + 1}: <RichText inline text={step.texto} /></button>)}</div>;
}
