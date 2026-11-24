import { expect, it } from 'vitest';
import { diffPack } from './diff.ts';
import { fixture } from './test-helpers.ts';

it('compares the fixed version 2 including unchanged info items', () => {
  expect(diffPack(fixture(), fixture('mat-ejemplo-c01-v2'))).toEqual({
    newItems: ['mat-i15'],
    keptItems: ['mat-i1', 'mat-i3', 'mat-i4', 'mat-i6', 'mat-i7', 'mat-i8', 'mat-i9', 'mat-i11', 'mat-i12', 'mat-i13', 'mat-i14', 'mat-i10'],
    archivedItems: ['mat-i5'], typeChanged: [{ id: 'mat-i2', from: 'flashcard', to: 'vf' }],
    movedItems: [{ id: 'mat-i10', fromBlock: 'mat-b2', toBlock: 'mat-b3' }],
    removedBlocks: [], newBlocks: [], versionRelation: 'newer',
  });
});
it('treats every item and block as new on first import', () => {
  const result = diffPack(null, fixture());
  expect(result).toEqual({
    newItems: ['mat-i1', 'mat-i2', 'mat-i3', 'mat-i4', 'mat-i5', 'mat-i6', 'mat-i7', 'mat-i8', 'mat-i9', 'mat-i10', 'mat-i11', 'mat-i12', 'mat-i13', 'mat-i14'],
    keptItems: [], archivedItems: [], typeChanged: [], movedItems: [],
    removedBlocks: [], newBlocks: ['mat-b1', 'mat-b2', 'mat-b3'], versionRelation: 'first',
  });
});
it('detects reappearing items as new', () => {
  expect(diffPack(fixture('mat-ejemplo-c01-v2'), fixture()).newItems).toEqual(['mat-i5']);
});
it('detects removed and new blocks deterministically', () => {
  const p = fixture();
  const b = p.bloques[1];
  if (!b) throw new Error('Missing block');
  b.id = 'replacement';
  const result = diffPack(fixture(), p);
  expect(result.removedBlocks).toEqual(['mat-b2']);
  expect(result.newBlocks).toEqual(['replacement']);
  expect(result.movedItems.map(i => i.id)).toEqual(['mat-i6', 'mat-i7', 'mat-i8', 'mat-i9', 'mat-i10']);
});
it.each([[1, 'same'], [0, 'older'], [2, 'newer']] as const)('compares version %i', (version, relation) => {
  const p = fixture();
  p.version = version;
  expect(diffPack(fixture(), p).versionRelation).toBe(relation);
});
it.each(['capitulo', 'asignatura'] as const)('rejects a different %s', field => {
  const p = fixture();
  p[field].id = 'other';
  expect(() => diffPack(fixture(), p)).toThrow('distintas asignaturas o capítulos');
});
it('does not mutate either input', () => {
  const p = fixture();
  const n = fixture('mat-ejemplo-c01-v2');
  const before = JSON.stringify([p, n]);
  diffPack(p, n);
  expect(JSON.stringify([p, n])).toBe(before);
});
