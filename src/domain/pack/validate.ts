import katex from 'katex';
import { packConfig } from '../../config.ts';
import { packSchema } from './schema.ts';
import type { Pack } from './schema.ts';
import { contextualError, schemaErrors } from './errors.ts';
import type { PackError, PackWarning, Path } from './errors.ts';
import { normalizeJson, InputDepthError } from './normalize.ts';
import { extractMath } from './latex.ts';

export type ValidationResult =
  | { ok: true; pack: Pack; warnings: PackWarning[] }
  | { ok: false; errors: PackError[] };

function mathErrors(input: unknown): PackError[] {
  const errors: PackError[] = [];
  function walk(value: unknown, path: Path): void {
    if (typeof value === 'string') {
      let fragments;
      try { fragments = extractMath(value); }
      catch { errors.push(contextualError(input, path, '`$` sin cerrar')); return; }
      for (const fragment of fragments) {
        try { katex.renderToString(fragment.source, { throwOnError: true, displayMode: fragment.kind === 'display' }); }
        catch { errors.push(contextualError(input, path, `LaTeX inválido en «${fragment.source}».`)); }
      }
    } else if (Array.isArray(value)) value.forEach((v: unknown, i) => { walk(v, [...path, i]); });
    else if (typeof value === 'object' && value !== null)
      for (const [key, v] of Object.entries(value)) walk(v, [...path, key]);
  }
  walk(input, []);
  return errors;
}
function referenceErrors(input: unknown): PackError[] {
  // Check independently of structural parsing so unrelated malformed fields do not hide errors.
  const errors: PackError[] = [];
  if (typeof input !== 'object' || input === null || !('bloques' in input) || !Array.isArray(input.bloques)) return errors;
  const blocks: unknown[] = input.bloques;
  const get = (v: unknown, key: string): unknown => typeof v === 'object' && v !== null ? Reflect.get(v, key) : undefined;
  const ids = new Set(blocks.map(b => get(b, 'id')).filter((id): id is string => typeof id === 'string'));
  const blockSeen = new Set<string>();
  const itemSeen = new Set<unknown>([...ids, get(get(input, 'capitulo'), 'id'), get(get(input, 'asignatura'), 'id')]);
  const graph = new Map<string, string[]>();
  const add = (path: Path, message: string) => { errors.push(contextualError(input, path, message)); };
  blocks.forEach((block, b) => {
    const id = get(block, 'id');
    if (typeof id !== 'string') return;
    if (blockSeen.has(id)) add(['bloques', b, 'id'], `Id de bloque duplicado: ${id}.`);
    blockSeen.add(id);
    const items = get(block, 'items');
    if (Array.isArray(items)) items.forEach((item: unknown, i) => {
      const itemId = get(item, 'id');
      if (typeof itemId !== 'string') return;
      if (itemSeen.has(itemId)) add(['bloques', b, 'items', i, 'id'], `Id de ítem duplicado o reservado: ${itemId}.`);
      itemSeen.add(itemId);
    });
    const requires = get(block, 'requiere');
    const edges: string[] = [];
    if (Array.isArray(requires)) requires.forEach((target: unknown, r) => {
      if (typeof target !== 'string') return;
      if (!ids.has(target)) add(['bloques', b, 'requiere', r], `El bloque ${target} no existe en este paquete; no se admiten dependencias entre capítulos.`);
      else if (target === id) add(['bloques', b, 'requiere', r], 'Un bloque no puede requerirse a sí mismo.');
      else edges.push(target);
    });
    graph.set(id, edges);
  });
  const done = new Set<string>();
  const active: string[] = [];
  function visit(id: string): void {
    if (done.has(id)) return;
    active.push(id);
    for (const target of graph.get(id) ?? []) {
      const index = active.indexOf(target);
      if (index >= 0) {
        const b = blocks.findIndex(block => get(block, 'id') === id);
        add(['bloques', b, 'requiere'], `Ciclo de dependencias: ${[...active.slice(index), target].join(' → ')}.`);
      } else visit(target);
    }
    active.pop();
    done.add(id);
  }
  for (const id of graph.keys()) visit(id);
  return errors;
}
export function validatePack(input: unknown): ValidationResult {
  try { return validateNormalizedPack(normalizeJson(input)); }
  catch (error) {
    let depthExceeded = false;
    try { depthExceeded = error instanceof InputDepthError; }
    catch { /* Even a thrown value can be a proxy that rejects inspection. */ }
    return { ok: false, errors: [{ path: '', message: depthExceeded
      ? 'El archivo está demasiado anidado; reduce los niveles de anidación.'
      : 'El contenido no es JSON válido; revisa los datos del archivo.' }] };
  }
}
function validateNormalizedPack(input: unknown): ValidationResult {
  const parsed = packSchema.safeParse(input);
  const errors = [
    ...(parsed.success ? [] : schemaErrors(input, parsed.error.issues)),
    ...referenceErrors(input), ...mathErrors(input),
  ];
  // Stable preorder of the input, rather than sorting indices lexicographically (10 before 2).
  const positions = new Map<string, number>();
  function order(value: unknown, path: Path): void {
    const error = contextualError(input, path, '');
    positions.set(error.path, positions.size);
    if (Array.isArray(value)) value.forEach((v: unknown, i) => { order(v, [...path, i]); });
    else if (typeof value === 'object' && value !== null)
      for (const [key, v] of Object.entries(value)) order(v, [...path, key]);
  }
  order(input, []);
  errors.sort((a, b) => (positions.get(a.path) ?? positions.size) - (positions.get(b.path) ?? positions.size));
  if (!parsed.success || errors.length) return { ok: false, errors: errors.slice(0, packConfig.errorsMax) };
  const warnings = parsed.data.bloques.flatMap((block, b) => block.items.every(item => item.tipo === 'info')
    ? [contextualError(input, ['bloques', b], 'bloque sin preguntas evaluables')] : []);
  return { ok: true, pack: parsed.data, warnings };
}
export function validatePackText(text: string): ValidationResult {
  let input: unknown;
  try { input = JSON.parse(text.replace(/^\uFEFF/, '')); }
  catch (error) {
    return { ok: false, errors: [{ path: '', message: `El archivo no es un JSON válido: ${error instanceof Error ? error.message : 'formato incorrecto'}` }] };
  }
  return validatePack(input);
}
