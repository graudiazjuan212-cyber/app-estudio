import { buildHash } from '../domain/router';

export function HomeScreen() {
  return <><h1>Estudio</h1><p>Aún no hay asignaturas. Importa un paquete desde <a href={buildHash({ name: 'settings' })}>Ajustes</a>.</p></>;
}
