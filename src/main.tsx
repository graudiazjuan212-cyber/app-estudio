import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import 'katex/dist/katex.min.css';
import './styles/global.css';

function start() {
  const root = document.getElementById('root');
  if (!root) throw new Error('No se encuentra el contenedor de la aplicación.');
  createRoot(root).render(<StrictMode><App /></StrictMode>);
  if (import.meta.env.PROD) {
    void import('virtual:pwa-register').then(({ registerSW }) => { registerSW(); });
  }
}
start();
