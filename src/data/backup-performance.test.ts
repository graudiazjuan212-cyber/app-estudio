import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import { attempt, testDb } from '../../tests/fixtures/data/helpers.ts';
import { backupContext, backupTestConfig, exportContext, seedBackup } from '../../tests/fixtures/data/backup.ts';
import { exportBackup, restoreBackup } from './backup.ts';
import { migrateBackup } from './backupMigrations.ts';

it('exports and restores twenty thousand attempts within the tolerant budget', async () => {
  const source = await testDb();
  const target = await testDb();
  try {
    await seedBackup(source);
    await source.attempts.clear();
    await source.attempts.bulkAdd(Array.from({ length: backupTestConfig.attempts }, (_, index) =>
      attempt({ attemptId: `synthetic-${String(index)}` })));
    const start = performance.now();
    const backup = await exportBackup(source, exportContext);
    expect((await restoreBackup(target, backup.json, backupContext)).status).toBe('restored');
    expect(performance.now() - start).toBeLessThan(backupTestConfig.performanceMaxMs);
    expect(await target.attempts.count()).toBe(backupTestConfig.attempts);
  } finally { await source.delete(); await target.delete(); }
}, backupTestConfig.performanceMaxMs * 2);

it('applies pure migration links in order without mutating input', () => {
  const input = { oldName: 'Juan' };
  const result = migrateBackup(input, 0, 2, [
    { from: 1, to: 2, migrate: value => ({ ...(value as object), done: true }) },
    { from: 0, to: 1, migrate: value => ({ name: (value as typeof input).oldName }) },
  ]);
  expect(result).toEqual({ name: 'Juan', done: true });
  expect(input).toEqual({ oldName: 'Juan' });
});
it('leaves an already current document untouched', () => {
  const input = { name: 'Juan' };
  expect(migrateBackup(input, 1, 1)).toBe(input);
});
