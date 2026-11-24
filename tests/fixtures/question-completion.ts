import type { Answer } from '../../src/domain/study/index';
export const completeAnswers: Answer[] = [
  { tipo: 'test', selected: 0 }, { tipo: 'multi', selected: [0, 1] }, { tipo: 'vf', value: false },
  { tipo: 'ordenar', order: [0, 1, 2] }, { tipo: 'emparejar', pairs: [[0, 0], [1, 1], [2, 2]] },
  { tipo: 'huecos', chosen: [0] }, { tipo: 'error', step: 0 },
];
export const missingAnswer = 'Falta tu respuesta: elige o completa la respuesta antes de comprobar.';
export const missingConfidence = 'Falta indicar tu seguridad: Duda, Bastante seguro o Seguro.';
