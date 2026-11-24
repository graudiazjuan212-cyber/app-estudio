import { useState } from 'react';
import { Choices } from './Choices';
import type { InputProps } from './types';
export function TestQuestion({ item, seed, disabled, feedback, onChange }: InputProps) {
  const [selected, setSelected] = useState<number[]>([]);
  if (item.tipo !== 'test') return null;
  return <Choices options={item.opciones} seed={seed} selected={selected} multiple={false}
    label="Opciones" disabled={disabled} feedback={feedback} onSelect={index => {
      const next = [index];
      setSelected(next); onChange({ tipo: 'test', selected: index });
    }} />;
}
