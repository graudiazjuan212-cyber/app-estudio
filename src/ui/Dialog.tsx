import { useEffect, useId, useRef } from 'react';
import type { ReactNode, RefObject } from 'react';
import styles from './Screens.module.css';
interface DialogProps { title: string; onClose: () => void; children: ReactNode; returnFocus?: RefObject<HTMLElement | null> }
export function Dialog({ title, onClose, children, returnFocus }: DialogProps) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  const id = useId();
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    const previous = document.activeElement;
    // The opener may be disabled while it works, so it can name the element that gets focus back.
    const returnTo = returnFocus?.current ?? null;
    const panel = ref.current;
    panel?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
      if (event.key !== 'Tab') return;
      const nodes = panel?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), a[href], textarea:not(:disabled), [tabindex="0"]');
      const first = nodes?.[0], last = nodes?.[nodes.length - 1];
      if (!first) { event.preventDefault(); panel?.focus(); }
      else if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.removeEventListener('keydown', keydown);
      const target = returnTo ?? (previous instanceof HTMLElement ? previous : null);
      target?.focus();
    };
  }, [returnFocus]);
  return <div className={styles.overlay}><div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={id} className={styles.dialog}><h2 id={id}>{title}</h2>{children}</div></div>;
}
