import type { Route } from '../../src/domain/router';

export const validRoutes: { hash: string; route: Route }[] = [
  { hash: '#/', route: { name: 'home' } },
  { hash: '#/ajustes', route: { name: 'settings' } },
  { hash: '#/asignatura/math', route: { name: 'subject', subjectId: 'math' } },
  { hash: '#/sesion/123e4567-e89b-42d3-a456-426614174000', route: { name: 'session', sessionId: '123e4567-e89b-42d3-a456-426614174000' } },
  { hash: '#/resumen/123e4567-e89b-42d3-a456-426614174000', route: { name: 'summary', sessionId: '123e4567-e89b-42d3-a456-426614174000' } },
  { hash: '#/sesion/a_1-z', route: { name: 'session', sessionId: 'a_1-z' } },
  { hash: `#/asignatura/${'a'.repeat(80)}`, route: { name: 'subject', subjectId: 'a'.repeat(80) } },
  { hash: '#/resumen/0', route: { name: 'summary', sessionId: '0' } },
];
export const homeHashes = ['', '#', '#/unknown', '#/asignatura/%', '#/sesion/%FF', '#/sesion/a/repasar/%', '#/sesion/a/examen/%', '#/sesion//', '#/asignatura/', '#/ajustes/extra', '#/sesion/a/other/c', '#/sesion/a/repasar/', '#/sesion/a/examen', '#/asignatura/a/extra', '/asignatura/a'];
export const invalidIds = ['', 'A', 'a/b', '%', 'ñ /%#?', '%2F', 'a\n', 'ñ', '_a', '-a', 'a'.repeat(81)];
export const invalidRoutes: Route[] = invalidIds.flatMap(id => [
  { name: 'subject', subjectId: id }, { name: 'session', sessionId: id }, { name: 'summary', sessionId: id },
]);
export const invalidHashes = invalidIds.flatMap(id => ['asignatura', 'sesion', 'resumen'].map(section => `#/${section}/${id}`));
invalidHashes.push('#/sesion/math/repasar/c1', '#/sesion/math/examen/c1', '#/sesion/a%2Fb',
  '#/asignatura/%C3%B1%20%2F%25%23%3F', '#/sesion/../x', '#/resumen/%00', '#/asignatura/A B');
