import { z } from 'zod';
import { packConfig } from '../../config.ts';
import { packSchema } from './schema.ts';

export interface PackError { path: string; message: string }
export type PackWarning = PackError;
export type Path = PropertyKey[];
export function formatPath(path: Path): string {
  return path.map((part, i) => typeof part === 'number' ? `[${String(part)}]` : `${i ? '.' : ''}${String(part)}`).join('');
}
export function readAt(input: unknown, path: Path): unknown {
  let value = input;
  for (const key of path) {
    if (typeof value !== 'object' || value === null) return undefined;
    value = Reflect.get(value, key);
  }
  return value;
}
export function contextualError(input: unknown, path: Path, message: string): PackError {
  let context = '';
  if (path[0] === 'bloques' && typeof path[1] === 'number') {
    const title = readAt(input, path.slice(0, 2).concat('titulo'));
    context = `Bloque ${String(path[1] + 1)}${typeof title === 'string' ? ` «${title}»` : ''}`;
    if (path[2] === 'items' && typeof path[3] === 'number') {
      const id = readAt(input, path.slice(0, 4).concat('id'));
      context += `, pregunta ${String(path[3] + 1)}${typeof id === 'string' ? ` (id ${id})` : ''}`;
    }
    context += ': ';
  }
  return { path: formatPath(path), message: context + message };
}
export function editDistance(a: string, b: string): number {
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 0; i < a.length; i++) {
    const next = [i + 1];
    for (let j = 0; j < b.length; j++)
      next.push(Math.min((next[j] ?? 0) + 1, (row[j + 1] ?? 0) + 1, (row[j] ?? 0) + (a[i] === b[j] ? 0 : 1)));
    row = next;
  }
  return row[b.length] ?? 0;
}
function allowedKeys(input: unknown, path: Path): string[] {
  let schema: unknown = z.toJSONSchema(packSchema);
  let value = input;
  function select(node: unknown, data: unknown): unknown {
    const variants = readAt(node, ['oneOf']) ?? readAt(node, ['anyOf']);
    if (!Array.isArray(variants)) return node;
    return variants.find((variant: unknown) => readAt(variant, ['properties', 'tipo', 'const']) === readAt(data, ['tipo'])) ?? node;
  }
  for (const key of path) {
    schema = select(schema, value);
    schema = typeof key === 'number' ? readAt(schema, ['items']) : readAt(schema, ['properties', key]);
    value = readAt(value, [key]);
  }
  const properties = readAt(select(schema, value), ['properties']);
  return typeof properties === 'object' && properties !== null ? Object.keys(properties) : [];
}
export function schemaErrors(input: unknown, issues: z.core.$ZodIssue[]): PackError[] {
  return issues.flatMap(issue => {
    const field = String(issue.path.at(-1) ?? 'paquete');
    if (issue.code === 'unrecognized_keys') return issue.keys.map(key => {
      const candidates = allowedKeys(input, issue.path).map(name => ({ name, distance: editDistance(key, name) }))
        .sort((a, b) => a.distance - b.distance);
      const suggestion = candidates[0];
      const hint = suggestion && suggestion.distance <= packConfig.suggestionDistance ? `; ¿querías decir \`${suggestion.name}\`?` : '.';
      return contextualError(input, [...issue.path, key], `Campo desconocido \`${key}\`${hint}`);
    });
    let message: string;
    if (issue.code === 'custom') message = issue.message;
    else if (readAt(input, issue.path) === undefined) message = `Falta el campo \`${field}\`.`;
    else if (field === 'peso') message = '`peso` debe ser 1, 3 o 5.';
    else if (issue.code === 'invalid_type') message = `El campo \`${field}\` tiene un tipo incorrecto; se esperaba ${issue.expected === 'string' ? 'texto' : issue.expected === 'boolean' ? 'verdadero o falso' : issue.expected === 'array' ? 'una lista' : issue.expected === 'object' ? 'un objeto' : 'un número entero'}.`;
    else if (issue.code === 'too_small') message = `El campo \`${field}\` debe tener como mínimo ${String(issue.minimum)}${issue.origin === 'number' || issue.origin === 'int' ? '' : ' elementos o caracteres'}.`;
    else if (issue.code === 'too_big') message = `El campo \`${field}\` debe tener como máximo ${String(issue.maximum)} elementos o caracteres.`;
    else if (field === 'generado') message = '`generado` debe ser una fecha real válida YYYY-MM-DD.';
    else if (issue.code === 'invalid_value') message = `Valor no permitido en \`${field}\`: debe ser ${issue.values.map(v => String(v)).join(', ')}.`;
    else message = `El campo \`${field}\` tiene un formato o valor no permitido.`;
    return [contextualError(input, issue.path, message)];
  });
}
export function formatErrors(errors: PackError[]): string {
  return errors.map(e => `${e.path || 'paquete'}: ${e.message}`).join('\n');
}
