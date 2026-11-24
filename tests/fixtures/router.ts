import type { Route } from '../../src/domain/router';

export const validRoutes: { hash: string; route: Route }[] = [
  { hash: '#/', route: { name: 'home' } },
  { hash: '#/ajustes', route: { name: 'settings' } },
  { hash: '#/asignatura/math', route: { name: 'subject', subjectId: 'math' } },
  { hash: '#/sesion/math', route: { name: 'session', subjectId: 'math', mode: 'auto' } },
  { hash: '#/sesion/math/repasar/c1', route: { name: 'session', subjectId: 'math', mode: 'review', chapterId: 'c1' } },
  { hash: '#/sesion/math/examen/c1', route: { name: 'session', subjectId: 'math', mode: 'exam', chapterId: 'c1' } },
  { hash: '#/asignatura/%C3%B1%20%2F%25%23%3F', route: { name: 'subject', subjectId: 'ñ /%#?' } },
  { hash: '#/sesion/a%2Fb', route: { name: 'session', subjectId: 'a/b', mode: 'auto' } },
  { hash: '#/sesion/a%2Fb/repasar/%C3%B1%20%25', route: { name: 'session', subjectId: 'a/b', mode: 'review', chapterId: 'ñ %' } },
  { hash: '#/sesion/a%2Fb/examen/%23%3F', route: { name: 'session', subjectId: 'a/b', mode: 'exam', chapterId: '#?' } },
];
export const homeHashes = ['', '#', '#/unknown', '#/asignatura/%', '#/sesion/%FF', '#/sesion/a/repasar/%', '#/sesion/a/examen/%', '#/sesion//', '#/asignatura/', '#/ajustes/extra', '#/sesion/a/other/c', '#/sesion/a/repasar/', '#/sesion/a/examen', '#/asignatura/a/extra', '/asignatura/a'];
export const missingChapterRoutes: Route[] = [
  { name: 'session', subjectId: 'a', mode: 'review' },
  { name: 'session', subjectId: 'a', mode: 'exam', chapterId: '' },
];
