import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { deliverFile, describeFailure, readFileText } from './files.ts';
import { fileFixture as f } from '../../tests/fixtures/file-delivery.ts';

const click = vi.fn();
const remove = vi.fn();
const revoke = vi.fn();
const createUrl = vi.fn();
const share = vi.fn<Navigator['share']>();
const canShare = vi.fn<Navigator['canShare']>();
beforeEach(() => {
  vi.useFakeTimers();
  click.mockReset(); remove.mockReset(); revoke.mockReset(); createUrl.mockReset(); share.mockReset(); canShare.mockReset();
  canShare.mockReturnValue(true); share.mockResolvedValue(undefined);
  vi.stubGlobal('navigator', { share, canShare, userAgent: f.userAgent });
  vi.stubGlobal('document', { createElement: () => ({ click, remove }), body: { append: vi.fn() } });
  createUrl.mockReturnValue('blob:fixed');
  vi.spyOn(URL, 'createObjectURL').mockImplementation(createUrl);
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(revoke);
});
afterEach(() => { vi.runAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const deliver = () => deliverFile(f.json, f.fileName, f.fileName, { now: f.now });

it('downloads without share and without a diagnostic', async () => {
  vi.stubGlobal('navigator', { userAgent: f.userAgent });
  expect(await deliver()).toEqual({ status: 'downloaded' }); expect(click).toHaveBeenCalledOnce();
});
it('shares successfully without downloading', async () => {
  expect(await deliver()).toEqual({ status: 'shared' }); expect(click).not.toHaveBeenCalled();
});
it('cancels without downloading', async () => {
  share.mockRejectedValue(new DOMException('x', 'AbortError'));
  expect(await deliver()).toEqual({ status: 'cancelled' }); expect(click).not.toHaveBeenCalled();
});
it.each([
  [new DOMException('Permission denied', 'NotAllowedError'), 'NotAllowedError: Permission denied'],
  [new TypeError('boom'), 'TypeError: boom'], [new DOMException('bad', 'DataError'), 'DataError: bad'],
])('downloads the same file with a share diagnostic for %s', async (error, expected) => {
  share.mockRejectedValue(error);
  const result = await deliver();
  expect(result.status).toBe('downloaded'); expect(result.detail).toContain(expected);
  expect(result.detail).toContain('application/json'); expect(result.detail).not.toContain(f.json);
  expect(click).toHaveBeenCalledOnce();
  const file = share.mock.calls[0]?.[0]?.files?.[0];
  expect(await file?.text()).toBe(f.json); expect(file?.name).toBe(f.fileName);
  expect(createUrl).toHaveBeenCalledWith(file);
});
it('downloads when canShare throws', async () => {
  canShare.mockImplementation(() => { throw new Error('unsupported'); });
  expect(await deliver()).toEqual({ status: 'downloaded' }); expect(share).not.toHaveBeenCalled();
});
it('downloads when canShare is false', async () => {
  canShare.mockReturnValue(false);
  expect(await deliver()).toEqual({ status: 'downloaded' }); expect(share).not.toHaveBeenCalled();
});
it('direct download skips capability and share even after asynchronous work', async () => {
  await Promise.resolve();
  expect(await deliverFile(f.json, f.fileName, f.fileName, { downloadOnly: true, now: f.now })).toEqual({ status: 'downloaded' });
  expect(canShare).not.toHaveBeenCalled(); expect(share).not.toHaveBeenCalled(); expect(click).toHaveBeenCalledOnce();
  expect(remove).toHaveBeenCalledOnce(); expect(revoke).not.toHaveBeenCalled();
  vi.runAllTimers(); expect(revoke).toHaveBeenCalledWith('blob:fixed');
});
it('reports the download error and cleans up when both delivery methods fail', async () => {
  share.mockRejectedValue(new TypeError('share failed'));
  click.mockImplementation(() => { throw new Error('download failed'); });
  await expect(deliver()).rejects.toMatchObject({ cause: new Error('download failed'),
    detail: expect.stringContaining('Error: Error: download failed') as unknown });
  expect(remove).toHaveBeenCalledOnce(); vi.runAllTimers(); expect(revoke).toHaveBeenCalledOnce();
});
it('preserves a read failure behind the Spanish message, including with an unavailable clock', async () => {
  const file = new File([f.json], f.fileName);
  vi.spyOn(file, 'text').mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError'));
  const error: unknown = await readFileText(file).catch((cause: unknown) => cause);
  expect(error).toMatchObject({ message: 'No se puede leer el archivo. Vuelve a elegirlo.' });
  const detail = describeFailure(error, 'Restaurar copia', () => { throw new Error('invalid clock'); });
  expect(detail).toContain('NotAllowedError: Permission denied'); expect(detail).toContain('Hora: n/d');
  expect(detail).not.toContain(f.json);
});
