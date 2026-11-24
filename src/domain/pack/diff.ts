import type { Pack, ItemType } from './schema.ts';

export interface PackDiff {
  newItems: string[]; keptItems: string[]; archivedItems: string[];
  typeChanged: { id: string; from: ItemType; to: ItemType }[];
  movedItems: { id: string; fromBlock: string; toBlock: string }[];
  removedBlocks: string[]; newBlocks: string[];
  versionRelation: 'first' | 'newer' | 'same' | 'older';
}
/** Throws for different subject or chapter ids; callers must handle that mismatch. */
export function diffPack(previous: Pack | null, next: Pack): PackDiff {
  if (previous && (previous.capitulo.id !== next.capitulo.id || previous.asignatura.id !== next.asignatura.id))
    throw new Error('No se pueden comparar paquetes de distintas asignaturas o capítulos.');
  const flatten = (pack: Pack | null) => pack?.bloques.flatMap(block => block.items.map(item => ({ ...item, block: block.id }))) ?? [];
  const oldItems = new Map(flatten(previous).map(item => [item.id, item]));
  const nextItems = flatten(next);
  const nextIds = new Set(nextItems.map(item => item.id));
  const oldBlocks = new Set(previous?.bloques.map(b => b.id));
  const nextBlocks = new Set(next.bloques.map(b => b.id));
  const result: PackDiff = {
    newItems: [], keptItems: [], archivedItems: [...oldItems.keys()].filter(id => !nextIds.has(id)),
    typeChanged: [], movedItems: [], removedBlocks: [...oldBlocks].filter(id => !nextBlocks.has(id)),
    newBlocks: [...nextBlocks].filter(id => !oldBlocks.has(id)),
    versionRelation: !previous ? 'first' : next.version > previous.version ? 'newer' : next.version === previous.version ? 'same' : 'older',
  };
  for (const item of nextItems) {
    const old = oldItems.get(item.id);
    if (!old) result.newItems.push(item.id);
    else {
      if (old.tipo === item.tipo) result.keptItems.push(item.id);
      else result.typeChanged.push({ id: item.id, from: old.tipo, to: item.tipo });
      if (old.block !== item.block) result.movedItems.push({ id: item.id, fromBlock: old.block, toBlock: item.block });
    }
  }
  return result;
}
