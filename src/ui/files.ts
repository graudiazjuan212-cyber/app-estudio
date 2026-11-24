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
  const file = new File([json], fileName, { type: 'application/json' });
  if (!canShareFile(navigator, file)) { downloadBlob(file, fileName); return true; }
  try { await navigator.share({ files: [file], title: 'Copia de Estudio' }); return true; }
  catch (error) { if (error instanceof DOMException && error.name === 'AbortError') return false; throw error; }
}
