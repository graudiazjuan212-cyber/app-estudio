import { z } from 'zod';
import { dataConfig, packConfig } from '../config.ts';
import { itemSchema } from '../domain/pack/index.ts';
import { validateAttempt } from '../domain/study/index.ts';

const instant = z.iso.datetime();
const id = z.string().min(1);
const version = z.int().min(1);
const reference = { subjectId: id, chapterId: id };
const subject = z.strictObject({ id, nombre: z.string() });
const chapter = z.strictObject({ id, subjectId: id, numero: version, titulo: z.string(), version });
const block = z.strictObject({ id, ...reference, titulo: z.string(),
  peso: z.union(packConfig.weights.map(weight => z.literal(weight))), requiere: z.array(id),
  order: z.int().nonnegative(), archived: z.boolean() });
const item = z.strictObject({ id, ...reference, blockId: id, tipo: z.enum(packConfig.itemTypes),
  itemGen: version, archived: z.boolean(), relaciona: z.boolean(), order: z.int().nonnegative(), data: itemSchema });
const pack = z.strictObject({ key: id, ...reference, version, importedAt: instant, json: z.string() });
const attempt = z.strictObject({ attemptId: id, itemId: id, itemGen: version, ...reference,
  blockId: id, tipo: z.enum(packConfig.itemTypes), at: instant, studyDay: z.string(), tz: z.string(),
  correct: z.boolean(), dontKnow: z.boolean(), confidence: z.enum(['duda', 'bastante', 'seguro']).nullable(),
  rating: z.enum(['otra', 'dificil', 'bien', 'facil']).nullable(), durationMs: z.int().nonnegative(),
  sessionId: id, packVersion: version, schedulerVersion: version,
}).superRefine((row, ctx) => {
  if (validateAttempt(row).length) ctx.addIssue({ code: 'custom', message: 'La copia contiene un intento inválido.' });
});
const session = z.strictObject({ id, subjectId: id, kind: z.enum(['study', 'review', 'exam']),
  chapterId: id.nullable(), startedAt: instant, endedAt: instant.nullable(), itemIds: z.array(id),
  minutes: z.number().nonnegative(), percentBefore: z.record(z.string(), z.number()),
  result: z.strictObject({ correct: z.int().nonnegative(), total: z.int().nonnegative() }).nullable() });
const setting = z.strictObject({ key: id, value: z.json() });
export const backupDataSchema = z.strictObject({ subjects: z.array(subject), chapters: z.array(chapter),
  blocks: z.array(block), items: z.array(item), packs: z.array(pack), attempts: z.array(attempt),
  sessions: z.array(session), settings: z.array(setting) }).superRefine((data, ctx) => {
  const tables = [data.subjects, data.chapters, data.blocks, data.items, data.packs, data.attempts,
    data.sessions, data.settings];
  for (const rows of tables) {
    const keys = rows.map(row => 'id' in row ? row.id : 'key' in row ? row.key : row.attemptId);
    if (new Set(keys).size !== keys.length)
      ctx.addIssue({ code: 'custom', message: 'La copia contiene claves duplicadas.' });
  }
  const subjects = new Set(data.subjects.map(row => row.id));
  const chapters = new Set(data.chapters.map(row => row.id));
  const blocks = new Set(data.blocks.map(row => row.id));
  const items = new Set(data.items.map(row => row.id));
  if (data.chapters.some(row => !subjects.has(row.subjectId)) ||
    data.blocks.some(row => !chapters.has(row.chapterId)) ||
    data.items.some(row => !blocks.has(row.blockId)) ||
    data.attempts.some(row => !items.has(row.itemId)))
    ctx.addIssue({ code: 'custom', message: 'La copia contiene referencias a datos inexistentes.' });
});
export const backupSchema = z.strictObject({ schema: z.literal(dataConfig.backupSchema),
  createdAt: instant, dbVersion: version, schedulerVersion: version, data: backupDataSchema });
export type Backup = z.infer<typeof backupSchema>;
export type BackupData = Backup['data'];
