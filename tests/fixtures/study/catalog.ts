import type { Catalog, CatalogBlock, CatalogChapter } from '../../../src/domain/study/catalog.ts';
import type { ItemType, Pack } from '../../../src/domain/pack/index.ts';
import { items } from './items.ts';

export function catalogFixture(count = 5, tipo: ItemType = 'test'): Catalog {
  const ids = Array.from({ length: count }, (_, i) => count === 100
    ? `j${String(i + 1).padStart(3, '0')}` : `${tipo === 'flashcard' ? 'f' : 'i'}${String(i + 1)}`);
  return { items: new Map(ids.map(id => [id, { id, tipo, blockId: 'B', itemGen: 1, archived: false, relaciona: false }])),
    blocks: new Map([['B', { id: 'B', chapterId: 'c', subjectId: 's', peso: 3, requiere: [], itemIds: ids }]]),
    chapters: new Map([['c', { id: 'c', subjectId: 's', numero: 1, blockIds: ['B'] }]]) };
}
export function fixtureBlock(catalog: Catalog, id = 'B'): CatalogBlock {
  const block = catalog.blocks.get(id);
  if (!block) throw new Error(`Missing fixture block ${id}`);
  return block;
}
export function fixtureChapter(catalog: Catalog): CatalogChapter {
  const chapter = catalog.chapters.get('c');
  if (!chapter) throw new Error('Missing fixture chapter');
  return chapter;
}
export function weightedCatalog(): Catalog {
  const catalog: Catalog = { items: new Map(), blocks: new Map(),
    chapters: new Map([['c', { id: 'c', subjectId: 's', numero: 1, blockIds: ['B1', 'B2', 'B3'] }]]) };
  for (const [id, peso, requiere] of [
    ['B1', 1, []], ['B2', 3, ['B1']], ['B3', 5, ['B2']],
  ] satisfies [string, 1 | 3 | 5, string[]][]) {
    const itemId = `${id}-item`;
    catalog.items.set(itemId, { id: itemId, tipo: 'test', blockId: id, itemGen: 1, archived: false, relaciona: false });
    catalog.blocks.set(id, { id, peso, requiere, itemIds: [itemId], chapterId: 'c', subjectId: 's' });
  }
  return catalog;
}
export function packVersions(): Pack[] {
  const first: Pack = { schema: 'estudio-pack/1', asignatura: { id: 's', nombre: 'Asignatura' },
    capitulo: { id: 'c', numero: 2, titulo: 'Capítulo' }, version: 1, generado: '2026-11-01',
    bloques: [{ id: 'old', titulo: 'Anterior', peso: 1, requiere: [], items: [items.vf] }] };
  const last: Pack = { ...first, version: 3, bloques: [
    { id: 'B2', titulo: 'Segundo', peso: 5, requiere: [], items: [items.info, items.test] },
    { id: 'B1', titulo: 'Primero', peso: 3, requiere: ['B2'], items: [items.flashcard] },
  ] };
  return [last, first, { ...first, version: 2 }];
}
export function relatedPack(): Pack {
  return { schema: 'estudio-pack/1', asignatura: { id: 's', nombre: 'Asignatura' },
    capitulo: { id: 'c', numero: 1, titulo: 'Capítulo' }, version: 1, generado: '2026-11-01',
    bloques: [{ id: 'B', titulo: 'Bloque', peso: 1, requiere: [], items: [
      items.info, { ...items.test, relaciona: true }, { ...items.flashcard, relaciona: false },
    ] }] };
}
