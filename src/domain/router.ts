export type Route =
  | { name: 'home' }
  | { name: 'subject'; subjectId: string }
  | { name: 'session'; subjectId: string; mode: 'auto' | 'review' | 'exam'; chapterId?: string }
  | { name: 'settings' };

export function parseRoute(hash: string): Route {
  if (hash === '#/ajustes') return { name: 'settings' };
  const parts = hash.split('/');
  const [prefix, section, encodedId, action, encodedChapter] = parts;
  if (prefix !== '#' || !encodedId) return { name: 'home' };
  try {
    const subjectId = decodeURIComponent(encodedId);
    if (section === 'asignatura' && parts.length === 3) return { name: 'subject', subjectId };
    if (section === 'sesion') {
      if (parts.length === 3) return { name: 'session', subjectId, mode: 'auto' };
      if (parts.length === 5 && encodedChapter && (action === 'repasar' || action === 'examen')) {
        return { name: 'session', subjectId, mode: action === 'repasar' ? 'review' : 'exam', chapterId: decodeURIComponent(encodedChapter) };
      }
    }
  } catch {
    return { name: 'home' };
  }
  return { name: 'home' };
}

export function buildHash(route: Route): string {
  switch (route.name) {
    case 'home': return '#/';
    case 'settings': return '#/ajustes';
    case 'subject': return `#/asignatura/${encodeURIComponent(route.subjectId)}`;
    case 'session': {
      const base = `#/sesion/${encodeURIComponent(route.subjectId)}`;
      if (route.mode === 'auto') return base;
      if (!route.chapterId) throw new Error('La ruta de repaso o examen requiere un capítulo.');
      return `${base}/${route.mode === 'review' ? 'repasar' : 'examen'}/${encodeURIComponent(route.chapterId)}`;
    }
  }
}
