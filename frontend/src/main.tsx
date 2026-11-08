import '@fontsource-variable/inter';
import '@fontsource-variable/manrope';
import './styles/index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { apiClient } from './core/api/apiClient';
import { installCsrfHeader } from './core/auth/csrfToken';

installCsrfHeader(apiClient);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Élément racine #root introuvable');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
