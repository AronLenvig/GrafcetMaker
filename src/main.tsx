import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/theme/index.css';
import { i18nReady } from '@/i18n';
import '@/theme/theme';
import { App } from '@/app/App';
import { ErrorBoundary } from '@/app/ErrorBoundary';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root missing');

void i18nReady.then(() =>
  createRoot(root).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  ),
);
