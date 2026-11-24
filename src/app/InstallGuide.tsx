import { useEffect, useState } from 'react';
import { isStandalone } from './pwaRules';
export { detectPlatform, isStandalone } from './pwaRules';
interface InstallPrompt extends Event { prompt: () => Promise<unknown> }
function isInstallPrompt(event: Event): event is InstallPrompt {
  return 'prompt' in event && typeof event.prompt === 'function';
}
export function InstallGuide() {
  const [standalone] = useState(() => isStandalone(query => window.matchMedia(query)));
  const [installed, setInstalled] = useState(false);
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const offer = (event: Event) => {
      if (!isInstallPrompt(event)) return;
      event.preventDefault(); setPrompt(event);
    };
    const complete = () => { setInstalled(true); setPrompt(null); };
    window.addEventListener('beforeinstallprompt', offer);
    window.addEventListener('appinstalled', complete);
    return () => {
      window.removeEventListener('beforeinstallprompt', offer);
      window.removeEventListener('appinstalled', complete);
    };
  }, []);
  async function install(event: InstallPrompt) {
    setPrompt(null); setError('');
    try { await event.prompt(); } catch { setError('No se ha podido abrir la instalación. Sigue los pasos del menú.'); }
  }
  return <section><h2>Instalar en tu móvil</h2>
    {standalone ? <p>Ya estás usando la app instalada</p> : installed ? <p>App instalada</p> : <>
      <p>Android (Chrome): abre el menú ⋮ → «Instalar aplicación» (o «Añadir a pantalla de inicio»). Ábrela desde el icono.</p>
      <p>iPhone: Safari → Compartir → «Añadir a pantalla de inicio». En iPhone el sistema puede borrar los datos de webs que no se usan; haz copias.</p>
      {prompt && <button onClick={() => { void install(prompt); }}>Instalar la app</button>}
    </>}{error && <p role="status">{error}</p>}
  </section>;
}
