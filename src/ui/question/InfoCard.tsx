import { RichText } from '../RichText';
import type { InputProps } from './types';
export function InfoCard({ item }: InputProps) {
  return item.tipo === 'info' ? <><h2>{item.titulo}</h2><RichText text={item.cuerpo} /></> : null;
}
