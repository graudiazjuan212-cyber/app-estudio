import { questionConfig } from '../../config';
import type { Answer, Confidence } from '../../domain/study/index';

export function completionWarning(answer: Answer | null, confidence: Confidence | null): string {
  return [answer ? '' : questionConfig.missingAnswer, confidence ? '' : questionConfig.missingConfidence].filter(Boolean).join(' ');
}
