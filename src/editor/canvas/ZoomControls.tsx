import { useTranslation } from 'react-i18next';
import { FitIcon, MinusIcon, PlusIcon } from '@/app/ui/icons';
import { useCompact } from '@/app/ui/media';
import type { Id } from '@/core/model/types';
import { fitToContent, setZoom, zoomBy } from './viewport';

const btn =
  'flex h-9 min-w-9 items-center justify-center rounded-lg px-1 text-muted hover:bg-surface-2 hover:text-text';

/** Zoom out, the zoom (click: 100 %), zoom in and fit. Phones: only fit, over the canvas. */
export function ZoomControls({ gid, zoom }: { gid: Id; zoom: number }) {
  const { t } = useTranslation();
  // Phones zoom with two fingers: only "fit", out of the way of the selection toolbar.
  if (useCompact())
    return (
      <button
        type="button"
        className="absolute top-2 right-2 flex h-10 w-10 items-center justify-center rounded-md border border-border bg-surface text-muted shadow-pop hover:text-text"
        onClick={() => fitToContent(gid)}
        aria-label={t('view.fit')}
        title={t('view.fit')}
      >
        <FitIcon size={18} />
      </button>
    );
  return (
    <div className="gm-island flex items-center gap-0.5 p-0.5">
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
