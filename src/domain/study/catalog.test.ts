import { expect, it } from 'vitest';
import { packVersions, relatedPack } from '../../../tests/fixtures/study/catalog.ts';
import { buildCatalog, evaluableIds } from './catalog.ts';

it('copies relaciona only when explicitly true, defaulting info and absent values to false', () => {
  const catalog = buildCatalog([relatedPack()], new Map());
  expect([...catalog.items.values()].map(item => [item.id, item.relaciona])).toEqual([
    ['i', false], ['t', true], ['f', false],
  ]);
});

it('uses only the highest chapter version regardless of input order', () => {
  const packs = packVersions();
  const catalog = buildCatalog(packs, new Map());
  expect(catalog).toEqual(buildCatalog([...packs].reverse(), new Map()));
  expect([...catalog.chapters.values()]).toEqual([{ id: 'c', subjectId: 's', numero: 2, blockIds: ['B2', 'B1'] }]);
  expect([...catalog.blocks.values()]).toEqual([
    { id: 'B2', chapterId: 'c', subjectId: 's', peso: 5, requiere: [], itemIds: ['i', 't'] },
    { id: 'B1', chapterId: 'c', subjectId: 's', peso: 3, requiere: ['B2'], itemIds: ['f'] },
  ]);
  expect([...catalog.items.keys()]).toEqual(['i', 't', 'f']);
  expect(catalog.items.has('v')).toBe(false);
  expect(catalog.blocks.has('old')).toBe(false);
});
it('keeps generations, info, archived items and package order while filtering evaluables', () => {
  const catalog = buildCatalog(packVersions(), new Map([['t', 2]]), new Set(['t', 'removed']));
  expect([...catalog.items.values()]).toEqual([
    { id: 'i', tipo: 'info', blockId: 'B2', itemGen: 1, archived: false, relaciona: false },
    { id: 't', tipo: 'test', blockId: 'B2', itemGen: 2, archived: true, relaciona: false },
    { id: 'f', tipo: 'flashcard', blockId: 'B1', itemGen: 1, archived: false, relaciona: false },
  ]);
  const blocks = [...catalog.blocks.values()];
  expect(blocks.map(block => evaluableIds(block, catalog))).toEqual([[], ['f']]);
  const active = buildCatalog(packVersions(), new Map());
  expect([...active.blocks.values()].map(block => evaluableIds(block, active))).toEqual([['t'], ['f']]);
});
it('builds multiple chapters and handles an absent catalog', () => {
  const packs = packVersions();
  const first = packs[1];
  if (!first) throw new Error('Missing fixture pack');
  const catalog = buildCatalog([...packs, { ...first, capitulo: { ...first.capitulo, id: 'c2' } }], new Map());
  expect([...catalog.chapters.keys()]).toEqual(['c', 'c2']);
  expect(catalog.items.has('v')).toBe(true);
  expect(buildCatalog([], new Map())).toEqual({ items: new Map(), blocks: new Map(), chapters: new Map() });
});
it.each([0, -1, 1.5, NaN])('rejects invalid current generation %s', itemGen => {
  expect(() => buildCatalog(packVersions(), new Map([['t', itemGen]]))).toThrow('Generación inválida');
});
it('does not mutate inputs or share mutable package arrays', () => {
  const packs = packVersions();
  const gens = new Map([['t', 2]]);
  const archivedIds = new Set(['t']);
  const before = structuredClone({ packs, gens, archivedIds });
  const catalog = buildCatalog(packs, gens, archivedIds);
  for (const block of catalog.blocks.values()) {
    block.requiere.push('other');
    block.itemIds.push('other');
  }
  expect({ packs, gens, archivedIds }).toEqual(before);
});
