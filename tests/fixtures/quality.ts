export const qualityExpected = {
  counts: { subjects: 1, blocks: 2, items: 40, attempts: 200, packs: 1, sessions: 60 },
  types: ['info', 'flashcard', 'test', 'multi', 'vf', 'ordenar', 'emparejar', 'huecos', 'error'],
  states: ['★ Graduado', '✓ Dominado', '◐ En curso', '○ Pendiente'],
  // Fixed history: five clean days graduate b0; two master b1; one starts b2.
  blockDays: [
    ['2026-11-20', '2026-11-21', '2026-11-22', '2026-11-23', '2026-11-24'],
    ['2026-11-22', '2026-11-23'], ['2026-11-23'], [], [],
  ],
};
