import { TechnicalDetails } from '../ui/TechnicalDetails.tsx';
import { useRef, useState } from 'react';
import { dataConfig, packConfig, fileConfig } from '../config.ts';
import { requestFirstPersistence, importPackText } from '../data/index.ts';
import type { ImportResult } from '../data/index.ts';
import { formatErrors, validatePackText } from '../domain/pack/index.ts';
import { Dialog } from '../ui/Dialog.tsx';
import { readFileText, describeFailure } from '../ui/files.ts';
import { diffSummary } from '../ui/format.ts';
import styles from '../ui/Screens.module.css';
import { useData } from './DataProvider.tsx';
export function ImportPanel() {
  const { db, ctx, bump } = useData();
  const [persistence, setPersistence] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const importButton = useRef<HTMLButtonElement>(null);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [description, setDescription] = useState('');
  const pending = useRef('');
  async function read(file: File) {
    setError(''); setDetail(''); setResult(null); setText('');
    if (file.size > dataConfig.maxImportBytes) { setError('El archivo supera el máximo de 5 MB.'); return; }
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try { const value = await readFileText(file); setText(value); if (!value.trim()) setError('El archivo está vacío.'); }
    catch (cause) { setDetail(describeFailure(cause, fileConfig.operations.import, ctx)); setError(cause instanceof Error ? cause.message : 'No se puede leer el archivo.'); }
    finally { lock.current = false; setBusy(false); }
  }
  async function run(confirmOlder = false) {
    if (lock.current) return;
    const value = confirmOlder ? pending.current : text;
    if (!value.trim()) { setError('El texto está vacío. Elige un archivo o pega el JSON.'); return; }
    if (new Blob([value]).size > dataConfig.maxImportBytes) { setError('El paquete supera el máximo de 5 MB.'); return; }
    lock.current = true; setBusy(true); setError(''); setDetail(''); setPersistence('');
    try {
      pending.current = value;
      const next = await importPackText(db, value, { ...ctx(), confirmOlder });
      setResult(next);
      if (next.status === 'imported') {
        const parsed = validatePackText(value);
        if (parsed.ok) setDescription(`Importado: ${parsed.pack.asignatura.nombre} · capítulo ${String(parsed.pack.capitulo.numero)} «${parsed.pack.capitulo.titulo}» · versión ${String(parsed.pack.version)}.`);
        bump();
        void requestFirstPersistence(db, navigator.storage).then(protection => {
          if (protection) setPersistence(protection === 'granted' ? 'Almacenamiento protegido' : 'Tu navegador no ha protegido el almacenamiento: instala la app y haz copias de seguridad');
        });
      }
    } catch (cause) { setError('No se ha podido importar el paquete. Vuelve a intentarlo.'); setDetail(describeFailure(cause, fileConfig.operations.import, ctx)); }
    finally { lock.current = false; setBusy(false); }
  }
  return <section><h2>Importar paquete</h2>
    <label>Elegir archivo<input type="file" accept={fileConfig.accept} disabled={busy} onChange={event => { const file = event.target.files?.[0]; if (file) void read(file); }} /></label>
    <label>O pega el JSON aquí<textarea value={text} disabled={busy} onChange={event => { setText(event.target.value); setError(''); setDetail(''); setResult(null); }} /></label>
    <button ref={importButton} disabled={busy || Boolean(error)} onClick={() => { void run(); }}>Importar</button>
    <p role="status">{persistence}</p>
    <div aria-live="polite">{error && <p role="alert">{error}</p>}
      {result?.status === 'imported' && <><p>{description}</p><p>{diffSummary(result.diff)}</p>{result.warnings.map((warning, index) => <p key={index}>Aviso: {warning.message}</p>)}</>}
      {result?.status === 'already-imported' && <p>Este paquete ya estaba importado.</p>}
      {result?.status === 'rejected' && <div role="alert"><p>No se ha importado nada.</p><pre className={styles.errors}>{formatErrors(result.errors.slice(0, packConfig.errorsMax))}</pre><p>Corrige el paquete y vuelve a intentarlo.</p></div>}
    </div>
    {detail && <TechnicalDetails key={detail} detail={detail} />}
    {result?.status === 'needs-confirmation' && <Dialog title="Versión anterior" returnFocus={importButton} onClose={() => { if (!busy) setResult(null); }}>
      <p>Este paquete es de una versión anterior ({result.incoming}) a la que tienes ({result.current}). Si lo importas, será la versión activa.</p>
      <button disabled={busy} onClick={() => { void run(true); }}>Importar igualmente</button><button disabled={busy} onClick={() => { setResult(null); }}>Cancelar</button>
    </Dialog>}
  </section>;
}
