import { UpdateBanner } from './UpdateBanner';
import { lazy, Suspense } from 'react';
import { Layout } from '../ui/Layout';
import { SessionScreen } from './SessionScreen';
import { SummaryScreen } from './SummaryScreen';
import { HomeScreen } from './HomeScreen';
import { SubjectScreen } from './SubjectScreen';
import { SettingsScreen } from './SettingsScreen';
import { useRoute } from './useRoute';
import { DataProvider } from './DataProvider';
let Demo: ReturnType<typeof lazy> | undefined;
function RoutedContent() {
  const enableDemo = import.meta.env.VITE_ENABLE_DEMO === 'true';
  const { route } = useRoute(enableDemo);
  if (import.meta.env.VITE_ENABLE_DEMO === 'true') {
    Demo ??= lazy(() => import('./DemoScreen'));
    if (route.name === 'demo') return <Layout><Suspense fallback={<p>Cargando…</p>}><Demo /></Suspense></Layout>;
  }
  if (route.name === 'session') return <main><SessionScreen key={route.sessionId} sessionId={route.sessionId} /></main>;
  return <Layout>{route.name === 'settings' ? <SettingsScreen /> : route.name === 'subject' ? <SubjectScreen subjectId={route.subjectId} /> : route.name === 'summary' ? <SummaryScreen key={route.sessionId} sessionId={route.sessionId} /> : <HomeScreen />}</Layout>;
}

function AppContent() {
  const { route } = useRoute(import.meta.env.VITE_ENABLE_DEMO === 'true');
  return <><UpdateBanner route={route} /><RoutedContent /></>;
}
export function App() {
  if (import.meta.env.VITE_ENABLE_DEMO === 'true') {
    return <DataProvider clock={() => {
      const value = (window as Window & { __ESTUDIO_NOW__?: string }).__ESTUDIO_NOW__;
      return value ? new Date(value) : new Date();
    }}><AppContent /></DataProvider>;
  }
  return <DataProvider><AppContent /></DataProvider>;
}
