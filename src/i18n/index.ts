import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { create } from 'zustand';
import { en, type Messages } from './en';

export const defaultNS = 'translation';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS;
    resources: { translation: typeof en };
  }
}

/** The languages of the interface, each named in itself. */
export const LANGUAGES = { en: 'English', fr: 'Français', de: 'Deutsch', es: 'Español' } as const;
export type Language = keyof typeof LANGUAGES;

const STORAGE_KEY = 'grafcetmaker.lang';

/** English is bundled; the others are separate chunks, loaded when chosen. */
const LOAD: Record<Exclude<Language, 'en'>, () => Promise<Messages>> = {
  fr: () => import('./fr').then((m) => m.fr),
  de: () => import('./de').then((m) => m.de),
  es: () => import('./es').then((m) => m.es),
};

const isLanguage = (v: unknown): v is Language => typeof v === 'string' && v in LANGUAGES;

/** The saved choice, else the first browser language the app speaks, else English. */
function startLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isLanguage(saved)) return saved;
  } catch {
    // Storage blocked: follow the browser.
  }
  const tags = typeof navigator === 'undefined' ? [] : navigator.languages;
  return tags.map((tag) => tag.slice(0, 2).toLowerCase()).find(isLanguage) ?? 'en';
}

void i18next.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  defaultNS,
  resources: { en: { translation: en } },
  interpolation: { escapeValue: false },
  returnNull: false,
  initAsync: false,
});

// `{{direction, lowercase}}`: whether a word is lowercased inside a sentence is up to each language
// (German keeps its nouns capitalized).
i18next.services.formatter?.add('lowercase', (value: unknown) => String(value).toLowerCase());

export const useLanguage = create<{ language: Language }>(() => ({ language: 'en' }));

async function apply(language: Language): Promise<void> {
  if (language !== 'en' && !i18next.hasResourceBundle(language, defaultNS))
    i18next.addResourceBundle(language, defaultNS, await LOAD[language]());
  await i18next.changeLanguage(language);
  if (typeof document !== 'undefined') document.documentElement.lang = language;
  useLanguage.setState({ language });
}

/**
 * The starting language, loaded before the first render so the app never flashes in English.
 * If its chunk cannot be loaded (offline before it was ever cached), the app stays in English.
 */
export const i18nReady: Promise<void> = apply(startLanguage()).catch(() => undefined);

export async function setLanguage(language: Language): Promise<void> {
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Not persisted; the choice still applies until the page is reloaded.
  }
  await apply(language);
}

export default i18next;
