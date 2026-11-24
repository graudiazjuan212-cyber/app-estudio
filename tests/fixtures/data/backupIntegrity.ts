import type { Backup } from '../../../src/data/backupSchema.ts';
import { requiredRow as row } from './backup.ts';

export const integrityRejections: [string, (backup: Backup) => void][] = [
  ['item subject', b => { row(b.data.items).subjectId = 'missing'; }],
  ['data id', b => { row(b.data.items).data.id = 'different'; }],
  ['data type', b => { row(b.data.items).tipo = 'test'; }],
  ['empty pack', b => { row(b.data.packs).json = '{}'; }],
  ['other chapter pack', b => { row(b.data.packs).json = row(b.data.packs, 1).json; }],
  ['pack key', b => { row(b.data.packs).key = 'wrong'; }],
  ['missing requirement', b => { row(b.data.blocks).requiere = ['missing']; }],
  ['self requirement', b => { row(b.data.blocks).requiere = ['b1']; }],
  ['three block cycle', b => { row(b.data.blocks).requiere = ['b3']; }],
  ['cross chapter requirement', b => { row(b.data.blocks).requiere = ['b4']; }],
  ['duplicate item', b => { b.data.items.push(row(b.data.items)); }],
  ['missing attempt item', b => { row(b.data.attempts).itemId = 'missing'; }],
  ['attempt subject', b => { row(b.data.attempts).subjectId = 'missing'; }],
  ['attempt generation', b => { row(b.data.attempts).itemGen = 2; }],
  ['attempt scheduler', b => { row(b.data.attempts).schedulerVersion = 2; }],
  ['chapter subject', b => { row(b.data.chapters).subjectId = 'missing'; }],
  ['block chapter', b => { row(b.data.blocks).chapterId = 'missing'; }],
  ['block subject', b => { row(b.data.blocks).subjectId = 'missing'; }],
  ['item block', b => { row(b.data.items).blockId = 'missing'; }],
  ['item chapter', b => { row(b.data.items).chapterId = 'c2'; }],
  ['item generation zero', b => { row(b.data.items).itemGen = 0; }],
  ['item relaciona', b => { row(b.data.items).relaciona = true; }],
  ['pack subject', b => { row(b.data.packs).subjectId = 'missing'; }],
  ['pack chapter', b => { row(b.data.packs).chapterId = 'c2'; }],
  ['pack version', b => { row(b.data.packs).version = 2; }],
  ['missing active pack', b => { row(b.data.chapters).version = 2; }],
  ['chapter reused by subject', b => { b.data.chapters.push({ ...row(b.data.chapters), subjectId: 'other' }); }],
  ['attempt chapter', b => { row(b.data.attempts).chapterId = 'c2'; }],
  ['session subject', b => { row(b.data.sessions).subjectId = 'missing'; }],
  ...(['subjects', 'chapters', 'blocks', 'packs', 'attempts', 'sessions', 'settings'] as const).map(
    (table): [string, (backup: Backup) => void] => [`duplicate ${table}`, b => {
      if (table === 'settings') b.data.settings.push({ key: 'x', value: null }, { key: 'x', value: null });
      else if (table === 'subjects') b.data.subjects.push(row(b.data.subjects));
      else if (table === 'chapters') b.data.chapters.push(row(b.data.chapters));
      else if (table === 'blocks') b.data.blocks.push(row(b.data.blocks));
      else if (table === 'packs') b.data.packs.push(row(b.data.packs));
      else if (table === 'attempts') b.data.attempts.push(row(b.data.attempts));
      else b.data.sessions.push(row(b.data.sessions));
    }]),
];

export const schedulerRejections: [number, string][] = [
  [2, 'Actualiza la app antes de restaurar esta copia'],
  [0, 'Esta copia usa un planificador antiguo y todavía no se puede restaurar'],
];
export const historicalChanges: [string, (backup: Backup) => void][] = [
  ['moved item', b => { row(b.data.attempts).blockId = 'old-block'; }],
  ['removed session item', b => { row(b.data.sessions).itemIds = ['removed-item']; }],
  ['old attempt generation', b => { row(b.data.items).itemGen = 2; }],
  ['old attempt scheduler', b => { row(b.data.attempts).schedulerVersion = 0; }],
];
