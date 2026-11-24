/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { expect, it } from 'vitest';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const folders = ['src', 'tests', 'e2e', 'scripts'];
const codeExtensions = ['.ts', '.tsx', '.css', '.mjs', '.js'];
const maxLines = 300;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}
const all = folders.flatMap(folder => files(join(root, folder)));
const code = all.filter(path => codeExtensions.some(ext => path.endsWith(ext)));

it('has files to check', () => { expect(code.length).toBeGreaterThan(50); });
it('has no byte order mark at the start of any source or fixture file', () => {
  const offenders = all.filter(path => readFileSync(path).subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])))
    .map(path => relative(root, path));
  expect(offenders).toEqual([]);
});
it(`keeps every code file at ${String(maxLines)} lines or fewer`, () => {
  const offenders = code.map(path => ({ path: relative(root, path), lines: readFileSync(path, 'utf8').split('\n').length }))
    .filter(file => file.lines > maxLines);
  expect(offenders).toEqual([]);
});
it('has no corrupted accents (a question mark between letters) in source or fixture text', () => {
  // A tool once saved "conexión" as "conexi?n". Optional chaining (`a?.b`), `??`, ternaries and regex groups do not match.
  const corrupted = /[A-Za-zÁÉÍÓÚáéíóúñ]\?[A-Za-zÁÉÍÓÚáéíóúñ]/;
  const legitimate = /\?[.:?]|\(\?|\/.*\?.*\//;
  const offenders = all.filter(path => /\.(tsx?|css|md)$/.test(path)).flatMap(path =>
    readFileSync(path, 'utf8').split('\n').flatMap((text, index) =>
      corrupted.test(text) && !legitimate.test(text) ? [`${relative(root, path)}:${String(index + 1)}`] : []));
  expect(offenders).toEqual([]);
});
