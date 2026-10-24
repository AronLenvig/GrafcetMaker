import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, setLanguage, useLanguage, type Language } from '@/i18n';
import { FLAGS } from './ui/flags';
import { IconButton, menuContentClass, menuItemClass, Tip } from './ui/primitives';

const CODES = Object.keys(LANGUAGES) as Language[];

/** The flag of a language, as a small picture (its name is on the control around it). */
function Flag({ lang }: { lang: Language }) {
  const { viewBox, shapes } = FLAGS[lang];
  return (
    <svg
      viewBox={viewBox}
      width={21}
      height={14}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
      className="shrink-0 rounded-[2px] ring-1 ring-border"
    >
      {shapes.map((s, i) =>
        s.stroke ? (
          <path key={i} d={s.d} fill="none" stroke={s.stroke} strokeWidth={s.width} />
        ) : (
          <path key={i} d={s.d} fill={s.fill} />
        ),
      )}
    </svg>
  );
}

/** The languages as radio items, each named in itself (the language button). */
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
          <Flag lang={l} />
          <span className="flex-1">{LANGUAGES[l]}</span>
        </DropdownMenu.RadioItem>
      ))}
    </DropdownMenu.RadioGroup>
  );
}

/** A small button showing the flag of the language, named on hover; the languages open above it. */
export function LanguageButton() {
  const { t } = useTranslation();
  const language = useLanguage((s) => s.language);
  const label = `${t('language.label')}: ${LANGUAGES[language]}`;
  return (
    <DropdownMenu.Root modal={false}>
      <Tip label={label} side="top">
        <DropdownMenu.Trigger asChild>
          <IconButton label={label} className="h-9 w-9 data-[state=open]:bg-surface-2">
            <Flag lang={language} />
          </IconButton>
        </DropdownMenu.Trigger>
      </Tip>
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

/** Segmented control of the flags (the phone menu drawer). */
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
          className="flex h-7 w-9 items-center justify-center rounded hover:bg-surface data-[state=on]:bg-surface data-[state=on]:shadow-sm"
        >
          <Flag lang={l} />
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
