import type { StudyDb } from './db.ts';
import type { ItemRow, ItemMetadataKey } from './schema.ts';

export function itemMetadataKey(row: ItemRow): ItemMetadataKey {
  return [row.subjectId, row.order, row.id, row.blockId, row.tipo, row.itemGen,
    Number(row.archived), Number(row.relaciona)];
}
/** Derived covering index: hooks also cover restore, bulkPut and direct updates. */
export function installItemMetadata(db: StudyDb): void {
  db.items.hook('creating', (_key, row) => { row.metadataKey = itemMetadataKey(row); });
  db.items.hook('updating', (changes: Partial<ItemRow>, _key, row) => ({
    metadataKey: itemMetadataKey({ ...row, ...changes }),
  }));
}
export async function readItemMetadata(db: StudyDb, subjectId?: string) {
  const keys = await (subjectId === undefined ? db.items.orderBy('metadataKey')
    : db.items.where('metadataKey').between([subjectId], [subjectId, []])).keys() as unknown as ItemMetadataKey[];
  const count = await (subjectId === undefined ? db.items
    : db.items.where('subjectId').equals(subjectId)).count();
  if (keys.length !== count) throw new Error('Faltan metadatos de preguntas. Reconstruye la caché antes de continuar.');
  return keys.map(([subject, order, id, blockId, tipo, itemGen, archived, relaciona]) => ({
    subjectId: subject, order, id, blockId, tipo, itemGen,
    archived: Boolean(archived), relaciona: Boolean(relaciona),
  }));
}
