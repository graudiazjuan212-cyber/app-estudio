import type { ItemType, Pack } from '../pack/index.ts';
import { studyConfig } from '../../config.ts';

export interface CatalogItem {
  id: string; tipo: ItemType; blockId: string; itemGen: number; archived: boolean;
}
export interface CatalogBlock {
  id: string; chapterId: string; subjectId: string; peso: 1 | 3 | 5;
  requiere: string[]; itemIds: string[];
}
export interface CatalogChapter {
  id: string; subjectId: string; numero: number; blockIds: string[];
}
export interface Catalog {
  items: Map<string, CatalogItem>; blocks: Map<string, CatalogBlock>;
  chapters: Map<string, CatalogChapter>;
}

export function buildCatalog(packs: Pack[], gens: Map<string, number>, archivedIds = new Set<string>()): Catalog {
  const latest = new Map<string, Pack>();
  for (const pack of packs) {
    const previous = latest.get(pack.capitulo.id);
    if (!previous || pack.version > previous.version) latest.set(pack.capitulo.id, pack);
  }
  const catalog: Catalog = { items: new Map(), blocks: new Map(), chapters: new Map() };
  for (const pack of latest.values()) {
    const chapterId = pack.capitulo.id;
    const subjectId = pack.asignatura.id;
    catalog.chapters.set(chapterId, { id: chapterId, subjectId, numero: pack.capitulo.numero,
      blockIds: pack.bloques.map(block => block.id) });
    for (const block of pack.bloques) {
      catalog.blocks.set(block.id, { id: block.id, chapterId, subjectId, peso: block.peso,
        requiere: [...block.requiere], itemIds: block.items.map(item => item.id) });
      for (const item of block.items) {
        const itemGen = gens.get(item.id) ?? studyConfig.initialItemGeneration;
        if (!Number.isInteger(itemGen) || itemGen < studyConfig.initialItemGeneration)
          throw new Error(`Generación inválida para el ítem ${item.id}.`);
        catalog.items.set(item.id, { id: item.id, tipo: item.tipo, blockId: block.id,
          itemGen, archived: archivedIds.has(item.id) });
      }
    }
  }
  return catalog;
}

export function evaluableIds(block: CatalogBlock, catalog: Catalog): string[] {
  return block.itemIds.filter(id => {
    const item = catalog.items.get(id);
    return item !== undefined && item.tipo !== 'info' && !item.archived;
  });
}
