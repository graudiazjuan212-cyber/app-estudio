import { screenConfig } from '../config.ts';
import styles from './Screens.module.css';
export function ProgressBar({ percent, label }: { percent: number; label: string }) {
  return <div><div className={styles.progress} role="progressbar" aria-label={label} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={screenConfig.percentMax}><span style={{ width: `${String(percent)}%` }} /></div><span>{percent} %</span></div>;
}
