import { useTranslation } from 'react-i18next';
import { usePrefs } from '@/app/prefs';
import { toggleProperties, usePropertiesVisible, useSheet } from '@/app/sheet';
import { CloseIcon } from '@/app/ui/icons';
import { IconButton } from '@/app/ui/primitives';
import { useSim } from '@/editor/simulation/simStore';
import { useDoc } from '@/editor/store/document';
import { useUi } from '@/editor/store/uiStore';
import { PropertiesPanel } from './PropertiesPanel';
import { SimInspector } from './SimInspector';
import { VariableDetails } from './variables/VariableDetails';

/**
 * Desktops: the properties of the selection as a floating card at the left of the canvas, shown
 * only while something is selected (× hides it for that selection), or opened with nothing
 * selected for the grafcet and project. A variable opened from the variable table shows here too.
 */
export function PropertiesCard() {
  const { t } = useTranslation();
  const visible = usePropertiesVisible();
  const simulating = useSim((s) => s.on);
  const variableId = useUi((s) => s.focusedVariable);
  const variable = useDoc((s) => (variableId ? s.project.variables[variableId] : undefined));
  const panelOpen = useSheet((s) => s.open && s.tab !== 'properties');
  const panelHeight = usePrefs((s) => s.bottomHeight);
  if (!visible) return null;
  const title = variable
    ? t('variables.detailsOf', { name: variable.name })
    : simulating
      ? t('props.inspector')
      : t('props.label');
  // Above the bottom islands, and above the floating panel when it is open.
  const bottom = panelOpen ? panelHeight + 72 : 60;
  return (
    <section
      aria-label={title}
      data-tour="side"
      className="gm-island absolute top-[60px] left-3 z-20 flex w-[288px] flex-col overflow-hidden"
      style={{ maxHeight: `calc(100% - ${60 + bottom}px)` }}
    >
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border pr-1 pl-4">
        <h2 className="min-w-0 flex-1 truncate text-[11px] font-semibold tracking-wider text-muted uppercase">
          {title}
        </h2>
        <IconButton
          label={t('common.close')}
          title={t('common.close')}
          className="h-7 w-7"
          onClick={toggleProperties}
        >
          <CloseIcon size={14} />
        </IconButton>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {variable ? (
          <div className="p-4">
            <VariableDetails v={variable} locked={simulating} />
          </div>
        ) : simulating ? (
          <SimInspector />
        ) : (
          <PropertiesPanel />
        )}
      </div>
    </section>
  );
}
