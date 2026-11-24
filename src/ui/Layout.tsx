import { useOnline } from '../app/useOnline';
import type { ReactNode } from 'react';
import { appConfig } from '../config';
import styles from './Layout.module.css';

export function Layout({ children }: { children: ReactNode }) {
  const online = useOnline();
  return <div className={styles.layout} lang="es"><header className={styles.header}>{appConfig.title}</header><main>{!online && <p role="status">Sin conexión: puedes seguir estudiando; todo se guarda en tu móvil.</p>}{children}</main></div>;
}
