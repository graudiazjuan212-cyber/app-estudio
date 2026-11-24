import { dataConfig, studyConfig } from '../config.ts';
import { validatePackText } from '../domain/pack/index.ts';
import type { BackupData } from './backupSchema.ts';

/** Pure validation of structurally parsed backup rows, before any database writes. */
export function validateBackupIntegrity(data: BackupData): string[] {
  const errors: string[] = [];
  const total = Object.values(data).reduce((sum, rows) => sum + (rows?.length ?? 0), 0);
  if (total > dataConfig.maxBackupRows) return ['La copia supera el límite de filas permitido.'];
  for (const [table, rows] of Object.entries(data)) {
    const seen = new Set<string>();
    for (const row of rows ?? []) {
      const key = 'id' in row ? row.id : 'key' in row ? row.key : row.attemptId;
      if (seen.has(key)) errors.push(`Clave duplicada en ${table}: ${key}.`);
      seen.add(key);
    }
  }
  const subjects = new Set(data.subjects.map(row => row.id));
  const chapterOwners = new Map<string, string>();
  const checkChapterOwner = (chapterId: string, subjectId: string): void => {
    const previous = chapterOwners.get(chapterId);
    if (previous !== undefined && previous !== subjectId)
      errors.push(`El capítulo ${chapterId} pertenece a dos asignaturas.`);
    chapterOwners.set(chapterId, subjectId);
  };
  const chapters = new Map(data.chapters.map(row => [row.id, row]));
  const blocks = new Map(data.blocks.map(row => [row.id, row]));
  const items = new Map(data.items.map(row => [row.id, row]));
  for (const chapter of data.chapters) {
    checkChapterOwner(chapter.id, chapter.subjectId);
    if (!subjects.has(chapter.subjectId)) errors.push(`Asignatura inexistente en capítulo ${chapter.id}.`);
  }
  for (const block of data.blocks) {
    const chapter = chapters.get(block.chapterId);
    if (!chapter || block.subjectId !== chapter.subjectId)
      errors.push(`Capítulo o asignatura incoherente en bloque ${block.id}.`);
    for (const id of block.requiere) {
      const target = blocks.get(id);
      if (!target || target.chapterId !== block.chapterId)
        errors.push(`Dependencia ${id} inexistente o de otro capítulo en ${block.id}.`);
      if (id === block.id) errors.push(`Autorreferencia del bloque ${block.id}.`);
    }
  }
  // Iterative DFS avoids overflowing the stack on a long dependency chain.
  const done = new Set<string>();
  const active = new Map<string, number>();
  for (const start of blocks.keys()) {
    if (done.has(start)) continue;
    const stack = [{ id: start, next: 0 }];
    active.set(start, 0);
    while (stack.length) {
      const frame = stack.at(-1);
      if (!frame) break;
      const target = blocks.get(frame.id)?.requiere[frame.next++];
      if (target === undefined) {
        done.add(frame.id); active.delete(frame.id); stack.pop(); continue;
      }
      const index = active.get(target);
      if (index !== undefined) errors.push(`Ciclo de dependencias: ${[...stack.slice(index).map(f => f.id), target].join(' → ')}.`);
      else if (blocks.has(target) && !done.has(target)) {
        active.set(target, stack.length); stack.push({ id: target, next: 0 });
      }
    }
  }
  for (const item of data.items) {
    const block = blocks.get(item.blockId);
    if (!block || item.chapterId !== block.chapterId || item.subjectId !== block.subjectId)
      errors.push(`Bloque, capítulo o asignatura incoherente en ítem ${item.id}.`);
    if (item.data.id !== item.id || item.data.tipo !== item.tipo)
      errors.push(`Id o tipo del contenido incoherente en ítem ${item.id}.`);
    if (item.itemGen < studyConfig.initialItemGeneration) errors.push(`Generación inválida en ítem ${item.id}.`);
    if (item.relaciona !== ('relaciona' in item.data && item.data.relaciona === true))
      errors.push(`Relaciona incoherente en ítem ${item.id}.`);
  }
  const validPacks = new Set<string>();
  for (const row of data.packs) {
    const result = validatePackText(row.json);
    if (!result.ok) {
      errors.push(`Paquete ${row.key} inválido: ${result.errors.map(e => e.message).join('; ')}`);
      continue;
    }
    const pack = result.pack;
    const key = `${pack.asignatura.id}|${pack.capitulo.id}|${String(pack.version)}`;
    if (row.key !== key || row.subjectId !== pack.asignatura.id || row.chapterId !== pack.capitulo.id || row.version !== pack.version)
      errors.push(`Metadatos o clave incoherentes en paquete ${row.key}.`);
    else validPacks.add(key);
    checkChapterOwner(pack.capitulo.id, pack.asignatura.id);
  }
  for (const chapter of data.chapters) {
    if (!validPacks.has(`${chapter.subjectId}|${chapter.id}|${String(chapter.version)}`))
      errors.push(`Falta el paquete activo del capítulo ${chapter.id}.`);
  }
  for (const attempt of [...data.attempts, ...(data.practiceAttempts ?? [])]) {
    const item = items.get(attempt.itemId);
    if (!item || attempt.subjectId !== item.subjectId || attempt.chapterId !== item.chapterId)
      errors.push(`Ítem, capítulo o asignatura incoherente en intento ${attempt.attemptId}.`);
    if (item && attempt.itemGen > item.itemGen) errors.push(`Generación futura en intento ${attempt.attemptId}.`);
    if ('schedulerVersion' in attempt && typeof attempt.schedulerVersion === 'number' && attempt.schedulerVersion > studyConfig.schedulerVersion)
      errors.push(`Actualiza la app antes de restaurar esta copia: planificador futuro en intento ${attempt.attemptId}.`);
    // Historical block ids and session item ids deliberately need not exist today.
  }
  // Free practice must never leak into progress (or the reverse): the two kinds of answer stay in their own tables.
  // A session that no longer exists is historical and tolerated.
  const sessionKinds = new Map(data.sessions.map(session => [session.id, session.kind]));
  for (const attempt of data.attempts) {
    if (sessionKinds.get(attempt.sessionId) === 'practice')
      errors.push(`El intento ${attempt.attemptId} pertenece a una sesión de práctica libre.`);
  }
  for (const attempt of data.practiceAttempts ?? []) {
    const kind = sessionKinds.get(attempt.sessionId);
    if (kind !== undefined && kind !== 'practice')
      errors.push(`La respuesta de práctica ${attempt.attemptId} pertenece a una sesión que no es de práctica libre.`);
  }
  for (const session of data.sessions) {
    if (!subjects.has(session.subjectId)) errors.push(`Asignatura inexistente en sesión ${session.id}.`);
  }
  return errors;
}
