import { Layout } from '../ui/Layout';
import { HomeScreen } from './HomeScreen';
import { SettingsScreen } from './SettingsScreen';
import { useRoute } from './useRoute';

export function App() {
  const { route } = useRoute();
  return <Layout>{route.name === 'settings' ? <SettingsScreen /> : <HomeScreen />}</Layout>;
}
