import { useTranslation } from 'react-i18next';
import { useSheet } from '@/app/sheet';
import { ChevronDownIcon } from '@/app/ui/icons';
import { cx, IconButton } from '@/app/ui/primitives';
import { useSim } from '@/editor/simulation/simStore';
import { FloatingCard, SIMULATION_CARD_WIDTH } from './panelParts';
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
    <FloatingCard
      title={t('panels.simulation')}
      width={SIMULATION_CARD_WIDTH}
      action={
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
      }
    >
      {collapsed ? undefined : <SimulationPanel stacked />}
    </FloatingCard>
  );
}
