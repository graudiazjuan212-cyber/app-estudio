import { useState } from 'react';
import { requestPersistence, storageStatus } from '../data/index.ts';
import { bytesToMegabytes } from '../ui/format.ts';
import { useAsync } from './useAsync.ts';
import { LoadError } from '../ui/LoadState.tsx';
export function StoragePanel() {
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const state = useAsync(() => storageStatus(navigator.storage), [revision]);
  async function protect() {
    setBusy(true);
    try { const result = await requestPersistence(navigator.storage);
      setMessage(result === 'granted' ? 'Protegido' : result === 'denied' ? 'No protegido' : 'No se puede comprobar');
      setRevision(value => value + 1);
    } finally { setBusy(false); }
  }
  return <section><h2>Tus datos en este móvil</h2>
    {state.status === 'error' && <LoadError retry={() => { setRevision(value => value + 1); }} />}
    {state.data && <><p>{state.data.persisted === null ? 'No se puede comprobar' : state.data.persisted ? 'Protegido' : 'No protegido'}</p>
      {state.data.usageBytes !== null && <p>Uso: {bytesToMegabytes(state.data.usageBytes)} MB / {bytesToMegabytes(state.data.quotaBytes)} MB</p>}</>}
    <button disabled={busy} onClick={() => { void protect(); }}>Proteger almacenamiento</button><p role="status">{message}</p>
    <p>Instala la app en la pantalla de inicio para que Android no borre tus datos.</p>
  </section>;
}
