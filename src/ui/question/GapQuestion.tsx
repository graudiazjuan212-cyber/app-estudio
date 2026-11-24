import { useState } from 'react';
import { Choices } from './Choices';
import type { InputProps } from './types';
export function GapQuestion({ item, seed, disabled, feedback, onChange }: InputProps) {
  const [chosen, setChosen] = useState<Record<number, number>>({});
  if (item.tipo !== 'huecos') return null;
  return <>{item.huecos.map((gap, index) => <section key={gap.n}><h3>Hueco {gap.n}</h3>
    <Choices options={gap.opciones} seed={seed} label={`Hueco ${String(gap.n)}`} disabled={disabled} feedback={feedback}
      selected={chosen[index] === undefined ? [] : [chosen[index]]} onSelect={value => {
        const next = { ...chosen, [index]: value }; setChosen(next);
        onChange(item.huecos.every((_, i) => next[i] !== undefined) ? { tipo: 'huecos', chosen: item.huecos.map((_, i) => required(next[i])) } : null);
      }} /></section>)}</>;
}

function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("Faltan datos de la pregunta.");
  return value;
}
