export const dayCases = [
  ['2026-11-24', 'martes, 24 de noviembre de 2026'],
  ['', 'Aún no has estudiado'], [null, 'Aún no has estudiado'],
  ['2026-02-30', 'Aún no has estudiado'], ['basura', 'Aún no has estudiado'],
] as const;
export const minuteCases = [[0, '0'], [1, '0'], [2, '0'], [60, '1'], [120, '2'], [-1, '0'], [NaN, '0']] as const;
export const byteCases = [[null, '—'], [-1, '—'], [NaN, '—'], [0, '0.0'], [1048576, '1.0'], [2097152, '2.0']] as const;
export const diffCases = [
  { newItems: ['a', 'b'], keptItems: ['c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n'], archivedItems: ['o'], typeChanged: [], movedItems: [], removedBlocks: [], newBlocks: [], versionRelation: 'newer' },
  { newItems: ['a'], keptItems: ['b'], archivedItems: [], typeChanged: [], movedItems: [{ id: 'b', fromBlock: 'x', toBlock: 'y' }], removedBlocks: [], newBlocks: [], versionRelation: 'newer' },
  { newItems: [], keptItems: [], archivedItems: ['a', 'b'], typeChanged: [], movedItems: [], removedBlocks: [], newBlocks: [], versionRelation: 'newer' },
] as const;
