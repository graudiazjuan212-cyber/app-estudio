import { fileConfig } from '../config.ts';
import { TechnicalDetails } from '../ui/TechnicalDetails.tsx';
import { useRef, useState } from 'react';
import { exportProgress } from '../data/index.ts';
import { deliverFile, deliveryMessage, fallbackMessage, describeFailure } from '../ui/files.ts';
import { useData } from './DataProvider.tsx';

export function ProgressExportButton({ subjectId }: { subjectId: string }) {
  const { db, ctx } = useData();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [detail, setDetail] = useState('');
  async function run(downloadOnly = false) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setMessage(''); setError(''); setDetail('');
    try {
      const result = await exportProgress(db, subjectId, ctx());
      if (result.status !== 'ok') { setError(result.message); return; }
      const delivery = await deliverFile(result.json, result.fileName, result.fileName, { downloadOnly, now: ctx().now });
      setDetail(delivery.detail ?? '');
      setMessage(delivery.detail ? fallbackMessage(result.fileName) : deliveryMessage(result.fileName, delivery.status));
    } catch (cause) { setError('No se ha podido exportar el progreso. Tus datos se conservan.'); setDetail(describeFailure(cause, fileConfig.operations.progress, ctx)); }
    finally { lock.current = false; setBusy(false); }
  }
  return <div><button disabled={busy} onClick={() => { void run(); }}>Exportar progreso para Claude</button>
    <button disabled={busy} onClick={() => { void run(true); }}>Descargar progreso</button>
    <p>{fileConfig.help}</p>
    <p>Comparte o descarga el archivo y súbelo al proyecto de la asignatura en Claude. Esto no sustituye a la copia de seguridad.</p>
    {message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}
    {detail && <TechnicalDetails key={detail} detail={detail} />}
  </div>;
}
