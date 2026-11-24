import { pwaConfig } from '../config';
import { parseRoute } from '../domain/router';

export function shouldReloadNow({ initiatedHere, sessionActive }: {
  initiatedHere: boolean; sessionActive: boolean;
}): boolean { return initiatedHere || !sessionActive; }
export function reloadAfterLeavingSession({ reloadPending, sessionActive }: {
  reloadPending: boolean; sessionActive: boolean;
}): boolean { return reloadPending && !sessionActive; }

export async function registerServiceWorker({ clock, publish }: {
  clock: () => number; publish: (patch: { needRefresh?: boolean; offlineReady?: boolean }) => void;
}): Promise<() => Promise<void>> {
  if (!('serviceWorker' in navigator)) return () => Promise.resolve();
  const workers = navigator.serviceWorker;
  let updateRequestedHere = false;
  let reloadPending = false;
  let reloaded = false;
  let controller = workers.controller;
  let offlineAnnounced = false;
  const sessionActive = () => parseRoute(window.location.hash).name === 'session';
  const reload = () => {
    if (reloaded) return;
    reloaded = true; reloadPending = false; window.location.reload();
  };
  workers.addEventListener('controllerchange', () => {
    if (workers.controller === controller) return;
    controller = workers.controller;
    reloaded = false;
    publish({ needRefresh: false });
    if (shouldReloadNow({ initiatedHere: updateRequestedHere, sessionActive: sessionActive() })) reload();
    else reloadPending = true;
    updateRequestedHere = false;
  });
  window.addEventListener('hashchange', () => {
    if (reloadAfterLeavingSession({ reloadPending, sessionActive: sessionActive() })) reload();
  });
  const base = import.meta.env.BASE_URL;
  const registration = await workers.register(`${base}sw.js`, { scope: base });
  const installed = () => {
    if (workers.controller) publish({ needRefresh: true });
    else if (!offlineAnnounced) { offlineAnnounced = true; publish({ offlineReady: true }); }
  };
  if (registration.waiting) installed();
  const observe = (worker: ServiceWorker | null) => {
    if (!worker) return;
    worker.addEventListener('statechange', () => { if (worker.state === 'installed') installed(); });
    if (worker.state === 'installed') installed();
  };
  observe(registration.installing);
  registration.addEventListener('updatefound', () => { observe(registration.installing); });
  // Registration may already have finished on the first visit.
  if (registration.active && !workers.controller) installed();
  let lastCheck = clock();
  document.addEventListener('visibilitychange', () => {
    const now = clock();
    if (document.visibilityState !== 'visible' ||
      now - lastCheck < pwaConfig.updateCheckMinMinutes * pwaConfig.millisecondsPerMinute) return;
    lastCheck = now;
    void registration.update().catch(() => { /* Retry on a later visible visit. */ });
  });
  return () => {
    if (registration.waiting) {
      updateRequestedHere = true;
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    return Promise.resolve();
  };
}
