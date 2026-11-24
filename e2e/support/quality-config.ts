export const qualityConfig = {
  now: '2026-11-24T10:00:00.000Z', start: '2026-09-25T10:00:00.000Z',
  dayMs: 86400000, days: 60, durationMs: 15000, seed: 42, failureEvery: 5,
  large: { subjects: 3, blocks: 10, items: 200, attempts: 20000 },
  small: { subjects: 1, blocks: 2, items: 20, attempts: 200 },
  subjectAttempts: [7000, 6500, 6500],
  tolerance: 3, testMs: 240000, sessionMs: 100,
  budgets: { restore: 20000, home: 1500, subject: 1500, study: 1500,
    answer: 500, backup: 10000, progress: 3000, pack: 6000 },
  screenshotDirectory: 'docs/results/capturas',
  tags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
  forbidden: /\b(?:Loading|Error|Retry|Next|Submit)\b/,
  targetSize: 44, focusWidth: 3, focusContrast: 3,
} as const;
