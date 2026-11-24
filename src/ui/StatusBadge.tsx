import type { BlockStatus } from '../domain/study/index.ts';
const labels = { pendiente: '○ Pendiente', en_curso: '◐ En curso', dominado: '✓ Dominado', graduado: '★ Graduado' };
export function StatusBadge({ status }: { status: BlockStatus }) { return <span>{labels[status]}</span>; }
