export interface BackupMigration { from: number; to: number; migrate(data: unknown): unknown }

/** Migrates the complete backup document; callers validate the resulting document. */
export function migrateBackup(input: unknown, from: number, to: number,
  migrations: BackupMigration[] = []): unknown {
  let data = input;
  let current = from;
  while (current < to) {
    const candidates = migrations.filter(step => step.from === current);
    const step = candidates[0];
    if (candidates.length !== 1 || !step || !Number.isInteger(step.to) || step.to <= current || step.to > to)
      throw new Error('Falta una migración válida para esta copia.');
    data = step.migrate(data);
    current = step.to;
  }
  return data;
}
