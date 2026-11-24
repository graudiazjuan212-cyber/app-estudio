import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { startPwa } from './app/pwa';
import { App } from './app/App';
import 'katex/dist/katex.min.css';
import './styles/global.css';

function start() {
  const root = document.getElementById('root');
  if (!root) throw new Error('No se encuentra el contenedor de la aplicación.');
  createRoot(root).render(<StrictMode><App /></StrictMode>);
  void startPwa();
}
start();
