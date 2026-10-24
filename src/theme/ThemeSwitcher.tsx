import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { useTranslation } from 'react-i18next';
import { MonitorIcon, MoonIcon, SunIcon } from '@/app/ui/icons';
import { useTheme, type ThemeMode } from './theme';

/** The theme modes with their icons, in menu order. */
export const THEME_OPTIONS: { mode: ThemeMode; Icon: typeof SunIcon }[] = [
  { mode: 'system', Icon: MonitorIcon },
  { mode: 'light', Icon: SunIcon },
  { mode: 'dark', Icon: MoonIcon },
];

/** Segmented System / Light / Dark control. Icons carry text labels for screen readers and tooltips. */
export function ThemeSwitcher() {
  const { t } = useTranslation();
  const mode = useTheme((s) => s.mode);
  const setMode = useTheme((s) => s.setMode);
  return (
    <ToggleGroup.Root
      type="single"
      value={mode}
      onValueChange={(v) => v && setMode(v as ThemeMode)}
      aria-label={t('theme.label')}
      className="flex rounded-md border border-border bg-surface-2 p-0.5"
    >
      {THEME_OPTIONS.map(({ mode: m, Icon }) => (
        <ToggleGroup.Item
          key={m}
          value={m}
          aria-label={t(`theme.${m}`)}
          title={t(`theme.${m}`)}
          className="flex h-6 w-7 items-center justify-center rounded text-muted hover:text-text data-[state=on]:bg-surface data-[state=on]:text-text data-[state=on]:shadow-sm"
        >
          <Icon size={14} />
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
