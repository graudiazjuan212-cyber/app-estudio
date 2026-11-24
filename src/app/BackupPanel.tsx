import { useRef, useState } from 'react';
import { exportBackup, listSnapshots, markBackupDone, restoreBackup, undoRestore } from '../data/index.ts';
import { Dialog } from '../ui/Dialog.tsx';
import { readFileText, shareOrDownload } from '../ui/files.ts';
import { LoadError } from '../ui/LoadState.tsx';
import { useData } from './DataProvider.tsx';
import { useAsync } from './useAsync.ts';
function countsText(counts: Record<string, number>): string {
  return `${String(counts.attempts ?? 0)} intentos, ${String(counts.items ?? 0)} preguntas`;
}
export function BackupPanel() {
  const { db, ctx, revision, bump } = useData();
  const snapshots = useAsync(() => listSnapshots(db), [db, revision]);
  const latest = snapshots.data?.[0];
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState<{ kind: 'restore'; text: string } | { kind: 'undo' } | null>(null);
  async function operation(work: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setMessage('');
    try { await work(); }
    catch { setError('No se ha podido completar la operación. Tus datos se conservan.'); }
    finally { lock.current = false; setBusy(false); }
  }
  async function create() {
    const copy = await exportBackup(db, ctx());
    if (!await shareOrDownload(copy.json, copy.fileName)) return;
    await markBackupDone(db, ctx().now); bump();
    setMessage(`Copia creada: ${copy.fileName} (${countsText(copy.counts)}). Guárdala en Drive o envíatela`);
  }
  async function restore() {
    if (!pending) return;
    const result = pending.kind === 'undo' ? await undoRestore(db, ctx()) : await restoreBackup(db, pending.text, ctx());
    setPending(null);
    if (result.status === 'rejected') setError(`${result.message}. No se ha cambiado nada`);
    else { setMessage(`Copia restaurada: ${countsText(result.counts)}`); bump(); }
  }
  return <section><h2>Copias de seguridad</h2><button disabled={busy} onClick={() => { void operation(create); }}>Exportar copia</button>
    <label>Restaurar copia<input type="file" accept=".json,application/json" disabled={busy} onChange={event => {
      const file = event.target.files?.[0]; event.target.value = '';
      if (file) void operation(async () => { setPending({ kind: 'restore', text: await readFileText(file) }); });
    }} /></label>
    {snapshots.status === 'error' && <LoadError retry={bump} />}
    {latest && <><p>última copia para deshacer: {new Intl.DateTimeFormat('es-ES', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(latest.createdAt))} · {countsText(latest.counts)}</p>
      <button disabled={busy} onClick={() => { setPending({ kind: 'undo' }); }}>Deshacer última restauración</button></>}
    <p role="status">{message}</p>{error && <p role="alert">{error}</p>}
    {pending && <Dialog title={pending.kind === 'undo' ? 'Deshacer última restauración' : 'Restaurar copia'} onClose={() => { if (!busy) setPending(null); }}>
      <p>Se sustituirán tus datos actuales por los de la copia. Antes se guarda automáticamente el estado actual para poder deshacerlo.</p>
      <button disabled={busy} onClick={() => { void operation(restore); }}>{pending.kind === 'undo' ? 'Deshacer' : 'Restaurar'}</button><button disabled={busy} onClick={() => { setPending(null); }}>Cancelar</button>
    </Dialog>}
  </section>;
}
