import rows from './incremental-attempts.json';
import type { Attempt } from '../../../src/domain/study/index.ts';
import { changedBackup, requiredRow } from './backup.ts';
import { backupSchema } from '../../../src/data/backupSchema.ts';

export const incrementalTestConfig = {
  historyRows: 20000, targetMs: 150, maxMs: 400, timeoutMs: 30000,
  checkpoints: [5, 11, 12],
};
export function incrementalSequence(): Attempt[] {
  return JSON.parse(JSON.stringify(rows)) as Attempt[];
}
export function incrementalAttempt(patch: Partial<Attempt> = {}): Attempt {
  const base = backupSchema.parse(JSON.parse(changedBackup()) as unknown);
  return { ...requiredRow(base.data.attempts), attemptId: 'new', ...patch };
}
export function unrelatedHistory(): Attempt[] {
  const base = incrementalAttempt({ itemId: 'i4', blockId: 'b4', chapterId: 'c2' });
  return Array.from({ length: incrementalTestConfig.historyRows }, (_, index) => ({
    ...base, attemptId: `history-${String(index).padStart(5, '0')}`,
  }));
}
