/**
 * Languages of the website guide (docs/guide/<lang>.md, published at <lang>/) and the words of its
 * page frame. Titles and descriptions are what search engines show, so keep them short: about 60
 * and 155 characters.
 */
export const LANGS = ['en', 'fr', 'de', 'es', 'da', 'sv'] as const;
export type Lang = (typeof LANGS)[number];

/** The guide linked from the app, the page for search engines' x-default and the sitemap's first. */
export const DEFAULT_LANG: Lang = 'en';

export interface SiteText {
  /** Name of the language in itself (language switcher). */
  language: string;
  /** Open Graph locale. */
  locale: string;
  title: string;
  description: string;
  /** Date of the last content change: the "Updated" line, the sitemap and the structured data. */
  updated: string;
  updatedLabel: string;
  skip: string;
  contents: string;
  languages: string;
  openEditor: string;
  openExample: string;
  /** Name of the guide in the breadcrumb of search results. */
  guide: string;
  /** The editor's page (<lang>/): what search results and link previews show. English is index.html's own text. */
  appTitle: string;
  appDescription: string;
  ogTitle: string;
  ogDescription: string;
  /** Heading of the list of every page, in the editor page's text for readers without JavaScript. */
  documentation: string;
  footer: string;
}

export const SITE_TEXT: Record<Lang, SiteText> = {
  en: {
    language: 'English',
    locale: 'en_US',
    title: 'What is GRAFCET? Complete guide to IEC 60848 with examples',
    description:
      'GRAFCET explained: steps, transitions, receptivities, actions, the five evolution rules, OR and AND branches, macro-steps and forcing, with diagrams and examples.',
    updated: '2026-10-23',
    updatedLabel: 'Updated',
    skip: 'Skip to content',
    contents: 'On this page',
    languages: 'Language',
    openEditor: 'Open the editor',
    openExample: 'Open this example in the editor',
    guide: 'GRAFCET guide',
    appTitle: 'Free online GRAFCET editor and simulator (IEC 60848) | GrafcetMaker',
    appDescription:
      'Draw, check and simulate GRAFCET charts (IEC 60848) in your browser. Free and open source, works offline. Export to PDF, SVG, Structured Text and PLCopen XML.',
    ogTitle: 'GrafcetMaker: free online GRAFCET editor and simulator',
    ogDescription:
      'Draw, check and simulate GRAFCET charts (IEC 60848) in your browser. Free and open source, works offline, no account.',
    documentation: 'Documentation',
    footer:
      'GrafcetMaker is a free, open-source (MIT) GRAFCET editor and simulator. It runs in your browser, works offline and needs no account.',
  },
  fr: {
    language: 'Français',
    locale: 'fr_FR',
    title: 'GRAFCET : cours complet (IEC 60848), règles et exemples',
    description:
      'Le GRAFCET expliqué : étapes, transitions, réceptivités, actions, les cinq règles d’évolution, divergences en OU et en ET, macro-étapes et forçage, avec exemples.',
    updated: '2026-10-23',
    updatedLabel: 'Mis à jour le',
    skip: 'Aller au contenu',
    contents: 'Sur cette page',
    languages: 'Langue',
    openEditor: 'Ouvrir l’éditeur',
    openExample: 'Ouvrir cet exemple dans l’éditeur',
    guide: 'Cours GRAFCET',
    appTitle: 'Éditeur et simulateur de GRAFCET gratuit en ligne (IEC 60848) | GrafcetMaker',
    appDescription:
      'Dessinez, vérifiez et simulez des grafcets (IEC 60848) dans votre navigateur. Gratuit et open source, hors ligne. Export PDF, SVG, Structured Text et PLCopen XML.',
    ogTitle: 'GrafcetMaker : éditeur et simulateur de GRAFCET gratuit en ligne',
    ogDescription:
      'Dessinez, vérifiez et simulez des grafcets (IEC 60848) dans votre navigateur. Gratuit et open source, hors ligne, sans compte.',
    documentation: 'Documentation',
    footer:
      'GrafcetMaker est un éditeur et simulateur de GRAFCET gratuit et open source (MIT). Il fonctionne dans le navigateur, hors ligne et sans compte.',
  },
  de: {
    language: 'Deutsch',
    locale: 'de_DE',
    title: 'GRAFCET einfach erklärt: Grundlagen, Regeln und Beispiele',
    description:
      'GRAFCET nach DIN EN 60848 erklärt: Schritte, Transitionen, Aktionen, die fünf Ablaufregeln, Verzweigungen, Makroschritte und Zwangssteuerung mit Beispielen.',
    updated: '2026-10-23',
    updatedLabel: 'Aktualisiert am',
    skip: 'Zum Inhalt springen',
    contents: 'Auf dieser Seite',
    languages: 'Sprache',
    openEditor: 'Editor öffnen',
    openExample: 'Dieses Beispiel im Editor öffnen',
    guide: 'GRAFCET-Leitfaden',
    appTitle: 'Kostenloser GRAFCET-Editor und -Simulator online (IEC 60848) | GrafcetMaker',
    appDescription:
      'GRAFCET-Pläne (IEC 60848) im Browser zeichnen, prüfen und simulieren. Kostenlos, Open Source, offline. Export als PDF, SVG, Structured Text und PLCopen XML.',
    ogTitle: 'GrafcetMaker: kostenloser GRAFCET-Editor und -Simulator online',
    ogDescription:
      'GRAFCET-Pläne (IEC 60848) im Browser zeichnen, prüfen und simulieren. Kostenlos, Open Source, offline und ohne Konto.',
    documentation: 'Dokumentation',
    footer:
      'GrafcetMaker ist ein kostenloser Open-Source-Editor und -Simulator für GRAFCET (MIT-Lizenz). Er läuft im Browser, auch offline und ohne Konto.',
  },
  es: {
    language: 'Español',
    locale: 'es_ES',
    title: 'GRAFCET: qué es, reglas y ejemplos (guía IEC 60848)',
    description:
      'El GRAFCET explicado: etapas, transiciones, receptividades, acciones, las cinco reglas de evolución, divergencias O e Y, macroetapas y forzado, con ejemplos.',
    updated: '2026-10-23',
    updatedLabel: 'Actualizado el',
    skip: 'Ir al contenido',
    contents: 'En esta página',
    languages: 'Idioma',
    openEditor: 'Abrir el editor',
    openExample: 'Abrir este ejemplo en el editor',
    guide: 'Guía de GRAFCET',
    appTitle: 'Editor y simulador de GRAFCET gratis en línea (IEC 60848) | GrafcetMaker',
    appDescription:
      'Dibuja, comprueba y simula grafcets (IEC 60848) en el navegador. Gratis y de código abierto, sin conexión. Exporta a PDF, SVG, Structured Text y PLCopen XML.',
    ogTitle: 'GrafcetMaker: editor y simulador de GRAFCET gratis en línea',
    ogDescription:
      'Dibuja, comprueba y simula grafcets (IEC 60848) en el navegador. Gratis y de código abierto, sin conexión y sin cuenta.',
    documentation: 'Documentación',
    footer:
      'GrafcetMaker es un editor y simulador de GRAFCET gratuito y de código abierto (MIT). Funciona en el navegador, sin conexión y sin cuenta.',
  },
  da: {
    language: 'Dansk',
    locale: 'da_DK',
    title: 'Hvad er GRAFCET? Komplet guide til IEC 60848 med eksempler',
    description:
      'GRAFCET (DS/EN 60848) forklaret: trin, transitioner, aktioner, de fem udviklingsregler, ELLER- og OG-grene, makrotrin og tvangsstyring, med eksempler.',
    updated: '2026-10-24',
    updatedLabel: 'Opdateret',
    skip: 'Gå til indhold',
    contents: 'På denne side',
    languages: 'Sprog',
    openEditor: 'Åbn editoren',
    openExample: 'Åbn dette eksempel i editoren',
    guide: 'GRAFCET-guide',
    appTitle: 'Gratis GRAFCET-editor og -simulator online | GrafcetMaker',
    appDescription:
      'Tegn, kontroller og simuler GRAFCET-diagrammer (IEC 60848) i browseren. Gratis, open source, offline. Eksport til PDF, SVG, Structured Text og PLCopen XML.',
    ogTitle: 'GrafcetMaker: gratis GRAFCET-editor og -simulator online',
    ogDescription:
      'Tegn, kontroller og simuler GRAFCET-diagrammer (IEC 60848) i din browser. Gratis og open source, virker offline, ingen konto.',
    documentation: 'Dokumentation',
    footer:
      'GrafcetMaker er en gratis GRAFCET-editor og -simulator med åben kildekode (MIT). Den kører i din browser, virker offline og kræver ingen konto.',
  },
  sv: {
    language: 'Svenska',
    locale: 'sv_SE',
    title: 'Vad är GRAFCET? Komplett guide till IEC 60848 med exempel',
    description:
      'GRAFCET enligt SS-EN 60848 förklarat: steg, övergångar, aktioner, de fem utvecklingsreglerna, förgreningar, makrosteg och tvångsstyrning, med exempel.',
    updated: '2026-10-24',
    updatedLabel: 'Uppdaterad',
    skip: 'Hoppa till innehållet',
    contents: 'På den här sidan',
    languages: 'Språk',
    openEditor: 'Öppna editorn',
    openExample: 'Öppna exemplet i editorn',
    guide: 'GRAFCET-guide',
    appTitle: 'Gratis GRAFCET-editor och simulator online | GrafcetMaker',
    appDescription:
      'Rita, kontrollera och simulera GRAFCET (IEC 60848) i webbläsaren. Gratis, öppen källkod, offline. Export till PDF, SVG, Structured Text och PLCopen XML.',
    ogTitle: 'GrafcetMaker: gratis GRAFCET-editor och simulator online',
    ogDescription:
      'Rita, kontrollera och simulera GRAFCET-diagram (IEC 60848) i webbläsaren. Gratis och öppen källkod, fungerar offline, inget konto.',
    documentation: 'Dokumentation',
    footer:
      'GrafcetMaker är en kostnadsfri editor och simulator för GRAFCET med öppen källkod (MIT). Den körs i webbläsaren, fungerar offline och kräver inget konto.',
  },
};
