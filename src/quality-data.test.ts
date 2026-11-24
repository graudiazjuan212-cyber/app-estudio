import { describe, expect, it } from 'vitest';
import { generateBackup } from '../e2e/support/big-data';
import { accessibilityBackup } from '../e2e/support/accessibility-data';
import { qualityConfig as c } from '../e2e/support/quality-config';
import { qualityExpected } from '../tests/fixtures/quality';
import { backupSchema } from './data/backupSchema';
import { validateBackupIntegrity } from './data/backupIntegrity';
import { packSchema } from './domain/pack';
import { buildCatalog, buildSession, rebuildFromAttempts } from './domain/study';

describe('quality backup generator', () => {
  it('produces a structurally valid reduced backup with all nine real item types', () => {
    const backup = generateBackup(c.small);
    expect(backupSchema.safeParse(backup).success).toBe(true);
    expect(validateBackupIntegrity(backup.data)).toEqual([]);
    for (const [table, count] of Object.entries(qualityExpected.counts))
      expect(Reflect.get(backup.data, table)).toHaveLength(count);
    expect([...new Set(backup.data.items.map(i => i.tipo))]).toEqual(qualityExpected.types);
  });
  it('rejects an orphan in the generated copy', () => {
    const backup = generateBackup(c.small);
    backup.data.subjects = [];
    expect(validateBackupIntegrity(backup.data).length).toBeGreaterThan(0);
  });
  it.each([0, -1, 1.5, Number.NaN])('rejects invalid size %s', subjects => {
    expect(() => generateBackup({ ...c.small, subjects })).toThrow('enteros positivos');
  });
  it('rejects a missing dimension at the input boundary', () => {
    expect(() => generateBackup({ subjects: 1 } as Parameters<typeof generateBackup>[0])).toThrow('enteros positivos');
  });
  it.each([{ ...c.small, blocks: 61 }, { ...c.small, items: 201 }])('rejects oversized pack dimensions %s', size => {
    expect(() => generateBackup(size)).toThrow('límites de un paquete');
  });
  it('builds the full session in memory within 100 ms', () => {
    const backup = generateBackup();
    const catalog = buildCatalog(backup.data.packs.map(p => packSchema.parse(JSON.parse(p.json))), new Map());
    const attempts = backup.data.attempts.filter(a => a.subjectId === 'large-s0');
    const derived = rebuildFromAttempts(attempts, catalog, c.now.slice(0, 10));
    const start = performance.now();
    const plan = buildSession({ catalog, derived, attempts, subjectId: 'large-s0', now: c.now,
      tz: 'Europe/Madrid', minutes: 10, seed: c.seed });
    const elapsed = performance.now() - start;
    console.info(`[rendimiento] buildSession: ${elapsed.toFixed(1)} ms`);
    expect(elapsed).toBeLessThan(c.sessionMs);
    expect(plan.itemIds.length).toBeGreaterThan(0);
  });
  it('rejects absent session duration with the large catalog', () => {
    const catalog = buildCatalog([], new Map());
    expect(() => buildSession({ catalog, derived: rebuildFromAttempts([], catalog, '2026-11-24'),
      attempts: [], subjectId: 'large-s0', now: c.now, tz: 'Europe/Madrid', minutes: 0, seed: c.seed })).toThrow();
  });
  it('prepares all four block states and a locked block without invalid references', () => {
    const backup = accessibilityBackup();
    expect(backupSchema.safeParse(backup).success).toBe(true);
    expect(validateBackupIntegrity(backup.data)).toEqual([]);
    const catalog = buildCatalog(backup.data.packs.map(p => packSchema.parse(JSON.parse(p.json))), new Map());
    const derived = rebuildFromAttempts(backup.data.attempts, catalog, '2026-11-24');
    expect([...derived.blocks.values()].map(b => [b.status, b.locked])).toEqual([
      ['graduado', false], ['dominado', false], ['en_curso', false], ['pendiente', false], ['pendiente', true],
    ]);
  });
});
