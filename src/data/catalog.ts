import type { Catalog } from '../domain/study/index.ts';
import type { StudyDb } from './db.ts';

export async function loadCatalog(db: StudyDb, subjectId?: string): Promise<Catalog> {
  return db.transaction('r', [db.items, db.blocks, db.chapters], async () => {
    const chapters = await db.chapters.toArray();
    const blocks = (await db.blocks.toArray()).sort((a, b) => a.order - b.order);
    const items = (await db.items.toArray()).sort((a, b) => a.order - b.order);
    const catalog: Catalog = { items: new Map(), blocks: new Map(), chapters: new Map() };
    for (const chapter of chapters) {
      if (subjectId !== undefined && chapter.subjectId !== subjectId) continue;
      catalog.chapters.set(chapter.id, { id: chapter.id, subjectId: chapter.subjectId,
        numero: chapter.numero, blockIds: blocks.filter(b => b.chapterId === chapter.id).map(b => b.id) });
    }
    for (const block of blocks) {
      if (!catalog.chapters.has(block.chapterId)) continue;
      catalog.blocks.set(block.id, { ...block, itemIds: items.filter(i => i.blockId === block.id).map(i => i.id) });
    }
    for (const item of items) {
      if (catalog.blocks.has(item.blockId)) catalog.items.set(item.id, { ...item });
    }
    return catalog;
  });
}
