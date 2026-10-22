import { useTranslation } from 'react-i18next';
import { FitIcon, MinusIcon, PlusIcon } from '@/app/ui/icons';
import type { Id } from '@/core/model/types';
import { fitToContent, setZoom, zoomBy } from './viewport';

const btn =
  'flex h-7 min-w-7 items-center justify-center rounded px-1 text-muted hover:bg-surface-2 hover:text-text';

export function ZoomControls({ gid, zoom }: { gid: Id; zoom: number }) {
  const { t } = useTranslation();
  return (
    <div className="absolute right-3 bottom-3 flex items-center gap-0.5 rounded-md border border-border bg-surface p-0.5 shadow-pop">
      <button
        type="button"
        className={btn}
        onClick={() => zoomBy(gid, 1 / 1.25)}
        aria-label={t('view.zoomOut')}
        title={t('view.zoomOut')}
      >
        <MinusIcon size={14} />
      </button>
      <button
        type="button"
        className={`${btn} w-12 tabular-nums`}
        onClick={() => setZoom(gid, 1)}
        title={t('view.zoomReset')}
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        type="button"
        className={btn}
        onClick={() => zoomBy(gid, 1.25)}
        aria-label={t('view.zoomIn')}
        title={t('view.zoomIn')}
      >
        <PlusIcon size={14} />
      </button>
      <button
        type="button"
        className={btn}
        onClick={() => fitToContent(gid)}
        aria-label={t('view.fit')}
        title={t('view.fit')}
      >
        <FitIcon size={14} />
      </button>
    </div>
  );
}
