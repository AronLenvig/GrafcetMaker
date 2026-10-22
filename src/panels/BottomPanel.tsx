import * as Tabs from '@radix-ui/react-tabs';
import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { setPrefs, usePrefs } from '@/app/prefs';
import { ChevronDownIcon, ChevronUpIcon } from '@/app/ui/icons';
import { IconButton } from '@/app/ui/primitives';
import { VariablesPanel } from './VariablesPanel';

export interface BottomTab {
  id: string;
  /** i18n key under `panels.` */
  label: 'variables';
  Component: ComponentType;
}

export const BOTTOM_TABS: BottomTab[] = [
  { id: 'variables', label: 'variables', Component: VariablesPanel },
];

/** Opens the bottom panel on a tab (used by commands such as "Show variables"). */
export function showBottomTab(id: string): void {
  setPrefs({ bottomTab: id, bottomCollapsed: false });
}

/** Tabbed bottom panel (Variables, …). Collapsing keeps the tab strip so it can be reopened. */
export function BottomPanel() {
  const { t } = useTranslation();
  const tab = usePrefs((s) => s.bottomTab);
  const collapsed = usePrefs((s) => s.bottomCollapsed);
  const current = BOTTOM_TABS.some((x) => x.id === tab) ? tab : BOTTOM_TABS[0]!.id;
  return (
    <Tabs.Root
      value={current}
      onValueChange={(v) => setPrefs({ bottomTab: v, bottomCollapsed: false })}
      className="flex h-full min-h-0 flex-col bg-surface"
    >
      <div className="flex h-8 shrink-0 items-center border-b border-border px-1">
        <Tabs.List aria-label={t('panels.label')} className="flex h-full items-stretch">
          {BOTTOM_TABS.map((x) => (
            <Tabs.Trigger
              key={x.id}
              value={x.id}
              className="border-b-2 border-transparent px-3 text-muted hover:text-text data-[state=active]:border-accent data-[state=active]:text-text"
            >
              {t(`panels.${x.label}`)}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        <IconButton
          className="ml-auto h-6 w-6"
          label={collapsed ? t('panels.expand') : t('panels.collapse')}
          onClick={() => setPrefs({ bottomCollapsed: !collapsed })}
        >
          {collapsed ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />}
        </IconButton>
      </div>
      {!collapsed &&
        BOTTOM_TABS.map((x) => (
          <Tabs.Content key={x.id} value={x.id} className="min-h-0 flex-1 outline-none">
            <x.Component />
          </Tabs.Content>
        ))}
    </Tabs.Root>
  );
}
