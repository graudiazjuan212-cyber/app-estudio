export const markerCases = [
  ['{{1}} FROM t WHERE {{2}} > 3', '**[1]** FROM t WHERE **[2]** > 3'],
  ['no markers', 'no markers'], ['{{x}} {{0}}', '{{x}} **[0]**'],
];
export const placeCases = [
  { order: [], step: 2, expected: [2] }, { order: [2], step: 2, expected: [2] },
];
export const unplaceCases = [
  { order: [2, 0], step: 2, expected: [0] }, { order: [0], step: 2, expected: [0] },
];
export const pairCases = [
  { pairs: [], left: 0, right: 1, expected: [[0, 1]] },
  { pairs: [[0, 1]], left: 0, right: 1, expected: [] },
  { pairs: [[0, 1]], left: 0, right: 2, expected: [[0, 2]] },
  { pairs: [[0, 1]], left: 2, right: 1, expected: [[2, 1]] },
  { pairs: [[0, 1], [2, 0]], left: 0, right: 0, expected: [[0, 0]] },
  { pairs: [[0, 1]], left: 2, right: 0, expected: [[0, 1], [2, 0]] },
];
export const indexCases: [number, number | undefined][] = [[0, 2], [1, 0], [2, 1], [3, undefined]];
