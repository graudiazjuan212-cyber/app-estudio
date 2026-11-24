import { useState } from 'react';
import { displayOrder } from '../../domain/render/order';
import { togglePair } from '../../domain/render/question';
import { RichText } from '../RichText';
import type { InputProps } from './types';
export function MatchQuestion({ item, seed, disabled, onChange }: InputProps) {
  const [pairs, setPairs] = useState<[number, number][]>([]);
  const [left, setLeft] = useState<number | null>(null);
  if (item.tipo !== 'emparejar') return null;
  const update = (next: [number, number][]) => { setPairs(next); onChange(next.length === item.pares.length ? { tipo: 'emparejar', pairs: next } : null); };
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>{(['izquierda', 'derecha'] as const).map(side =>
    <div key={side} aria-label={side}>{(side === 'izquierda' ? item.pares.map((_, i) => i) : displayOrder(item.pares.length, seed)).map(i => {
      const pair = pairs.findIndex(p => p[side === 'izquierda' ? 0 : 1] === i);
      return <button key={i} disabled={disabled} aria-pressed={side === 'izquierda' && left === i} onClick={() => {
        if (pair >= 0) { update(pairs.filter((_, index) => index !== pair)); setLeft(null); }
        else if (side === 'izquierda') setLeft(i);
        else if (left !== null) { update(togglePair(pairs, left, i)); setLeft(null); }
      }}><RichText inline text={required(item.pares[i])[side]} />{pair >= 0 && <span> · Par {pair + 1}</span>}</button>;
    })}</div>)}</div>;
}

function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("Faltan datos de la pregunta.");
  return value;
}
