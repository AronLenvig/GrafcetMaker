import { useTranslation } from 'react-i18next';
import { toggleProperties, usePropertiesVisible } from '@/app/sheet';
import { CloseIcon } from '@/app/ui/icons';
import { IconButton } from '@/app/ui/primitives';
import { useSim } from '@/editor/simulation/simStore';
import { useDoc } from '@/editor/store/document';
import { useUi } from '@/editor/store/uiStore';
import { FloatingCard, PROPERTIES_CARD_WIDTH } from './panelParts';
import { PropertiesPanel } from './PropertiesPanel';
import { VariableDetails } from './variables/VariableDetails';

/**
 * Desktops: the properties of the selection as a floating card at the left of the canvas, shown
 * only while something is selected (× hides it for that selection), or opened with nothing
 * selected for the grafcet and project. A variable opened from the variable table shows here too.
 * While simulating the simulation card takes this place.
 */
export function PropertiesCard() {
  const { t } = useTranslation();
  const visible = usePropertiesVisible();
  const simulating = useSim((s) => s.on);
  const variableId = useUi((s) => s.focusedVariable);
  const variable = useDoc((s) => (variableId ? s.project.variables[variableId] : undefined));
  if (!visible || simulating) return null;
  return (
    <FloatingCard
      title={variable ? t('variables.detailsOf', { name: variable.name }) : t('props.label')}
      width={PROPERTIES_CARD_WIDTH}
      action={
        <IconButton
          label={t('common.close')}
          title={t('common.close')}
          className="h-7 w-7"
          onClick={toggleProperties}
        >
          <CloseIcon size={14} />
        </IconButton>
      }
    >
      {variable ? (
        <div className="p-4">
          <VariableDetails v={variable} locked={false} />
        </div>
      ) : (
        <PropertiesPanel />
      )}
    </FloatingCard>
  );
}
