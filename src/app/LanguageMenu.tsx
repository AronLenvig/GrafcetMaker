import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, setLanguage, useLanguage, type Language } from '@/i18n';
import { IconButton, menuContentClass, menuItemClass } from './ui/primitives';

const CODES = Object.keys(LANGUAGES) as Language[];

/** The languages as radio items, each named in itself (the language button and the main menu). */
export function LanguageItems() {
  const language = useLanguage((s) => s.language);
  return (
    <DropdownMenu.RadioGroup
      value={language}
      onValueChange={(v) => void setLanguage(v as Language)}
    >
      {CODES.map((l) => (
        <DropdownMenu.RadioItem key={l} value={l} lang={l} className={menuItemClass}>
          <span className="w-4 text-center" aria-hidden="true">
            {language === l ? '•' : ''}
          </span>
          <span className="flex-1">{LANGUAGES[l]}</span>
          <span className="text-[11px] text-muted uppercase" aria-hidden="true">
            {l}
          </span>
        </DropdownMenu.RadioItem>
      ))}
    </DropdownMenu.RadioGroup>
  );
}

/** A small button showing the language code; the languages open above it. */
export function LanguageButton() {
  const { t } = useTranslation();
  const language = useLanguage((s) => s.language);
  const label = `${t('language.label')}: ${LANGUAGES[language]}`;
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <IconButton
          label={label}
          title={label}
          className="h-9 w-9 text-[11px] font-semibold tracking-wide uppercase data-[state=open]:bg-surface-2"
        >
          {language}
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          aria-label={t('language.label')}
          className={menuContentClass}
          side="top"
          align="end"
          sideOffset={8}
          collisionPadding={8}
        >
          <LanguageItems />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/** Segmented EN / FR / DE / ES control (the phone menu drawer). */
export function LanguageSwitcher() {
  const { t } = useTranslation();
  const language = useLanguage((s) => s.language);
  return (
    <ToggleGroup.Root
      type="single"
      value={language}
      onValueChange={(v) => v && void setLanguage(v as Language)}
      aria-label={t('language.label')}
      className="flex rounded-md border border-border bg-surface-2 p-0.5"
    >
      {CODES.map((l) => (
        <ToggleGroup.Item
          key={l}
          value={l}
          lang={l}
          aria-label={LANGUAGES[l]}
          title={LANGUAGES[l]}
          className="flex h-6 w-8 items-center justify-center rounded text-[11px] font-semibold text-muted uppercase hover:text-text data-[state=on]:bg-surface data-[state=on]:text-text data-[state=on]:shadow-sm"
        >
          {l}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
