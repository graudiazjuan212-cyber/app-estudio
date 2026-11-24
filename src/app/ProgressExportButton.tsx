import { useRef, useState } from 'react';
import { exportProgress } from '../data/index.ts';
import { deliverFile, deliveryMessage } from '../ui/files.ts';
import { useData } from './DataProvider.tsx';

export function ProgressExportButton({ subjectId }: { subjectId: string }) {
  const { db, ctx } = useData();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function run() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setMessage(''); setError('');
    try {
      const result = await exportProgress(db, subjectId, ctx());
      if (result.status !== 'ok') { setError(result.message); return; }
      const delivery = await deliverFile(result.json, result.fileName);
      setMessage(deliveryMessage(result.fileName, delivery));
    } catch { setError('No se ha podido exportar el progreso. Tus datos se conservan.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <div><button disabled={busy} onClick={() => { void run(); }}>Exportar progreso para Claude</button>
    <p>Comparte o descarga el archivo y súbelo al proyecto de la asignatura en Claude. Esto no sustituye a la copia de seguridad.</p>
    {message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}
  </div>;
}
