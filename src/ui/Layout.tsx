import type { ReactNode } from 'react';
import { appConfig } from '../config';
import styles from './Layout.module.css';

export function Layout({ children }: { children: ReactNode }) {
  return <div className={styles.layout} lang="es"><header className={styles.header}>{appConfig.title}</header><main>{children}</main></div>;
}
