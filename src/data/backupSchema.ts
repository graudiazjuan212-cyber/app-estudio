import { z } from 'zod';
import { dataConfig, packConfig, studyConfig } from '../config.ts';
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
  sessionId: id, packVersion: version, schedulerVersion: z.int().nonnegative(),
}).superRefine((row, ctx) => {
  if (validateAttempt(row).length) ctx.addIssue({ code: 'custom', message: 'La copia contiene un intento inválido.' });
});
const practiceAttempt = z.strictObject({ ...attempt.shape, schedulerVersion: z.never().optional() }).omit({ schedulerVersion: true }).superRefine((row, ctx) => {
  if (row.tipo === 'info' || validateAttempt({ ...row, schedulerVersion: studyConfig.schedulerVersion }).length)
    ctx.addIssue({ code: 'custom', message: 'Intento de práctica inválido.' });
});
const session = z.strictObject({ id, subjectId: id, kind: z.enum(['study', 'review', 'exam', 'practice']),
  chapterId: id.nullable(), startedAt: instant, endedAt: instant.nullable(), itemIds: z.array(id),
  minutes: z.number().nonnegative(), percentBefore: z.record(z.string(), z.number()),
  result: z.strictObject({ correct: z.int().nonnegative(), total: z.int().nonnegative() }).nullable() });
const setting = z.strictObject({ key: id, value: z.json() });
export const backupDataSchema = z.strictObject({ subjects: z.array(subject), chapters: z.array(chapter),
  blocks: z.array(block), items: z.array(item), packs: z.array(pack), attempts: z.array(attempt),
  practiceAttempts: z.array(practiceAttempt).optional(),
  sessions: z.array(session), settings: z.array(setting) });
export const backupSchema = z.strictObject({ schema: z.literal(dataConfig.backupSchema),
  createdAt: instant, dbVersion: version, schedulerVersion: z.int().nonnegative(), data: backupDataSchema });
export type Backup = z.infer<typeof backupSchema>;
export type BackupData = Backup['data'];
