import { canShareFile } from '../data/index.ts';
import { fileConfig } from '../config.ts';
import { FileDeliveryError, technicalDetail } from './technicalDetail.ts';
import type { TechnicalDetail } from './technicalDetail.ts';
export async function readFileText(file: File): Promise<string> {
  try { return await file.text(); }
  catch (cause) { throw new Error('No se puede leer el archivo. Vuelve a elegirlo.', { cause }); }
}
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  try { link.href = url; link.download = fileName; document.body.append(link); link.click(); }
  finally {
    link.remove();
    // Release after the browser has processed the download click.
    setTimeout(() => { URL.revokeObjectURL(url); });
  }
}
export async function shareOrDownload(json: string, fileName: string): Promise<boolean> {
  return (await deliverFile(json, fileName, 'Copia de Estudio')).status !== 'cancelled';
}
export interface Delivery { status: 'shared' | 'downloaded' | 'cancelled'; detail?: TechnicalDetail }
export function chooseDelivery({ canShareFile }: { canShareFile: boolean }): 'share' | 'download' {
  return canShareFile ? 'share' : 'download';
}
export function deliveryMessage(fileName: string, delivery: Delivery['status']): string {
  return delivery === 'cancelled' ? 'Exportación cancelada. Puedes volver a intentarlo.'
    : `Progreso exportado: ${fileName}. Súbelo al proyecto de la asignatura en Claude.`;
}
export function fallbackMessage(fileName: string): string {
  return `${fileConfig.fallback} (busca ${fileName} en Descargas).`;
}
export function describeFailure(error: unknown, operation: string, context: () => { now: string }): string {
  if (error instanceof FileDeliveryError) return error.detail;
  let now: string | undefined;
  try { now = context().now; } catch (cause) { void cause; /* Invalid clocks must not hide the original error. */ }
  return technicalDetail({ error: error instanceof Error && error.cause !== undefined ? error.cause : error,
    operation, userAgent: navigator.userAgent, now });
}
export async function deliverFile(json: string, fileName: string, title = fileName,
  options: { downloadOnly?: boolean; now?: string } = {}): Promise<Delivery> {
  const file = new File([json], fileName, { type: fileConfig.type });
  const canShare = options.downloadOnly ? undefined : canShareFile(navigator, file);
  const describe = (error: unknown, operation: string) => technicalDetail({ operation, error, fileName,
    fileType: file.type, size: file.size, canShare, userAgent: navigator.userAgent, now: options.now });
  let detail: string | undefined;
  if (canShare) {
    try { await navigator.share({ files: [file], title }); return { status: 'shared' }; }
    catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return { status: 'cancelled' };
      detail = describe(error, fileConfig.operations.share);
    }
  }
  try { downloadBlob(file, fileName); }
  catch (error) { throw new FileDeliveryError(error, describe(error, fileConfig.operations.download)); }
  return detail ? { status: 'downloaded', detail } : { status: 'downloaded' };
}
