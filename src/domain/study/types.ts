import type { Card } from 'ts-fsrs';
import type { ItemType } from '../pack/index.ts';
import { packConfig } from '../../config.ts';

export type Confidence = 'duda' | 'bastante' | 'seguro';
export type FlashRating = 'otra' | 'dificil' | 'bien' | 'facil';
export interface Attempt {
  attemptId: string; itemId: string; itemGen: number;
  subjectId: string; chapterId: string; blockId: string; tipo: ItemType;
  at: string; studyDay: string; tz: string;
  correct: boolean; dontKnow: boolean;
  confidence: Confidence | null; rating: FlashRating | null;
  durationMs: number; sessionId: string; packVersion: number; schedulerVersion: number;
}
export type StoredCard = Omit<Card, 'due' | 'last_review'> & {
  due: string; last_review?: string;
};
export interface ItemState { itemId: string; itemGen: number; card: StoredCard }

export function toStoredCard(card: Card): StoredCard {
  const { due, last_review, ...rest } = card;
  return { ...rest, due: due.toISOString(),
    ...(last_review === undefined ? {} : { last_review: last_review.toISOString() }) };
}
export function fromStoredCard(stored: StoredCard): Card {
  const { due, last_review, ...rest } = stored;
  const card = { ...rest, due: new Date(due),
    ...(last_review === undefined ? {} : { last_review: new Date(last_review) }) };
  if (!Number.isFinite(card.due.getTime()) ||
    (card.last_review !== undefined && !Number.isFinite(card.last_review.getTime())))
    throw new Error('Invalid stored card date');
  return card;
}

function validInstant(value: string): boolean {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value.replace(/(?<=:\d{2})Z$/, '.000Z');
}
export function validateAttempt(a: Attempt): string[] {
  const errors: string[] = [];
  if (!validInstant(a.at)) errors.push('Invalid UTC instant');
  if (typeof a.studyDay !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(a.studyDay)) errors.push('Invalid study day');
  if (!Number.isInteger(a.durationMs) || a.durationMs < 0) errors.push('Invalid duration');
  if (!Number.isInteger(a.itemGen) || a.itemGen < 1) errors.push('Invalid item generation');
  if (!Number.isInteger(a.packVersion) || a.packVersion < 1) errors.push('Invalid pack version');
  if (!packConfig.itemTypes.includes(a.tipo)) errors.push('Invalid item type');
  if (typeof a.correct !== 'boolean' || typeof a.dontKnow !== 'boolean') errors.push('Invalid outcome');
  if (a.tipo === 'info') {
    if (!a.correct || a.dontKnow || a.confidence !== null || a.rating !== null) errors.push('Invalid info outcome');
  } else if (a.tipo === 'flashcard') {
    if (!['otra', 'dificil', 'bien', 'facil'].includes(a.rating ?? '') || a.confidence !== null ||
      a.dontKnow || a.correct !== (a.rating !== 'otra')) errors.push('Invalid flashcard outcome');
  } else {
    if (a.rating !== null) errors.push('Unexpected rating');
    if (a.dontKnow) {
      if (a.correct || a.confidence !== null) errors.push('Invalid unknown outcome');
    } else if (!['duda', 'bastante', 'seguro'].includes(a.confidence ?? '')) errors.push('Invalid confidence');
  }
  return errors;
}
