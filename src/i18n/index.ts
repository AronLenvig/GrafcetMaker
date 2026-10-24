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

/** The language of an address: the app is published at <root>/ and at <root>/<lang>/. */
export function languageOfPath(pathname: string): Language | undefined {
  const lang = /\/([a-z]{2})\/(?:index\.html)?$/.exec(pathname)?.[1];
  return isLanguage(lang) ? lang : undefined;
}

/** The app's root in an address: …/de/ and …/de/index.html are one folder down from it. */
export function rootOfPath(pathname: string): string {
  const folder = pathname.replace(/[^/]*$/, '');
  return languageOfPath(pathname) ? folder.replace(/[^/]+\/$/, '') : folder;
}

function save(language: Language): void {
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Not persisted; the choice still applies until the page is reloaded.
  }
}

/**
 * Countries whose visitors start in French, German or Spanish: the main language of the country,
 * or the one engineering is taught in. Everyone else starts in English.
 */
const COUNTRIES: Record<Exclude<Language, 'en'>, string> = {
  fr: 'FR BE LU MC GP MQ GF RE YT PM NC PF WF BL MF SN CI ML BF NE TD GN BJ TG CM GA CG CD CF BI DJ KM MG HT MA DZ TN',
  de: 'DE AT CH LI',
  es: 'ES MX GT HN SV NI CR PA CU DO PR CO VE EC PE BO CL AR PY UY GQ',
};

/** The language a visitor from a country (ISO 3166 code) starts in. */
export function languageOfCountry(country: string | undefined): Language {
  const found = (Object.keys(COUNTRIES) as (keyof typeof COUNTRIES)[]).find(
    (lang) => country !== undefined && COUNTRIES[lang].split(' ').includes(country),
  );
  return found ?? 'en';
}

/**
 * The language of the address (…/de/), else the saved choice, else, on a first visit, the
 * language of the visitor's country (the site's Worker puts it on <html data-country>; English
 * without it). The language found is remembered, so later visits start in it.
 */
function startLanguage(): Language {
  const fromAddress =
    typeof location === 'undefined' ? undefined : languageOfPath(location.pathname);
  if (fromAddress) {
    save(fromAddress);
    return fromAddress;
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isLanguage(saved)) return saved;
  } catch {
    // Storage blocked: decide from the country each time.
  }
  const first = languageOfCountry(
    typeof document === 'undefined' ? undefined : document.documentElement.dataset.country,
  );
  save(first);
  return first;
}

/** Shows the language in the address: …/de/ becomes …/fr/ (keeping a ?query and #hash). */
function showInAddress(language: Language): void {
  const path = `${rootOfPath(location.pathname)}${language}/`;
  if (path !== location.pathname)
    history.replaceState(history.state, '', path + location.search + location.hash);
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
  save(language);
  await apply(language);
  showInAddress(language);
}

export default i18next;
