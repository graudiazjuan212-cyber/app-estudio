import { buildHash } from '../domain/router';

export function SettingsScreen() {
  return <><h1>Ajustes</h1><a href={buildHash({ name: 'home' })}>Volver</a></>;
}
