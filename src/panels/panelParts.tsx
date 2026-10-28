import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { SheetTab } from '@/app/sheet';
import { cx } from '@/app/ui/primitives';
import { useProblems } from '@/editor/validation/problems';

/** Desktops: widths of the cards floating at the left of the canvas. */
export const PROPERTIES_CARD_WIDTH = 320;
export const SIMULATION_CARD_WIDTH = 320;

/** The name of each panel, as on its tab and its button. */
export function usePanelLabel(): (tab: SheetTab) => string {
  const { t } = useTranslation();
  return (tab) =>
    tab === 'properties'
      ? t('props.label')
      : tab === 'outline'
        ? t('outline.tab')
        : t(`panels.${tab}`);
}

/** How many errors and warnings there are, as a small badge (nothing when there are none). */
export function ProblemsBadge({ className }: { className?: string }) {
  const n = useProblems((s) => s.counts.error + s.counts.warning);
  return n ? (
    <span className={cx('rounded-full bg-surface-3 px-1.5 text-xs tabular-nums', className)}>
      {n}
    </span>
  ) : null;
}

/**
 * Desktops: a card floating at the left of the canvas, below the top islands: a small uppercase
 * title with one action (close, fold), and its content scrolling when it is tall.
 */
export function FloatingCard({
  title,
  width,
  action,
  tour,
  children,
}: {
  title: string;
  width: number;
  action: ReactNode;
  /** Its name for the tour (`data-tour`). */
  tour?: string;
  /** Nothing: the card is folded to its title. */
  children?: ReactNode;
}) {
  return (
    <section
      aria-label={title}
      data-tour={tour}
      className="gm-island gm-card absolute top-[60px] left-3 z-20 flex max-h-[calc(100%-132px)] flex-col overflow-hidden"
      style={{ width }}
    >
      <div
        className={cx(
          'flex h-9 shrink-0 items-center gap-2 pr-1 pl-4',
          children !== undefined && 'border-b border-border',
        )}
      >
        <h2 className="min-w-0 flex-1 truncate text-[11px] font-semibold tracking-wider text-muted uppercase">
          {title}
        </h2>
        {action}
      </div>
      {children !== undefined && (
        <div className="gm-thin-scrollbar min-h-0 flex-1 overflow-y-auto">{children}</div>
      )}
    </section>
  );
}
