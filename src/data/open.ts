import { Dexie } from 'dexie';
import { dataConfig, studyConfig } from '../config.ts';
import { defineDb } from './db.ts';
import type { StudyDb } from './db.ts';
import { studyVersions } from './schema.ts';
import type { DbVersion } from './schema.ts';

export interface OpenHandlers { onVersionChange?: () => void; onBlocked?: () => void }
export type OpenResult = { ok: true; db: StudyDb } | {
  ok: false; reason: 'version-newer' | 'blocked' | 'migration-failed' | 'unavailable'; message: string;
};
function dynamicDb(name: string): Dexie {
  return new Dexie(name, { indexedDB: globalThis.indexedDB, IDBKeyRange: globalThis.IDBKeyRange });
}

/** Separate database: failure here must never start the schema upgrade. */
export async function savePremigration(name: string, source: Dexie): Promise<void> {
  const dump = await source.transaction('r', source.tables, async () => {
    const rows: Record<string, unknown[]> = {};
    for (const table of source.tables) rows[table.name] = await table.toArray() as unknown[];
    return JSON.stringify(rows);
  });
  const prefix = `${name}-premigration-v`;
  const copy = dynamicDb(`${prefix}${String(source.verno)}`);
  copy.version(1).stores({ backup: 'key' });
  try {
    await copy.open();
    await copy.table<{ key: string; json: string }, string>('backup').put({ key: 'dump', json: dump });
  } finally { copy.close(); }
  const names = (await Dexie.getDatabaseNames()).filter(n => n.startsWith(prefix))
    .sort((a, b) => Number(b.slice(prefix.length)) - Number(a.slice(prefix.length)));
  for (const old of names.slice(dataConfig.premigrationKeep)) await Dexie.delete(old);
}

export async function openStudyDb(name: string, handlers: OpenHandlers = {}, versions: DbVersion[] = studyVersions): Promise<OpenResult> {
  let db: StudyDb | undefined;
  let source: Dexie | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let migrating = false;
  let timedOut = false;
  try {
    if (typeof globalThis.indexedDB === 'undefined') throw new Error('IndexedDB no disponible.');
    if (versions.length === 0) throw new Error('No hay versiones de esquema.');
    const target = Math.max(...versions.map(v => v.version));
    // exists() uses Dexie's cached dependencies; use a dynamic connection with explicit dependencies instead.
    source = dynamicDb(name);
    let exists = true;
    try { await source.open(); }
    catch (error) {
      if (error instanceof Error && error.name === 'NoSuchDatabaseError') exists = false;
      else throw error;
    }
    if (exists && source.verno > target) {
      return { ok: false, reason: 'version-newer', message: 'Recarga para actualizar' };
    }
    if (exists && source.verno < target) {
      migrating = true;
      // ADR-024: another tab may save answers between this snapshot and the new version opening.
      // Those answers remain in the database but are absent from the recovery snapshot.
      // Accepted risk while no real migrations exist and future migrations remain additive.
      await savePremigration(name, source);
    }
    source.close();
    db = defineDb(name, versions);
    const connection = db;
    db.on('versionchange', () => {
      connection.close({ disableAutoOpen: true });
      handlers.onVersionChange?.();
      return false;
    });
    db.on('populate', tx => {
      void tx.table('meta').bulkPut([
        { key: 'schemaVersion', value: target },
        { key: 'schedulerVersion', value: studyConfig.schedulerVersion },
      ]);
    });
    let timeout: (result: OpenResult) => void = () => undefined;
    const blocked = new Promise<OpenResult>(resolve => { timeout = resolve; });
    db.on('blocked', () => {
      handlers.onBlocked?.();
      timer ??= setTimeout(() => {
        timedOut = true;
        connection.close();
        timeout({ ok: false, reason: 'blocked', message: 'Cierra las otras pestañas para actualizar.' });
      }, dataConfig.blockedTimeoutMs);
    });
    const opening = db.open().then<OpenResult>(() => {
      if (timedOut) {
        connection.close();
        return { ok: false, reason: 'blocked', message: 'Cierra las otras pestañas para actualizar.' };
      }
      return { ok: true, db: connection };
    });
    return await Promise.race([opening, blocked]);
  } catch (error) {
    db?.close();
    const newer = error instanceof Error && error.name === 'VersionError';
    return { ok: false, reason: newer ? 'version-newer' : migrating ? 'migration-failed' : 'unavailable',
      message: newer ? 'Recarga para actualizar' : migrating ? 'No se ha podido migrar la base de datos.' : 'IndexedDB no está disponible.' };
  } finally {
    source?.close();
    if (timer !== undefined) clearTimeout(timer);
  }
}
