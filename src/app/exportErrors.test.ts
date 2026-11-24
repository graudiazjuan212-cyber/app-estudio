import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { isValidElement } from 'react';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BackupPanel } from './BackupPanel.tsx';
import { ProgressExportButton } from './ProgressExportButton.tsx';
import { TechnicalDetails } from '../ui/TechnicalDetails.tsx';
import { fileFixture as f } from '../../tests/fixtures/file-delivery.ts';

// A small hook harness lets these event-handler tests run in the existing Node environment.
const harness = vi.hoisted(() => ({ states: [] as unknown[], cursor: 0 }));
const services = vi.hoisted(() => ({ backup: vi.fn(), progress: vi.fn(), mark: vi.fn() }));
vi.mock('react', async importOriginal => ({
  ...await importOriginal<typeof import('react')>(),
  useRef: (value: unknown) => ({ current: value }),
  useState: (initial: unknown) => {
    const index = harness.cursor++;
    if (!(index in harness.states)) harness.states[index] = initial;
    return [harness.states[index], (value: unknown) => { harness.states[index] = value; }];
  },
}));
vi.mock('../data/index.ts', () => ({ exportBackup: services.backup, exportProgress: services.progress,
  markBackupDone: services.mark, listSnapshots: vi.fn(), restoreBackup: vi.fn(), undoRestore: vi.fn() }));
vi.mock('./useAsync.ts', () => ({ useAsync: () => ({ status: 'ready', data: [] }) }));
vi.mock('./DataProvider.tsx', () => ({ useData: () => ({ db: {}, ctx: () => ({ now: f.now }), revision: 0, bump: vi.fn() }) }));

function render(component: () => ReactNode) { harness.cursor = 0; return component(); }
function click(node: ReactNode, label: string): boolean {
  if (Array.isArray(node)) return node.some((child: ReactNode) => click(child, label));
  if (!isValidElement<{ children?: ReactNode; onClick?: () => void }>(node)) return false;
  if (node.type === 'button' && node.props.children === label) { node.props.onClick?.(); return true; }
  return click(node.props.children, label);
}
beforeEach(() => {
  harness.states = []; harness.cursor = 0; vi.clearAllMocks();
  vi.stubGlobal('navigator', { userAgent: f.userAgent });
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
for (const kind of ['backup', 'progress'] as const) {
  it(`${kind} preserves the export error in the visible diagnostic`, async () => {
    services[kind].mockRejectedValue(new Error('disco lleno'));
    const component = kind === 'backup' ? BackupPanel : () => ProgressExportButton({ subjectId: 'ejmat' });
    expect(click(render(component), kind === 'backup' ? 'Exportar copia' : 'Exportar progreso para Claude')).toBe(true);
    await vi.waitFor(() => { expect(harness.states).toContain('No se ha podido ' +
      (kind === 'backup' ? 'completar la operación.' : 'exportar el progreso.') + ' Tus datos se conservan.'); });
    const html = renderToStaticMarkup(render(component));
    expect(html).toContain('Error: Error: disco lleno'); expect(html).toContain('Detalle técnico');
    expect(html).toContain('Copiar detalle'); expect(services.mark).not.toHaveBeenCalled();
  });
}
it('direct backup download never calls share and marks the backup done', async () => {
  services.backup.mockResolvedValue({ json: f.json, fileName: f.fileName, counts: { attempts: 0, items: 0 } });
  const share = vi.fn(); const canShare = vi.fn(() => true);
  vi.stubGlobal('navigator', { share, canShare, userAgent: f.userAgent });
  vi.stubGlobal('document', { createElement: () => ({ click: vi.fn(), remove: vi.fn() }), body: { append: vi.fn() } });
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fixed'); vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  expect(click(render(BackupPanel), 'Descargar copia')).toBe(true);
  await vi.waitFor(() => { expect(services.mark).toHaveBeenCalledOnce(); });
  expect(share).not.toHaveBeenCalled(); expect(canShare).not.toHaveBeenCalled();
});
it.each([true, false])('copy detail reports clipboard success=%s and retains selectable text', async success => {
  const writeText = vi.fn(() => success ? Promise.resolve() : Promise.reject(new Error('denied')));
  vi.stubGlobal('navigator', { clipboard: { writeText } });
  const component = () => TechnicalDetails({ detail: 'Error: Error: disco lleno' });
  expect(click(render(component), 'Copiar detalle')).toBe(true);
  await vi.waitFor(() => { expect(harness.states).toContain(success ? 'Detalle copiado' : 'No se ha podido copiar; selecciónalo a mano'); });
  expect(writeText).toHaveBeenCalledWith('Error: Error: disco lleno');
  const html = renderToStaticMarkup(render(component));
  expect(html).toContain('Error: Error: disco lleno'); expect(html).toContain('user-select:text');
});
