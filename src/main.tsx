import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/theme/index.css';
import '@/i18n';
import '@/theme/theme';
import { App } from '@/app/App';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root missing');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
