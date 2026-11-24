import { useEffect, useState } from 'react';
import { buildHash, parseRoute } from '../domain/router';
import type { Route } from '../domain/router';

export function useRoute() {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));
  useEffect(() => {
    const update = () => { setRoute(parseRoute(window.location.hash)); };
    window.addEventListener('hashchange', update);
    return () => { window.removeEventListener('hashchange', update); };
  }, []);
  const navigate = (next: Route) => { window.location.hash = buildHash(next); };
  return { route, navigate };
}
