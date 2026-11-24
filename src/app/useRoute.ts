import { useEffect, useState } from 'react';
import { buildHash, parseRoute } from '../domain/router';
import type { Route } from '../domain/router';

export function useRoute(enableDemo = false) {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash, enableDemo));
  useEffect(() => {
    const update = () => { setRoute(parseRoute(window.location.hash, enableDemo)); };
    window.addEventListener('hashchange', update);
    return () => { window.removeEventListener('hashchange', update); };
  }, [enableDemo]);
  const navigate = (next: Route) => { window.location.hash = buildHash(next); };
  return { route, navigate };
}
