// Node >=22: node --experimental-strip-types --test e2e/support/static-server.test.ts
// Only loopback HTTP; no external network or Playwright/browser required.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { fileURLToPath } from 'node:url';
import { startStaticServer } from './static-server.ts';
import { invalidPaths, mimeCases } from '../../tests/fixtures/static-server/expected.ts';

function fixture(variant: 'a' | 'b') {
  return fileURLToPath(new URL(`../../tests/fixtures/static-server/${variant}/`, import.meta.url));
}
// node:http preserves literal dot segments; fetch/URL would normalize them before reaching the server.
function get(origin: string, path: string) {
  return new Promise<{ status: number | undefined; headers: import('node:http').IncomingHttpHeaders; body: string }>((done, reject) => {
    const req = request(origin, { path }, response => {
      let body = ''; response.setEncoding('utf8');
      response.on('data', (chunk: string) => { body += chunk; });
      response.on('error', reject);
      response.on('end', () => { done({ status: response.statusCode, headers: response.headers, body }); });
    });
    req.on('error', reject); req.end();
  });
}

// Juan recibe los tipos correctos para cargar scripts, estilos, fuentes y manifiesto sin conexión.
for (const [file, mime] of mimeCases) void test(`serves MIME for ${file}`, async t => {
  const server = await startStaticServer(fixture('a')); t.after(() => server.close());
  const response = await get(server.url, `/app-estudio/${file}`);
  assert.equal(response.status, 200); assert.equal(response.headers['content-type'], mime);
  assert.ok(response.body.length > 0);
});

// Juan obtiene las versiones actuales de la entrada y del SW, sin caché HTTP obsoleta.
for (const file of ['index.html', 'sw.js']) void test(`does not cache ${file}`, async t => {
  const server = await startStaticServer(fixture('a')); t.after(() => server.close());
  const response = await get(server.url, `/app-estudio/${file}`);
  assert.equal(response.status, 200); assert.equal(response.headers['cache-control'], 'no-cache');
});

// Juan puede abrir el prefijo sin barra final y llegar a la app.
void test('redirects the bare prefix and serves the index at the root', async t => {
  const server = await startStaticServer(fixture('a')); t.after(() => server.close());
  const redirect = await get(server.url, '/app-estudio');
  assert.equal(redirect.status, 308); assert.equal(redirect.headers.location, '/app-estudio/');
  assert.equal((await get(server.url, '/app-estudio/')).body, '<!doctype html><title>Variant A</title>\n');
});

// Una ruta malformada nunca permite acceder a archivos fuera de la app de Juan.
void test('rejects traversal, nulls, backslashes and malformed escapes', async t => {
  const server = await startStaticServer(fixture('a')); t.after(() => server.close());
  for (const path of invalidPaths) {
    const response = await get(server.url, path);
    assert.equal(response.status, 400, path); assert.equal(response.body, 'Invalid path');
  }
});

// Las rutas ajenas y los recursos ausentes no devuelven accidentalmente la app.
void test('returns clean 404 outside the prefix and for missing files', async t => {
  const server = await startStaticServer(fixture('a')); t.after(() => server.close());
  for (const path of ['/', '/other', '/app-estudio-extra/index.html', '/app-estudio/missing.js']) {
    const response = await get(server.url, path);
    assert.equal(response.status, 404, path); assert.equal(response.body, 'Not found');
  }
});

// Juan recibe B desde el mismo origen al publicarse una versión nueva.
void test('switches roots without changing the listening origin', async t => {
  const server = await startStaticServer(fixture('a')); t.after(() => server.close());
  const url = server.url;
  assert.equal((await get(url, '/app-estudio/')).body, '<!doctype html><title>Variant A</title>\n');
  await server.switchRoot(fixture('b'));
  assert.equal(server.url, url);
  assert.equal((await get(url, '/app-estudio/')).body, '<!doctype html><title>Variant B</title>\n');
  assert.equal((await get(url, '/app-estudio/asset.js')).status, 404);
});

// Una publicación ausente se rechaza conservando la versión que Juan ya podía abrir.
void test('rejects a missing root without replacing the current root', async t => {
  const server = await startStaticServer(fixture('a')); t.after(() => server.close());
  await assert.rejects(server.switchRoot(`${fixture('a')}/absent`));
  await assert.rejects(server.switchRoot(`${fixture('a')}/index.html`));
  await assert.rejects(startStaticServer(`${fixture('a')}/absent`));
  await assert.rejects(startStaticServer(`${fixture('a')}/index.html`));
  assert.equal((await get(server.url, '/app-estudio/')).status, 200);
});

// El cierre real usado para probar el modo sin red se puede repetir durante la limpieza.
void test('closes the listener and allows repeated cleanup', async () => {
  const server = await startStaticServer(fixture('a'));
  await server.close(); await server.close();
  await assert.rejects(get(server.url, '/app-estudio/'));
});
