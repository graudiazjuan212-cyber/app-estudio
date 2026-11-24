import { lazy, Suspense } from 'react';
import { Layout } from '../ui/Layout';
import { HomeScreen } from './HomeScreen';
import { SettingsScreen } from './SettingsScreen';
import { useRoute } from './useRoute';
import { DataProvider } from './DataProvider';
let Demo: ReturnType<typeof lazy> | undefined;
function AppContent() {
  const enableDemo = import.meta.env.VITE_ENABLE_DEMO === 'true';
  const { route } = useRoute(enableDemo);
  if (import.meta.env.VITE_ENABLE_DEMO === 'true') {
    Demo ??= lazy(() => import('./DemoScreen'));
    if (route.name === 'demo') return <Layout><Suspense fallback={<p>Cargando…</p>}><Demo /></Suspense></Layout>;
  }
  return <Layout>{route.name === 'settings' ? <SettingsScreen /> : <HomeScreen />}</Layout>;
}

export function App() { return <DataProvider><AppContent /></DataProvider>; }
