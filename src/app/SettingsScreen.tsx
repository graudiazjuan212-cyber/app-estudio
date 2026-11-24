import { ImportPanel } from './ImportPanel.tsx';
import { PreferencesPanel } from './PreferencesPanel.tsx';
import { BackupPanel } from './BackupPanel.tsx';
import { StoragePanel } from './StoragePanel.tsx';
import styles from '../ui/Screens.module.css';
export function SettingsScreen() {
  return <div className={styles.screen}><h1>Ajustes</h1><a href="#/">Volver</a><ImportPanel /><PreferencesPanel /><BackupPanel /><StoragePanel /></div>;
}
