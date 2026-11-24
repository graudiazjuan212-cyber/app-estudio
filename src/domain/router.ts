import { routerConfig } from '../config.ts';

export type Route =
  | { name: 'home' } | { name: 'settings' } | { name: 'demo' }
  | { name: 'subject'; subjectId: string }
  | { name: 'session'; sessionId: string }
  | { name: 'summary'; sessionId: string };

function validId(id: string): boolean { return routerConfig.idPattern.exec(id)?.[0] === id; }
export function parseRoute(hash: string, enableDemo = false): Route {
  if (enableDemo && hash === '#/demo') return { name: 'demo' };
  if (hash === '#/ajustes') return { name: 'settings' };
  const [prefix, section, id, extra] = hash.split('/');
  if (prefix !== '#' || !id || extra !== undefined || !validId(id)) return { name: 'home' };
  if (section === 'asignatura') return { name: 'subject', subjectId: id };
  if (section === 'sesion') return { name: 'session', sessionId: id };
  if (section === 'resumen') return { name: 'summary', sessionId: id };
  return { name: 'home' };
}
export function buildHash(route: Route): string {
  if (route.name === 'home') return '#/';
  if (route.name === 'settings') return '#/ajustes';
  if (route.name === 'demo') return '#/demo';
  const id = route.name === 'subject' ? route.subjectId : route.sessionId;
  if (!validId(id)) throw new Error('El identificador de la ruta no es válido.');
  const section = route.name === 'subject' ? 'asignatura' : route.name === 'session' ? 'sesion' : 'resumen';
  return `#/${section}/${encodeURIComponent(id)}`;
}
