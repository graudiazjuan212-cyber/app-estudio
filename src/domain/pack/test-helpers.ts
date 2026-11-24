/// <reference types="node" />
import { readFileSync } from 'node:fs';
import type { Pack } from './schema.ts';

export function fixtureText(name: string): string {
  return readFileSync(new URL(`../../../tests/fixtures/packs/${name}.json`, import.meta.url), 'utf8');
}
export function fixture(name = 'mat-ejemplo-c01'): Pack {
  return JSON.parse(fixtureText(name)) as Pack;
}
export function changed(path: (string | number)[], value: unknown): unknown {
  const input: unknown = fixture();
  let parent = input;
  for (const key of path.slice(0, -1)) {
    if (typeof parent !== 'object' || parent === null) throw new Error('Ruta de prueba incorrecta');
    parent = Reflect.get(parent, key);
  }
  const key = path.at(-1);
  if (typeof parent !== 'object' || parent === null || key === undefined) throw new Error('Ruta de prueba incorrecta');
  if (value === undefined) Reflect.deleteProperty(parent, key);
  else Reflect.set(parent, key, value);
  return input;
}
