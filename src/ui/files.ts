import { canShareFile } from '../data/index.ts';
export async function readFileText(file: File): Promise<string> {
  try { return await file.text(); } catch { throw new Error('No se puede leer el archivo. Vuelve a elegirlo.'); }
}
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = fileName; document.body.append(link); link.click(); link.remove();
  // Release after the browser has processed the download click.
  setTimeout(() => { URL.revokeObjectURL(url); });
}
export async function shareOrDownload(json: string, fileName: string): Promise<boolean> {
  return await deliverFile(json, fileName, 'Copia de Estudio') !== 'cancelled';
}
export type Delivery = 'shared' | 'downloaded' | 'cancelled';
export function chooseDelivery({ canShareFile }: { canShareFile: boolean }): 'share' | 'download' {
  return canShareFile ? 'share' : 'download';
}
export function deliveryMessage(fileName: string, delivery: Delivery): string {
  return delivery === 'cancelled' ? 'Exportación cancelada. Puedes volver a intentarlo.'
    : `Progreso exportado: ${fileName}. Súbelo al proyecto de la asignatura en Claude.`;
}
export async function deliverFile(json: string, fileName: string, title = fileName): Promise<Delivery> {
  const file = new File([json], fileName, { type: 'application/json' });
  if (chooseDelivery({ canShareFile: canShareFile(navigator, file) }) === 'download') {
    downloadBlob(file, fileName); return 'downloaded';
  }
  try { await navigator.share({ files: [file], title }); return 'shared'; }
  catch (error) { if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'; throw error; }
}
