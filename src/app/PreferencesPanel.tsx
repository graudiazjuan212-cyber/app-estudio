import { useState } from 'react';
import { studyConfig } from '../config.ts';
import { getSettings, setSetting } from '../data/index.ts';
import type { Settings } from '../data/index.ts';
import { useData } from './DataProvider.tsx';
import { useAsync } from './useAsync.ts';
import { LoadError } from '../ui/LoadState.tsx';
export function PreferencesPanel() {
  const { db, revision, bump } = useData();
  const state = useAsync(() => getSettings(db), [db, revision]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // Show the choice immediately and keep it until the saved settings have been reloaded
  // (or drop it if the write fails), so the radios never flicker back to the old value.
  const [chosen, setChosen] = useState<Partial<Settings>>({});
  const [seen, setSeen] = useState(state.data);
  if (state.data !== seen) { setSeen(state.data); setChosen({}); }
  async function change<K extends keyof Settings>(key: K, value: Settings[K]) {
    setBusy(true); setError(''); setChosen(current => ({ ...current, [key]: value }));
    try { await setSetting(db, key, value); bump(); }
    catch {
      setChosen({});
      setError('No se ha podido guardar la preferencia. Vuelve a intentarlo.');
    }
    finally { setBusy(false); }
  }
  return <section><h2>Preferencias</h2>{state.status === 'error' && <LoadError retry={bump} />}
    {error && <p role="alert">{error}</p>}
    {state.data && <>
      {(['sessionMinutes', 'dailyGoalMinutes'] as const).map(key => <fieldset key={key} disabled={busy} role="radiogroup" aria-label={key === 'sessionMinutes' ? 'Duración de la sesión por defecto' : 'Objetivo diario'}>
        <legend>{key === 'sessionMinutes' ? 'Duración de la sesión por defecto' : 'Objetivo diario'}</legend>
        {(key === 'sessionMinutes' ? studyConfig.sessionMinutesOptions : studyConfig.dailyGoalMinutes).map(value => <label key={value}><input type="radio" name={key} checked={(chosen[key] ?? state.data?.[key]) === value} onChange={() => { void (key === 'sessionMinutes' ? change(key, value) : change(key, value as Settings['dailyGoalMinutes'])); }} />{value} min</label>)}
      </fieldset>)}
      <fieldset disabled={busy} role="radiogroup" aria-label="Tema"><legend>Tema</legend>{studyConfig.themes.map(value => <label key={value}>
        <input type="radio" name="theme" checked={(chosen.theme ?? state.data?.theme) === value} onChange={() => { void change('theme', value); }} />{value === 'system' ? 'Sistema' : value === 'light' ? 'Claro' : 'Oscuro'}</label>)}</fieldset>
    </>}
  </section>;
}
