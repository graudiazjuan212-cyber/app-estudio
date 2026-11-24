import { useState } from 'react';
import { displayOrder } from '../../domain/render/order';
import { placeStep, unplaceStep } from '../../domain/render/question';
import { RichText } from '../RichText';
import type { InputProps } from './types';
export function OrderQuestion({ item, seed, disabled, onChange }: InputProps) {
  const [order, setOrder] = useState<number[]>([]);
  if (item.tipo !== 'ordenar') return null;
  const update = (next: number[]) => { setOrder(next); onChange(next.length === item.pasos.length ? { tipo: 'ordenar', order: next } : null); };
  return <><div role="group" aria-label="Pasos disponibles">{displayOrder(item.pasos.length, seed, { avoidIdentity: true }).filter(i => !order.includes(i)).map(i =>
    <button key={i} disabled={disabled} onClick={() => { update(placeStep(order, i)); }}><RichText inline text={required(item.pasos[i])} /></button>)}</div>
    <h3>Tu orden</h3><ol>{order.map(i => <li key={i}><button disabled={disabled} onClick={() => { update(unplaceStep(order, i)); }}>
      <RichText inline text={required(item.pasos[i])} /></button></li>)}</ol>
    <button disabled={disabled} onClick={() => { update([]); }}>Vaciar</button></>;
}

function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("Faltan datos de la pregunta.");
  return value;
}
