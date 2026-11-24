import { studyConfig } from '../config.ts';
import { diffPack, validatePackText } from '../domain/pack/index.ts';
import type { Pack, PackDiff, PackError, PackWarning } from '../domain/pack/index.ts';
import { rebuildFromAttempts, studyDay } from '../domain/study/index.ts';
import type { StudyDb } from './db.ts';
import type { ItemRow } from './schema.ts';
import { loadCatalog } from './catalog.ts';

export interface ImportContext { now: string; tz: string; confirmOlder?: boolean }
export type ImportResult = { status: 'rejected'; errors: PackError[] }
  | { status: 'already-imported' }
  | { status: 'needs-confirmation'; reason: 'older-version'; current: number; incoming: number }
  | { status: 'imported'; warnings: PackWarning[]; diff: PackDiff };
function rejected(message: string): ImportResult { return { status: 'rejected', errors: [{ path: '', message }] }; }
function storedPack(text: string): Pack {
  const result = validatePackText(text);
  if (!result.ok) throw new Error('El paquete guardado no se entiende; no se ha modificado.');
  return result.pack;
}
function packKey(pack: Pack): string {
  return `${pack.asignatura.id}|${pack.capitulo.id}|${String(pack.version)}`;
}
export async function importPackText(db: StudyDb, text: string, ctx: ImportContext): Promise<ImportResult> {
  const parsed = validatePackText(text);
  if (!parsed.ok) return { status: 'rejected', errors: parsed.errors };
  const { pack, warnings } = parsed;
  return db.transaction('rw', [db.subjects, db.chapters, db.blocks, db.items, db.packs,
    db.attempts, db.itemState, db.blockState, db.meta], async (): Promise<ImportResult> => {
    const subjectId = pack.asignatura.id;
    const chapterId = pack.capitulo.id;
    const ids = new Set([chapterId, ...pack.bloques.flatMap(b => [b.id, ...b.items.map(i => i.id)])]);
    for (const table of [db.chapters, db.blocks, db.items]) {
      for (const row of await table.toArray()) {
        if (ids.has(row.id) && row.subjectId !== subjectId)
          return rejected(`El id \`${row.id}\` ya lo usa la asignatura \`${row.subjectId}\`.`);
        if (ids.has(row.id) && 'chapterId' in row && row.chapterId !== chapterId)
          return rejected(`El id \`${row.id}\` ya lo usa otro capítulo de esta asignatura.`);
      }
    }
    const chapter = await db.chapters.get(chapterId);
    const previousRow = chapter ? await db.packs.get(`${subjectId}|${chapterId}|${String(chapter.version)}`) : undefined;
    const previous = previousRow ? storedPack(previousRow.json) : null;
    const sameVersion = await db.packs.get(packKey(pack));
    if (sameVersion && JSON.stringify(storedPack(sameVersion.json)) !== JSON.stringify(pack))
      return rejected(`Ya existe la versión ${String(pack.version)} de este capítulo con otro contenido; sube la versión.`);
    if (chapter?.version === pack.version && sameVersion) return { status: 'already-imported' };
    if (chapter && pack.version < chapter.version && ctx.confirmOlder !== true)
      return { status: 'needs-confirmation', reason: 'older-version', current: chapter.version, incoming: pack.version };
    const oldItems = await db.items.where('chapterId').equals(chapterId).toArray();
    const oldById = new Map(oldItems.map(i => [i.id, i]));
    const oldBlocks = await db.blocks.where('chapterId').equals(chapterId).toArray();
    const blockIds = new Set(pack.bloques.map(b => b.id));
    const items: ItemRow[] = pack.bloques.flatMap(block => block.items.map((item, order) => {
      const old = oldById.get(item.id);
      return { id: item.id, subjectId, chapterId, blockId: block.id, tipo: item.tipo,
        itemGen: old ? old.itemGen + (old.tipo === item.tipo ? 0 : 1) : studyConfig.initialItemGeneration,
        archived: false, relaciona: 'relaciona' in item && item.relaciona === true, order, data: item };
    }));
    const itemIds = new Set(items.map(i => i.id));
    await db.subjects.put(pack.asignatura);
    await db.chapters.put({ ...pack.capitulo, subjectId, version: pack.version });
    await db.packs.put({ key: packKey(pack), subjectId, chapterId, version: pack.version, importedAt: ctx.now, json: text });
    await db.blocks.bulkPut([
      ...oldBlocks.filter(b => !blockIds.has(b.id)).map(b => ({ ...b, archived: true })),
      ...pack.bloques.map((b, order) => ({ id: b.id, titulo: b.titulo, peso: b.peso,
        requiere: b.requiere, subjectId, chapterId, order, archived: false })),
    ]);
    await db.items.bulkPut([...oldItems.filter(i => !itemIds.has(i.id)).map(i => ({ ...i, archived: true })), ...items]);
    for (const item of items) {
      const old = oldById.get(item.id);
      if (old && old.tipo !== item.tipo) await db.itemState.delete(item.id);
    }
    const catalog = await loadCatalog(db, subjectId);
    const derived = rebuildFromAttempts(await db.attempts.where('subjectId').equals(subjectId).toArray(),
      catalog, studyDay(ctx.now, ctx.tz));
    await db.itemState.bulkPut([...derived.items.values()].filter(i => itemIds.has(i.itemId)));
    await db.blockState.bulkPut([...derived.blocks.values()].map(s => ({ ...s, subjectId })));
    return { status: 'imported', warnings, diff: diffPack(previous, pack) };
  });
}
