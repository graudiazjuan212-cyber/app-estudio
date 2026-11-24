import { dayProgressConfig as texts } from '../config';
import type { BlockDayProgress as Progress } from '../domain/study/index';

export function dayProgressText(progress: Progress): string {
  const missingText = progress.missing === 1 ? texts.singular : texts.plural.replace('{missing}', String(progress.missing));
  const template = progress.voided ? texts.voided : progress.validToday ? texts.valid
    : progress.missing > progress.remaining ? texts.impossible : texts.normal;
  return template.replace('{missingText}', missingText).replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = progress[key as keyof Progress];
    return String(value);
  });
}
export function BlockDayProgress({ progress }: { progress: Progress | null }) {
  return progress ? <p role="status">{dayProgressText(progress)}</p> : null;
}
