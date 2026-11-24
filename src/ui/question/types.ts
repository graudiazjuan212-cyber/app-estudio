import type { Item } from '../../domain/pack/index.ts';
import type { Answer, Submission } from '../../domain/study/index.ts';
export interface QuestionFeedback { correct: boolean | null }
export interface QuestionProps {
  item: Item; seed: number; onSubmit: (s: Submission) => Promise<void>;
  feedback: QuestionFeedback | null; error: string | null; onNext: () => void;
}
export interface InputProps {
  item: Item; seed: number; disabled: boolean; feedback: QuestionFeedback | null;
  onChange: (answer: Answer | null) => void;
}
