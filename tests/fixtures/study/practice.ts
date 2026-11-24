import type { PracticeWeightInput, PracticeInput, PracticeAttempt } from '../../../src/domain/study/practice';
import { sessionInput, sessionAttempt } from './session-catalog';
export const weights: [PracticeWeightInput, number][] = [
  [{}, 1], [{ blindSpot: true }, 9], [{ recentFail: true }, 5], [{ lowConfidence: true }, 4],
  [{ blindSpot: true, recentFail: true }, 13], [{ practiceFailures: 1 }, 4], [{ practiceFailures: 2 }, 7],
  [{ practiceFailures: 3 }, 10], [{ practiceFailures: 5 }, 10], [{ mastered: true }, 0.25],
  [{ mastered: true, blindSpot: true }, 2.25],
];
export const failureRuns: [boolean[], number][] = [[[false, false, true], 0], [[true, false, false], 2], [[false, true, false], 1], [[], 0]];
export function practiceHistory(outcomes: boolean[], itemId = 'a1'): PracticeAttempt[] {
  return outcomes.map((correct, i) => {
    const { schedulerVersion, ...a } = sessionAttempt(itemId, '2026-11-09', {
      attemptId: `p${String(i)}`, at: `2026-11-09T10:00:0${String(i)}.000Z`, correct,
    });
    void schedulerVersion; return a;
  });
}
export function practiceInput(): PracticeInput {
  return { ...sessionInput(0.1), attempts: ['a1', 'a2', 'a3', 'a4', 'a5'].map(id =>
    sessionAttempt(id, '2026-11-09', { confidence: 'seguro' })), practiceAttempts: [] };
}
export function weightedInput(): PracticeInput {
  const input = practiceInput();
  input.catalog.blocks.set('C', { id: 'C', subjectId: 'S', chapterId: 'c1', peso: 1, requiere: [], itemIds: ['a5'] });
  const a5 = input.catalog.items.get('a5'); const block = input.derived.blocks.get('A');
  if (!a5 || !block) throw new Error('Missing fixture');
  input.catalog.items.set('a5', { ...a5, blockId: 'C' });
  input.derived.blocks.set('C', { ...block, blockId: 'C', status: 'dominado' });
  input.derived.blindSpots = [{ itemId: 'a1', since: '2026-11-09' }];
  input.attempts = input.attempts.map(a => ({ ...a, correct: a.itemId !== 'a2', confidence: a.itemId === 'a3' ? 'duda' : 'seguro' }));
  return input;
}
