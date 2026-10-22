import * as Tabs from '@radix-ui/react-tabs';
import { useTranslation } from 'react-i18next';
import { setPrefs, usePrefs, type Prefs } from '@/app/prefs';
import { PanelRightIcon } from '@/app/ui/icons';
import { IconButton } from '@/app/ui/primitives';
import { useSim } from '@/editor/simulation/simStore';
import { useDoc } from '@/editor/store/document';
import { OutlinePanel } from './OutlinePanel';
import { PropertiesPanel } from './PropertiesPanel';
import { SimInspector } from './SimInspector';
import { VariablesSidePanel } from './variables/VariablesSidePanel';

const trigger =
  'flex items-center gap-1.5 border-b-2 border-transparent px-3 text-muted hover:text-text data-[state=active]:border-accent data-[state=active]:text-text';

/** Right panel: properties of the selection (or the live inspector while simulating) and variables. */
export function RightPanel() {
  const { t } = useTranslation();
  const tab = usePrefs((s) => s.rightTab);
  const simulating = useSim((s) => s.on);
  const count = useDoc((s) => Object.keys(s.project.variables).length);
  return (
    <Tabs.Root
      value={tab}
      onValueChange={(v) => setPrefs({ rightTab: v as Prefs['rightTab'] })}
      className="flex h-full min-h-0 flex-col"
    >
      <div className="flex h-9 shrink-0 items-center border-b border-border px-1">
        <Tabs.List aria-label={t('props.panelTabs')} className="flex h-full items-stretch">
          <Tabs.Trigger value="properties" className={trigger}>
            {simulating ? t('props.inspector') : t('props.label')}
          </Tabs.Trigger>
          <Tabs.Trigger value="variables" className={trigger}>
            {t('panels.variables')}
            <span className="rounded-full bg-surface-3 px-1.5 text-xs tabular-nums">{count}</span>
          </Tabs.Trigger>
          <Tabs.Trigger value="outline" className={trigger}>
            {t('outline.tab')}
          </Tabs.Trigger>
        </Tabs.List>
        <IconButton
          className="ml-auto h-7 w-7"
          label={t('props.hide')}
          title={t('props.hide')}
          onClick={() => setPrefs({ rightCollapsed: true })}
        >
          <PanelRightIcon size={15} />
        </IconButton>
      </div>
      <Tabs.Content value="properties" className="min-h-0 flex-1 outline-none">
        {simulating ? <SimInspector /> : <PropertiesPanel />}
      </Tabs.Content>
      <Tabs.Content value="variables" className="min-h-0 flex-1 outline-none">
        <VariablesSidePanel />
      </Tabs.Content>
      <Tabs.Content value="outline" className="min-h-0 flex-1 outline-none">
        <OutlinePanel />
      </Tabs.Content>
    </Tabs.Root>
  );
}
