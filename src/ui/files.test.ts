import { expect, it } from 'vitest';
import { chooseDelivery, deliveryMessage } from './files.ts';
import { choiceCases, messageCases } from '../../tests/fixtures/progress-delivery.ts';

it.each(choiceCases)('chooses delivery when canShareFile is %s', (canShareFile, expected) => {
  expect(chooseDelivery({ canShareFile })).toBe(expected);
});
it.each(messageCases)('reports %s without claiming a cancelled export succeeded', (delivery, expected) => {
  expect(deliveryMessage('progreso_ejmat_2026-12-02.json', delivery)).toBe(expected);
});
