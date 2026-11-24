import { useEffect, useRef, useState } from 'react';
import type { DependencyList } from 'react';
export interface AsyncState<T> { status: 'loading' | 'ready' | 'error'; data: T | undefined; error: unknown }
function isCancelled(request: { cancelled: boolean }): boolean { return request.cancelled; }
export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading', data: undefined, error: undefined });
  const active = useRef<{ deps: DependencyList; cancelled: boolean } | undefined>(undefined);
  useEffect(() => {
    const previous = active.current;
    if (previous && previous.deps.length === deps.length && deps.every((value, i) => Object.is(value, previous.deps[i]))) return;
    if (previous) previous.cancelled = true;
    const request: { deps: DependencyList; cancelled: boolean } = { deps: [...deps], cancelled: false };
    active.current = request;
    void Promise.resolve().then(async () => {
      if (request.cancelled) return;
      // Keep the previous data while reloading so screens do not flash empty after a save.
      setState(previous => ({ status: 'loading', data: previous.data, error: undefined }));
      try {
        const data = await fn();
        if (!isCancelled(request)) setState({ status: 'ready', data, error: undefined });
      } catch (error) {
        if (!isCancelled(request)) setState({ status: 'error', data: undefined, error });
      }
    });
  });
  useEffect(() => () => {
    if (active.current) active.current.cancelled = true;
    active.current = undefined;
  }, []);
  return state;
}
