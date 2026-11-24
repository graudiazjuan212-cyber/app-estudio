import { progressConfig as c, studyConfig } from '../../config.ts';
import { itemSchema } from '../pack/schema.ts';
import { chapterPercent, evaluableIds, groupAttempts, rebuildFromAttempts, studyDay } from '../study/index.ts';
import type { Attempt, Catalog, ItemState } from '../study/index.ts';
import { compareAttempts, compareText, isCurrentEvaluable } from '../study/history.ts';
import { progressSchema } from './schema.ts';
import type { ProgressMeta } from './meta.ts';
export { progressMetaFromPacks } from './meta.ts';
export type { ProgressMeta } from './meta.ts';
import type { ProgressExport } from './schema.ts';
import { formatIsoWithOffset, shortText } from './text.ts';
export { formatIsoWithOffset, shortText, progressFileName } from './text.ts';

export interface ProgressSession {
  id: string; kind: 'study' | 'review' | 'exam'; startedAt: string; endedAt: string | null;
}
export interface ProgressInput {
  subjectId: string; catalog: Catalog; meta: ProgressMeta; attempts: Attempt[]; sessions: ProgressSession[];
  itemStates: Map<string, ItemState>; now: string; tz: string;
}
function requiredTitle(titles: Map<string, string>, id: string): string {
  const value = titles.get(id);
  if (!value?.trim()) throw new Error(`Falta el título ${id} en los metadatos de progreso.`);
  return value;
}
export function buildProgressExport(input: ProgressInput): ProgressExport {
  const { subjectId, now, tz, itemStates } = input;
  const today = studyDay(now, tz);
  const chapters = [...input.catalog.chapters.values()].filter(ch => ch.subjectId === subjectId)
    .sort((a, b) => a.numero - b.numero || compareText(a.id, b.id));
  const blocks = new Map([...input.catalog.blocks].filter(([, b]) => b.subjectId === subjectId &&
    !input.meta.archivedBlockIds.has(b.id)));
  const catalog: Catalog = {
    chapters: new Map(chapters.map(ch => [ch.id, { ...ch, blockIds: ch.blockIds.filter(id => blocks.has(id)) }])),
    blocks, items: new Map([...input.catalog.items].filter(([, i]) => blocks.has(i.blockId))),
  };
  const groups = groupAttempts(input.attempts.filter(a => a.subjectId === subjectId));
  const attempts = [...groups].map(([id, group]) => {
    if (group.conflict) throw new Error(`El registro tiene un intento repetido con contenido distinto: ${id}`);
    return group.first;
  });
  const derived = rebuildFromAttempts(attempts, catalog, today);
  // Invalid history must never silently turn into an apparently valid report.
  const invalid = derived.skipped.filter(s => !s.reason.includes('generación') &&
    !s.reason.includes('catálogo') && !s.reason.includes('Duplicado idéntico'));
  if (invalid.length) throw new Error(`Registro de progreso inválido: ${invalid[0]?.reason ?? ''}`);
  const textFor = (id: string) => {
    const parsed = itemSchema.safeParse(input.meta.items.get(id));
    if (!parsed.success) throw new Error(`Falta el contenido del ítem ${id} en el catálogo de progreso.`);
    return shortText(parsed.data);
  };
  const types = { study: 'estudio', review: 'repaso', exam: 'examen' } as const;
  const sessions = input.sessions.flatMap(s => {
    if (s.endedAt === null || ('subjectId' in s && s.subjectId !== subjectId)) return [];
    const rows = attempts.filter(a => a.sessionId === s.id).sort(compareAttempts);
    const first = rows[0];
    if (!first) return [];
    const evaluable = rows.filter(a => a.tipo !== 'info');
    const seconds = rows.reduce((sum, a) => sum + a.durationMs, 0) / studyConfig.millisecondsPerSecond;
    return [{ id: s.id, startedAt: s.startedAt, value: {
      fecha: first.studyDay,
      minutos: Math.round(seconds * c.decimalScale / studyConfig.secondsPerMinute) / c.decimalScale,
      preguntas: evaluable.length, aciertos: evaluable.filter(a => a.correct).length, tipo: types[s.kind],
    } }];
  }).sort((a, b) => compareText(a.value.fecha, b.value.fecha) ||
    compareText(a.startedAt, b.startedAt) || compareText(a.id, b.id)).slice(-c.sessionsMax).map(s => s.value);
  const start = new Date(`${today}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - (c.windowDays - 1));
  const firstDay = start.toISOString().slice(0, 10);
  const failures = new Map<string, number>();
  for (const a of attempts) {
    if (!a.correct && isCurrentEvaluable(a, catalog) && a.studyDay >= firstDay && a.studyDay <= today)
      failures.set(a.itemId, (failures.get(a.itemId) ?? 0) + 1);
  }
  const output = {
    schema: c.schema, exportado: formatIsoWithOffset(now, tz), asignatura: subjectId, sesiones: sessions,
    capitulos: [...catalog.chapters.values()].map(ch => ({
      id: ch.id, numero: ch.numero, titulo: requiredTitle(input.meta.chapterTitles, ch.id), porcentaje: chapterPercent(ch, catalog, derived.blocks),
      bloques: ch.blockIds.flatMap(id => {
        const block = blocks.get(id);
        const state = derived.blocks.get(id);
        if (!block || !state) return [];
        const dues = evaluableIds(block, catalog).flatMap(itemId => {
          const itemState = itemStates.get(itemId);
          return itemState ? [itemState.card.due] : [];
        }).sort((a, b) => Date.parse(a) - Date.parse(b));
        const due = dues[0];
        return [{ id, titulo: requiredTitle(input.meta.blockTitles, id), peso: block.peso, estado: state.status, bloqueado: state.locked,
          dias_dominio: state.validDays,
          proximo_repaso: due === undefined ? null : studyDay(due, tz) }];
      }),
    })),
    puntos_ciegos: derived.blindSpots.map(b => ({ item: b.itemId, enunciado_corto: textFor(b.itemId), fecha: b.since })),
    fallos_recurrentes: [...failures].filter(([, count]) => count >= c.minimumFailures)
      .sort(([a, ac], [b, bc]) => bc - ac || compareText(a, b))
      .map(([item, fallos]) => ({ item, enunciado_corto: textFor(item), fallos })),
  };
  const result = progressSchema.safeParse(output);
  if (!result.success) throw new Error(`Exportación de progreso inválida: ${result.error.message}`);
  return result.data;
}
