import type { BlockDayProgress, BlockStatus } from '../domain/study/index.ts';
import type { SessionRow } from './schema.ts';

export interface HomeView {
  subjects: { id: string; nombre: string; percent: number; dueToday: number; lastStudyDay: string | null }[];
  streak: number; secondsToday: number; dailyGoalMinutes: number; goalReached: boolean;
  backupReminder: boolean; openSession: Pick<SessionRow, 'id' | 'subjectId' | 'kind'> | null; hasData: boolean;
}
export interface SubjectView {
  id: string; nombre: string; percent: number;
  chapters: { id: string; numero: number; titulo: string; percent: number; hasEvaluables: boolean;
    blocks: { id: string; titulo: string; peso: number; status: BlockStatus; locked: boolean;
      evaluables: number; requiere: string[]; dayProgress: BlockDayProgress | null }[] }[];
}
