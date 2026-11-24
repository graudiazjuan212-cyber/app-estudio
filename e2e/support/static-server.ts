import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { basename, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { pwaTestConfig } from './config.ts';

async function rootDirectory(directory: string) {
  const root = await realpath(directory);
  if (!(await stat(root)).isDirectory()) throw new Error(`Not a directory: ${directory}`);
  return root;
}
export async function startStaticServer(directory: string) {
  let root = await rootDirectory(directory);
  const server = createServer((request, response) => {
    void (async () => {
      const send = (status: number, body: string) => {
        response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' }); response.end(body);
      };
      let path: string;
      try { path = decodeURIComponent((request.url ?? '/').split('?')[0] ?? '/'); }
      catch { send(400, 'Invalid path'); return; }
      if (path.includes('\\') || path.includes('\0') || path.split('/').includes('..')) {
        send(400, 'Invalid path'); return;
      }
      const prefix = pwaTestConfig.basePath;
      if (path === prefix.slice(0, -1)) {
        response.writeHead(308, { Location: prefix }); response.end(); return;
      }
      if (!path.startsWith(prefix)) { send(404, 'Not found'); return; }
      // Capture the root for the entire request, including asynchronous filesystem operations.
      const currentRoot = root;
      try {
        const file = await realpath(resolve(currentRoot, path.slice(prefix.length) || 'index.html'));
        const inside = relative(currentRoot, file);
        if (inside.startsWith(`..${sep}`) || inside === '..' || isAbsolute(inside)) {
          send(400, 'Invalid path'); return;
        }
        if (!(await stat(file)).isFile()) { send(404, 'Not found'); return; }
        const body = await readFile(file);
        response.writeHead(200, {
          'Content-Type': pwaTestConfig.mime[extname(file)] ?? 'application/octet-stream',
          ...(['sw.js', 'index.html'].includes(basename(file)) ? { 'Cache-Control': 'no-cache' } : {}),
        });
        response.end(body);
      } catch { send(404, 'Not found'); }
    })().catch(() => { response.destroy(); });
  });
  await new Promise<void>((done, reject) => {
    server.once('error', reject);
    server.listen(0, pwaTestConfig.host, () => { server.off('error', reject); done(); });
  });
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('Missing server address');
  return {
    url: `http://${pwaTestConfig.host}:${String(address.port)}${pwaTestConfig.basePath}`,
    switchRoot: async (dir: string) => { root = await rootDirectory(dir); },
    close: () => new Promise<void>((done, reject) => {
      if (!server.listening) { done(); return; }
      server.close(error => { if (error) reject(error); else done(); });
      server.closeAllConnections();
    }),
  };
}
export type StaticServer = Awaited<ReturnType<typeof startStaticServer>>;
