import { useTranslation } from 'react-i18next';
import { openAppDialog } from '@/editor/commands/registry';
import { dismissUpdate, reloadToUpdate, usePwa } from './pwa';
import { Button } from './ui/primitives';

/** "New version available" and, after an update, "What's new": a card in the bottom-right corner. */
export function UpdateBanner() {
  const { t } = useTranslation();
  const needRefresh = usePwa((s) => s.needRefresh);
  const updatedFrom = usePwa((s) => s.updatedFrom);
  if (!needRefresh && !updatedFrom) return null;
  return (
    <div
      role="status"
      className="fixed right-3 bottom-[68px] z-40 flex max-w-sm flex-col gap-2 rounded-lg border border-border bg-surface p-3 text-text shadow-pop"
    >
      {needRefresh ? (
        <>
          <p>{t('pwa.updateReady')}</p>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={dismissUpdate}>
              {t('pwa.later')}
            </Button>
            <Button size="sm" variant="primary" onClick={reloadToUpdate}>
              {t('pwa.reload')}
            </Button>
          </div>
        </>
      ) : (
        <>
          <p>{t('pwa.updated', { version: __APP_VERSION__ })}</p>
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => usePwa.setState({ updatedFrom: null })}
            >
              {t('common.close')}
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                usePwa.setState({ updatedFrom: null });
                openAppDialog('changelog');
              }}
            >
              {t('pwa.whatsNew')}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
