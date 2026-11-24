import { useEffect, useState, useSyncExternalStore } from 'react';
import { claimPwaNotice } from '../data';
import { useData } from './DataProvider';
import { applyUpdate, pwaStore } from './pwa';
import { shouldShowUpdateBanner } from './pwaRules';
export { shouldShowUpdateBanner } from './pwaRules';
export function UpdateBanner({ route }: { route: { name: string } }) {
  const { db } = useData();
  const state = useSyncExternalStore(pwaStore.subscribe, pwaStore.getSnapshot);
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    if (!state.offlineReady) return;
    void claimPwaNotice(db, 'offlineNoticeShown').then(show => { if (show) setOffline(true); }).catch(() => { /* Preserve invalid metadata. */ });
  }, [db, state.offlineReady]);
  async function apply() {
    setBusy(true); setError('');
    try { await applyUpdate(); }
    catch { setError('No se ha podido actualizar. Vuelve a intentarlo.'); setBusy(false); }
  }
  return <>
    {shouldShowUpdateBanner({ ...state, route, dismissed }) && <div role="status">
      Hay una versión nueva de la app. <button disabled={busy} onClick={() => { void apply(); }}>Actualizar</button>
      <button disabled={busy} onClick={() => { setDismissed(true); }}>Más tarde</button>{error && <p>{error}</p>}
    </div>}
    {offline && <div role="status">Lista para usar sin conexión <button onClick={() => { setOffline(false); }}>Cerrar</button></div>}
  </>;
}
