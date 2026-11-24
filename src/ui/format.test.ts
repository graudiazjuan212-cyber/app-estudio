import { describe, expect, it } from 'vitest';
import { blockRequirementText, bytesToMegabytes, diffSummary, formatMinutes, formatStudyDay } from './format.ts';
import { byteCases, dayCases, diffCases, minuteCases } from '../../tests/fixtures/screen-format.ts';
describe('screen formatting', () => {
  it.each(dayCases)('formats day %s', (input, expected) => { expect(formatStudyDay(input)).toBe(expected); });
  it.each(minuteCases)('formats seconds %s', (input, expected) => { expect(formatMinutes(input)).toBe(expected); });
  it.each(byteCases)('formats bytes %s', (input, expected) => { expect(bytesToMegabytes(input)).toBe(expected); });
  it.each([
    [[], ''], [['Inicio'], '🔒 Bloqueado: primero domina «Inicio»'],
    [['Inicio', 'Final'], '🔒 Bloqueado: primero domina «Inicio», «Final»'],
  ] as [string[], string][])('formats requirements %j', (input, expected) => { expect(blockRequirementText(input)).toBe(expected); });
  it.each([
    [0, '2 preguntas nuevas, 12 conservadas, 1 archivada, 0 con tipo cambiado, 0 movidas'],
    [1, '1 pregunta nueva, 1 conservada, 0 archivadas, 0 con tipo cambiado, 1 movida'],
    [2, '0 preguntas nuevas, 0 conservadas, 2 archivadas, 0 con tipo cambiado, 0 movidas'],
  ] as const)('formats diff %s', (index, expected) => {
    const fixture = diffCases[index];
    expect(diffSummary({ ...fixture, newItems: [...fixture.newItems], keptItems: [...fixture.keptItems],
      archivedItems: [...fixture.archivedItems], typeChanged: [...fixture.typeChanged], movedItems: [...fixture.movedItems],
      removedBlocks: [...fixture.removedBlocks], newBlocks: [...fixture.newBlocks] })).toBe(expected);
  });
});
