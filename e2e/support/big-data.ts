import { readFileSync } from 'node:fs';
import type { Backup, BackupData } from '../../src/data/backupSchema';
import { packSchema } from '../../src/domain/pack';
import type { Pack } from '../../src/domain/pack';
import { qualityConfig as c } from './quality-config';
import { dataConfig, packConfig, studyConfig } from '../../src/config';

export interface DataSize { subjects: number; blocks: number; items: number; attempts: number }
export function generateBackup(size: DataSize = c.large): Backup {
  if ([size.subjects, size.blocks, size.items, size.attempts].some(value => !Number.isInteger(value) || value < 1))
    throw new Error('El tamaño debe contener enteros positivos.');
  if (size.blocks > packConfig.blocksMax || size.items > packConfig.itemsMax)
    throw new Error('El tamaño supera los límites de un paquete.');
  const template = packSchema.parse(JSON.parse(readFileSync(
    new URL('../../tests/fixtures/packs/mat-ejemplo-c01.json', import.meta.url), 'utf8')));
  const templates = [...new Map(template.bloques.flatMap(b => b.items).map(i => [i.tipo, i])).values()];
  const data: BackupData = { subjects: [], chapters: [], blocks: [], items: [], packs: [],
    attempts: [], sessions: [], settings: [] };
  for (let s = 0; s < size.subjects; s++) {
    const subjectId = `large-s${String(s)}`, chapterId = `${subjectId}-c1`;
    const pack: Pack = { ...template, asignatura: { id: subjectId, nombre: `Asignatura ${String(s + 1)}` },
      capitulo: { id: chapterId, numero: 1, titulo: 'Capítulo de prueba' }, bloques: [] };
    data.subjects.push(pack.asignatura);
    data.chapters.push({ ...pack.capitulo, subjectId, version: 1 });
    for (let b = 0; b < size.blocks; b++) {
      const blockId = `${chapterId}-b${String(b)}`;
      const items = Array.from({ length: size.items }, (_, i) => {
        const model = templates[i % templates.length];
        if (!model) throw new Error('Falta un tipo de pregunta.');
        return { ...model, id: `${blockId}-i${String(i)}` };
      });
      pack.bloques.push({ id: blockId, titulo: `Bloque ${String(b + 1)}`, peso: 1, requiere: [], items });
      data.blocks.push({ id: blockId, subjectId, chapterId, titulo: `Bloque ${String(b + 1)}`,
        peso: 1, requiere: [], order: b, archived: false });
      items.forEach((item, order) => data.items.push({ id: item.id, subjectId, chapterId,
        blockId, tipo: item.tipo, itemGen: 1, archived: false,
        relaciona: 'relaciona' in item && item.relaciona === true, order, data: item }));
    }
    data.packs.push({ key: `${subjectId}|${chapterId}|1`, subjectId, chapterId,
      version: 1, importedAt: c.start, json: JSON.stringify(pack) });
    const rows = data.items.filter(item => item.subjectId === subjectId);
    const count = size === c.large ? c.subjectAttempts[s] ?? 0
      : Math.floor(size.attempts / size.subjects) + (s < size.attempts % size.subjects ? 1 : 0);
    for (let day = 0; day < c.days; day++) {
      const at = new Date(Date.parse(c.start) + day * c.dayMs).toISOString();
      const sessionId = `${subjectId}-day${String(day)}`;
      const attempts = Array.from({ length: Math.floor(count / c.days) + (day < count % c.days ? 1 : 0) }, (_, j) => {
        const item = rows[(day * Math.ceil(count / c.days) + j) % rows.length];
        if (!item) throw new Error('Faltan preguntas.');
        const correct = item.tipo === 'info' || j % c.failureEvery !== 0;
        return { attemptId: `${sessionId}-a${String(j)}`, itemId: item.id, itemGen: 1,
          subjectId, chapterId, blockId: item.blockId, tipo: item.tipo, at,
          studyDay: at.slice(0, 10), tz: 'Europe/Madrid', correct, dontKnow: false,
          confidence: item.tipo === 'info' || item.tipo === 'flashcard' ? null : 'seguro' as const,
          rating: item.tipo === 'flashcard' ? correct ? 'facil' as const : 'otra' as const : null,
          durationMs: c.durationMs, sessionId, packVersion: pack.version, schedulerVersion: studyConfig.schedulerVersion };
      });
      data.attempts.push(...attempts);
      data.sessions.push({ id: sessionId, subjectId, chapterId, kind: 'study', startedAt: at, endedAt: at,
        itemIds: attempts.map(a => a.itemId), minutes: attempts.length * c.durationMs
          / studyConfig.millisecondsPerSecond / studyConfig.secondsPerMinute,
        percentBefore: {}, result: { total: attempts.length, correct: attempts.filter(a => a.correct).length } });
    }
  }
  return { schema: dataConfig.backupSchema, createdAt: c.now, dbVersion: dataConfig.schemaVersion,
    schedulerVersion: studyConfig.schedulerVersion, data };
}
