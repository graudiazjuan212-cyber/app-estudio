import type { Catalog } from '../domain/study/index.ts';
import { readItemMetadata } from './itemMetadata.ts';
import type { StudyDb } from './db.ts';

export async function loadMetadataCatalog(db: StudyDb, subjectId?: string): Promise<Catalog> {
  return db.transaction('r', [db.items, db.blocks, db.chapters], async () => {
    const chapters = await (subjectId === undefined ? db.chapters : db.chapters.where('subjectId').equals(subjectId)).toArray();
    const blocks = (await (subjectId === undefined ? db.blocks : db.blocks.where('subjectId').equals(subjectId)).toArray()).sort((a, b) => a.order - b.order);
    const items = (await readItemMetadata(db, subjectId)).sort((a, b) => a.order - b.order);
    const catalog: Catalog = { items: new Map(), blocks: new Map(), chapters: new Map() };
    for (const chapter of chapters) {
      if (subjectId !== undefined && chapter.subjectId !== subjectId) continue;
      catalog.chapters.set(chapter.id, { id: chapter.id, subjectId: chapter.subjectId,
        numero: chapter.numero, blockIds: blocks.filter(b => b.chapterId === chapter.id).map(b => b.id) });
    }
    for (const block of blocks) {
      if (!catalog.chapters.has(block.chapterId)) continue;
      catalog.blocks.set(block.id, { id: block.id, subjectId: block.subjectId, chapterId: block.chapterId,
        peso: block.peso, requiere: [...block.requiere],
        itemIds: items.filter(i => i.blockId === block.id).map(i => i.id) });
    }
    for (const item of items) {
      if (catalog.blocks.has(item.blockId)) catalog.items.set(item.id, {
        id: item.id, tipo: item.tipo, blockId: item.blockId, itemGen: item.itemGen,
        archived: item.archived, relaciona: item.relaciona,
      });
    }
    return catalog;
  });
}

export async function loadCatalog(db: StudyDb, subjectId?: string): Promise<Catalog> {
  return loadMetadataCatalog(db, subjectId);
}
