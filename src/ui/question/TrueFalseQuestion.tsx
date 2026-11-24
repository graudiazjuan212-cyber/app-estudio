import { useState } from 'react';
import type { InputProps } from './types';
export function TrueFalseQuestion({ disabled, onChange }: InputProps) {
  const [value, setValue] = useState<boolean | null>(null);
  return <div role="radiogroup" aria-label="Verdadero o falso">{[true, false].map(v =>
    <button key={String(v)} role="radio" aria-checked={value === v} disabled={disabled}
      onClick={() => { setValue(v); onChange({ tipo: 'vf', value: v }); }}>{v ? 'Verdadero' : 'Falso'}</button>)}</div>;
}
