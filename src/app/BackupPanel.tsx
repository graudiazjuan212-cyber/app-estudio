import { fileConfig } from '../config.ts';
import { TechnicalDetails } from '../ui/TechnicalDetails.tsx';
import { useRef, useState } from 'react';
import { exportBackup, listSnapshots, markBackupDone, restoreBackup, undoRestore } from '../data/index.ts';
import { Dialog } from '../ui/Dialog.tsx';
import { readFileText, deliverFile, fallbackMessage, describeFailure } from '../ui/files.ts';
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
  const [detail, setDetail] = useState('');
  const [pending, setPending] = useState<{ kind: 'restore'; text: string } | { kind: 'undo' } | null>(null);
  async function operation(work: () => Promise<void>, name: string = fileConfig.operations.backup) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setMessage(''); setDetail('');
    try { await work(); }
    catch (cause) { setError('No se ha podido completar la operación. Tus datos se conservan.'); setDetail(describeFailure(cause, name, ctx)); }
    finally { lock.current = false; setBusy(false); }
  }
  async function create(downloadOnly = false) {
    const copy = await exportBackup(db, ctx());
    const delivery = await deliverFile(copy.json, copy.fileName, 'Copia de Estudio', { downloadOnly, now: ctx().now });
    if (delivery.status === 'cancelled') return;
    setDetail(delivery.detail ?? '');
    await markBackupDone(db, ctx().now); bump();
    setMessage(delivery.detail ? fallbackMessage(copy.fileName) : `Copia creada: ${copy.fileName} (${countsText(copy.counts)}). Guárdala en Drive o envíatela`);
  }
  async function restore() {
    if (!pending) return;
    const result = pending.kind === 'undo' ? await undoRestore(db, ctx()) : await restoreBackup(db, pending.text, ctx());
    setPending(null);
    if (result.status === 'rejected') setError(`${result.message}. No se ha cambiado nada`);
    else { setMessage(`Copia restaurada: ${countsText(result.counts)}`); bump(); }
  }
  return <section><h2>Copias de seguridad</h2><button disabled={busy} onClick={() => { void operation(() => create()); }}>Exportar copia</button>
    <button disabled={busy} onClick={() => { void operation(() => create(true)); }}>Descargar copia</button>
    <p>{fileConfig.help}</p>
    <label>Restaurar copia<input type="file" accept={fileConfig.accept} disabled={busy} onChange={event => {
      const file = event.target.files?.[0]; event.target.value = '';
      if (file) void operation(async () => { setPending({ kind: 'restore', text: await readFileText(file) }); }, fileConfig.operations.restore);
    }} /></label>
    {snapshots.status === 'error' && <LoadError retry={bump} />}
    {latest && <><p>última copia para deshacer: {new Intl.DateTimeFormat('es-ES', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(latest.createdAt))} · {countsText(latest.counts)}</p>
      <button disabled={busy} onClick={() => { setPending({ kind: 'undo' }); }}>Deshacer última restauración</button></>}
    <p role="status">{message}</p>{error && <p role="alert">{error}</p>}
    {detail && <TechnicalDetails key={detail} detail={detail} />}
    {pending && <Dialog title={pending.kind === 'undo' ? 'Deshacer última restauración' : 'Restaurar copia'} onClose={() => { if (!busy) setPending(null); }}>
      <p>Se sustituirán tus datos actuales por los de la copia. Antes se guarda automáticamente el estado actual para poder deshacerlo.</p>
      <button disabled={busy} onClick={() => { void operation(restore, fileConfig.operations.restore); }}>{pending.kind === 'undo' ? 'Deshacer' : 'Restaurar'}</button><button disabled={busy} onClick={() => { setPending(null); }}>Cancelar</button>
    </Dialog>}
  </section>;
}
