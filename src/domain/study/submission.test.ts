import { describe, expect, it } from 'vitest';
import pack from '../../../tests/fixtures/packs/mat-ejemplo-c01.json';
import cases from '../../../tests/fixtures/submissions.json';
import { packSchema } from '../pack/index';
import { submissionOutcome } from './submission';
import type { Submission } from './submission';
const items = packSchema.parse(pack).bloques.flatMap(b => b.items);
describe('submission outcomes: nine types', () => {
  it.each(cases)('$id $label', row => {
    const item = required(items.find(i => i.id === row.id));
    expect(submissionOutcome(item, row.submission as Submission)).toMatchObject(row.expected);
  });
  it.each(['duda', 'bastante', 'seguro'] as const)('preserves %s', confidence => {
    expect(submissionOutcome(required(items.find(i => i.id === 'mat-i3')), {
      kind: 'answer', answer: { tipo: 'test', selected: 0 }, confidence,
    })).toEqual({ ok: true, correct: true, dontKnow: false, confidence, rating: null });
  });
  it('rejects malformed answer indices', () => {
    expect(submissionOutcome(required(items.find(i => i.id === 'mat-i3')), {
      kind: 'answer', answer: { tipo: 'test', selected: -1 }, confidence: 'duda',
    }).ok).toBe(false);
  });
});

function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("Faltan datos de la pregunta.");
  return value;
}
