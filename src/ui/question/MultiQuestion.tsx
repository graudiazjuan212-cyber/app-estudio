import { useState } from 'react';
import { Choices } from './Choices';
import type { InputProps } from './types';
export function MultiQuestion({ item, seed, disabled, feedback, onChange }: InputProps) {
  const [selected, setSelected] = useState<number[]>([]);
  if (item.tipo !== 'multi') return null;
  return <><p>Marca todas las correctas</p><Choices options={item.opciones} seed={seed} selected={selected} multiple={true}
    label="Marca todas las correctas" disabled={disabled} feedback={feedback} onSelect={index => {
      const next = selected.includes(index) ? selected.filter(i => i !== index) : [...selected, index];
      setSelected(next); onChange(next.length ? { tipo: 'multi', selected: next } : null);
    }} /></>;
}
