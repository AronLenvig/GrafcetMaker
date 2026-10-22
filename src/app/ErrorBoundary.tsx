import { Component, type ErrorInfo, type ReactNode } from 'react';
import i18next from 'i18next';
import { downloadCopy } from './persistence/session';

interface State {
  error: Error | null;
}

/** Last line of defence: the document survives (and can be downloaded) whatever crashed the UI. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('GrafcetMaker crashed', error, info.componentStack);
  }

  override render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const t = i18next.t.bind(i18next);
    return (
      <div role="alert" className="flex h-full items-center justify-center bg-bg p-6">
        <div className="max-w-lg rounded-lg border border-border bg-surface p-6 shadow-pop">
          <h1 className="text-base font-semibold">{t('crash.title')}</h1>
          <p className="mt-2 text-muted">{t('crash.message')}</p>
          <pre className="mt-3 max-h-40 overflow-auto rounded bg-surface-2 p-2 font-mono text-xs whitespace-pre-wrap">
            {error.message}
          </pre>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              className="h-8 rounded-md bg-accent px-3 font-medium text-accent-fg hover:bg-accent-hover"
              onClick={() => downloadCopy()}
            >
              {t('crash.download')}
            </button>
            <button
              type="button"
              className="h-8 rounded-md border border-border px-3 hover:bg-surface-2"
              onClick={() => window.location.reload()}
            >
              {t('crash.reload')}
            </button>
          </div>
        </div>
      </div>
    );
  }
}
