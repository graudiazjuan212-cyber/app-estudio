import { expect, it } from 'vitest';
import { completionWarning } from './completion';
import { completeAnswers, missingAnswer, missingConfidence } from '../../../tests/fixtures/question-completion';
it.each(completeAnswers)('$tipo requires both answer and confidence', answer => {
  expect(completionWarning(null, null)).toBe(`${missingAnswer} ${missingConfidence}`);
  expect(completionWarning(answer, null)).toBe(missingConfidence);
  expect(completionWarning(null, 'seguro')).toBe(missingAnswer);
  expect(completionWarning(answer, 'seguro')).toBe('');
});
