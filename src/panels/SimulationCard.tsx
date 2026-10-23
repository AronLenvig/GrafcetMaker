import { useTranslation } from 'react-i18next';
import { useSheet } from '@/app/sheet';
import { ChevronDownIcon } from '@/app/ui/icons';
import { cx, IconButton } from '@/app/ui/primitives';
import { useSim } from '@/editor/simulation/simStore';
import { SimulationPanel } from './SimulationPanel';

/**
 * Desktops: the simulation as a floating tool on the left, there only while simulating: the
 * inputs to drive first, then outputs and internal values, the evolution log and the scenarios.
 * It folds to its title to free the diagram.
 */
export function SimulationCard() {
  const { t } = useTranslation();
  const on = useSim((s) => s.on);
  const collapsed = useSheet((s) => s.simCollapsed);
  if (!on) return null;
  const toggle = collapsed ? t('panels.expandSimulation') : t('panels.collapseSimulation');
  return (
    <section
      aria-label={t('panels.simulation')}
      className="gm-island absolute top-[60px] left-3 z-20 flex max-h-[calc(100%-132px)] w-[320px] flex-col overflow-hidden"
    >
      <div
        className={cx(
          'flex h-9 shrink-0 items-center gap-2 pr-1 pl-4',
          !collapsed && 'border-b border-border',
        )}
      >
        <h2 className="min-w-0 flex-1 truncate text-[11px] font-semibold tracking-wider text-muted uppercase">
          {t('panels.simulation')}
        </h2>
        <IconButton
          label={toggle}
          title={toggle}
          aria-expanded={!collapsed}
          className="h-7 w-7"
          onClick={() => useSheet.setState({ simCollapsed: !collapsed })}
        >
          <ChevronDownIcon
            size={14}
            className={cx('transition-transform', collapsed && '-rotate-90')}
          />
        </IconButton>
      </div>
      {!collapsed && (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <SimulationPanel stacked />
        </div>
      )}
    </section>
  );
}
