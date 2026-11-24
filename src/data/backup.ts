import { z } from 'zod';
import { dataConfig, studyConfig } from '../config.ts';
import { normalizeJson } from '../domain/pack/index.ts';
import type { StudyDb } from './db.ts';
import type { DataContext } from './cache.ts';
import { backupSchema } from './backupSchema.ts';
import { validateBackupIntegrity } from './backupIntegrity.ts';
import { migrateBackup } from './backupMigrations.ts';
import type { BackupMigration } from './backupMigrations.ts';
import { backupCounts, backupJson, deriveBackup, readBackup } from './backupData.ts';

export type RestoreResult = { status: 'restored'; counts: Record<string, number>; snapshotId: number }
  | { status: 'rejected'; message: string };

export async function exportBackup(db: StudyDb, ctx: { now: string }): Promise<{
  json: string; fileName: string; counts: Record<string, number>;
}> {
  return db.transaction('r', db.tables, async () => {
    const backup = await readBackup(db, ctx.now);
    return { json: backupJson(backup), fileName: `backup_estudio_${new Date(ctx.now).toISOString().split('T')[0] ?? ''}.json`,
      counts: backupCounts(backup.data) };
  });
}

export async function restoreBackup(db: StudyDb, text: string, ctx: DataContext,
  migrations: BackupMigration[] = []): Promise<RestoreResult> {
  try {
    const raw = normalizeJson(JSON.parse(text) as unknown);
    const header = z.object({ schema: z.string(), dbVersion: z.int().nonnegative() }).safeParse(raw);
    if (!header.success || header.data.schema !== dataConfig.backupSchema)
      return { status: 'rejected', message: 'No es una copia de esta app' };
    if (header.data.dbVersion > db.verno)
      return { status: 'rejected', message: 'Actualiza la app antes de restaurar esta copia' };
    const backup = backupSchema.parse(normalizeJson(migrateBackup(raw, header.data.dbVersion, db.verno, migrations)));
    if (backup.dbVersion !== db.verno) throw new Error('La migración no produjo la versión actual.');
    if (backup.schedulerVersion > studyConfig.schedulerVersion)
      return { status: 'rejected', message: 'Actualiza la app antes de restaurar esta copia' };
    if (backup.schedulerVersion < studyConfig.schedulerVersion)
      return { status: 'rejected', message: 'Esta copia usa un planificador antiguo y todavía no se puede restaurar' };
    const errors = validateBackupIntegrity(backup.data);
    if (errors.length) return { status: 'rejected', message: errors.join('; ') };
    // Derive with the current scheduler only after verifying the backup uses that same version.
    const derived = deriveBackup(backup.data, ctx);
    const counts = backupCounts(backup.data);
    return await db.transaction('rw', db.tables, async () => {
      const previous = await readBackup(db, ctx.now);
      const snapshotId = await db.snapshots.add({ createdAt: ctx.now, reason: 'before-restore', json: backupJson(previous) });
      const old = await db.snapshots.orderBy('id').reverse().offset(dataConfig.snapshotKeep).primaryKeys();
      await db.snapshots.bulkDelete(old);
      const data = backup.data;
      for (const table of [db.subjects, db.chapters, db.blocks, db.items, db.packs, db.attempts,
        db.sessions, db.settings, db.itemState, db.blockState, ...db.tables.filter(t => t.name === 'practiceAttempts')]) await table.clear();
      await db.subjects.bulkAdd(data.subjects);
      await db.chapters.bulkAdd(data.chapters);
      await db.blocks.bulkAdd(data.blocks);
      await db.items.bulkAdd(data.items);
      await db.packs.bulkAdd(data.packs);
      await db.attempts.bulkAdd(data.attempts);
      if (db.tables.some(t => t.name === 'practiceAttempts')) await db.practiceAttempts.bulkAdd(data.practiceAttempts ?? []);
      await db.sessions.bulkAdd(data.sessions);
      await db.settings.bulkAdd(data.settings);
      await db.itemState.bulkAdd(derived.items);
      await db.blockState.bulkAdd(derived.blocks);
      await db.meta.bulkPut([{ key: 'schemaVersion', value: db.verno },
        { key: 'schedulerVersion', value: backup.schedulerVersion }]);
      return { status: 'restored', counts, snapshotId };
    });
  } catch (error) {
    return { status: 'rejected', message: error instanceof z.ZodError
      ? 'La copia contiene datos inválidos o referencias inexistentes.'
      : 'No se ha podido restaurar la copia. Comprueba el archivo y el espacio disponible; se conserva el estado anterior.' };
  }
}

export async function undoRestore(db: StudyDb, ctx: DataContext): Promise<RestoreResult> {
  try {
    const latest = await db.snapshots.orderBy('id').last();
    return latest ? await restoreBackup(db, latest.json, ctx)
      : { status: 'rejected', message: 'No hay nada que deshacer' };
  } catch {
    return { status: 'rejected', message: 'No se ha podido leer la copia para deshacer.' };
  }
}

export async function listSnapshots(db: StudyDb): Promise<{
  id: number; createdAt: string; reason: string; counts: Record<string, number>;
}[]> {
  return (await db.snapshots.orderBy('id').reverse().toArray()).map(row => {
    if (row.id === undefined) throw new Error('La copia de seguridad no tiene identificador.');
    const backup = backupSchema.parse(normalizeJson(JSON.parse(row.json) as unknown));
    return { id: row.id, createdAt: row.createdAt, reason: row.reason, counts: backupCounts(backup.data) };
  });
}
