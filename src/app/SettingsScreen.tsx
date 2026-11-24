import { InstallGuide } from './InstallGuide';
import { appVersion } from './version';
import { ImportPanel } from './ImportPanel.tsx';
import { PreferencesPanel } from './PreferencesPanel.tsx';
import { BackupPanel } from './BackupPanel.tsx';
import { StoragePanel } from './StoragePanel.tsx';
import { ProgressExportPanel } from './ProgressExportPanel.tsx';
import styles from '../ui/Screens.module.css';
export function SettingsScreen() {
  return <div className={styles.screen}><h1>Ajustes</h1><a href="#/">Volver</a><ImportPanel /><PreferencesPanel /><ProgressExportPanel /><BackupPanel /><StoragePanel /><InstallGuide /><p>Versión de la app: {appVersion()}</p></div>;
}
