import type { Item, Pack } from '../pack/index.ts';

export interface ProgressMeta {
  chapterTitles: Map<string, string>;
  blockTitles: Map<string, string>;
  items: Map<string, Item>;
  archivedBlockIds: Set<string>;
}

export function progressMetaFromPacks(packs: Pack[], archivedBlockIds = new Set<string>()): ProgressMeta {
  const latest = new Map<string, Pack>();
  for (const pack of packs) {
    const previous = latest.get(pack.capitulo.id);
    if (!previous || pack.version > previous.version) latest.set(pack.capitulo.id, pack);
  }
  const meta: ProgressMeta = {
    chapterTitles: new Map(), blockTitles: new Map(), items: new Map(),
    archivedBlockIds: new Set(archivedBlockIds),
  };
  for (const pack of latest.values()) {
    meta.chapterTitles.set(pack.capitulo.id, pack.capitulo.titulo);
    for (const block of pack.bloques) {
      meta.blockTitles.set(block.id, block.titulo);
      for (const item of block.items) meta.items.set(item.id, item);
    }
  }
  return meta;
}
