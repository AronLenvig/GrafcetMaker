/**
 * Languages of the website guide (docs/guide/<lang>.md, published at <lang>/) and the words of its
 * page frame. Titles and descriptions are what search engines show, so keep them short: about 60
 * and 155 characters.
 */
export const LANGS = ['en', 'fr', 'de', 'es', 'da', 'sv', 'pt', 'pl', 'ru', 'zh', 'hi'] as const;
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
  pt: {
    language: 'Português',
    locale: 'pt_BR',
    title: 'O que é GRAFCET? Guia completo da IEC 60848 com exemplos',
    description:
      'GRAFCET explicado: etapas, transições, receptividades, ações, as cinco regras de evolução, divergências OU e E, macroetapas e forçamento, com exemplos.',
    updated: '2026-10-29',
    updatedLabel: 'Atualizado',
    skip: 'Ir para o conteúdo',
    contents: 'Nesta página',
    languages: 'Idioma',
    openEditor: 'Abrir o editor',
    openExample: 'Abrir este exemplo no editor',
    guide: 'Guia de GRAFCET',
    appTitle: 'Editor e simulador de GRAFCET online e gratuito | GrafcetMaker',
    appDescription:
      'Desenhe, verifique e simule GRAFCET (IEC 60848) no navegador. Gratuito, código aberto, offline. Exporta PDF, SVG, Structured Text e PLCopen XML.',
    ogTitle: 'GrafcetMaker: editor e simulador de GRAFCET online e gratuito',
    ogDescription:
      'Desenhe, verifique e simule diagramas GRAFCET (IEC 60848) no navegador. Gratuito e de código aberto, funciona offline, sem conta.',
    documentation: 'Documentação',
    footer:
      'GrafcetMaker é um editor e simulador de GRAFCET gratuito e de código aberto (MIT). Funciona no navegador, também offline, e não exige conta.',
  },
  pl: {
    language: 'Polski',
    locale: 'pl_PL',
    title: 'Czym jest GRAFCET? Pełny przewodnik po IEC 60848 z przykładami',
    description:
      'GRAFCET w pigułce: kroki, tranzycje, warunki, akcje, pięć reguł ewolucji, rozgałęzienia LUB i I, makrokroki i wymuszanie, z diagramami i przykładami.',
    updated: '2026-10-29',
    updatedLabel: 'Zaktualizowano',
    skip: 'Przejdź do treści',
    contents: 'Na tej stronie',
    languages: 'Język',
    openEditor: 'Otwórz edytor',
    openExample: 'Otwórz ten przykład w edytorze',
    guide: 'Przewodnik GRAFCET',
    appTitle: 'Darmowy edytor i symulator GRAFCET online | GrafcetMaker',
    appDescription:
      'Rysuj, sprawdzaj i symuluj GRAFCET (IEC 60848) w przeglądarce. Darmowy, otwarty kod, offline. Eksport do PDF, SVG, Structured Text i PLCopen XML.',
    ogTitle: 'GrafcetMaker: darmowy edytor i symulator GRAFCET online',
    ogDescription:
      'Rysuj, sprawdzaj i symuluj diagramy GRAFCET (IEC 60848) w przeglądarce. Darmowy i otwarty, działa offline, bez konta.',
    documentation: 'Dokumentacja',
    footer:
      'GrafcetMaker to darmowy edytor i symulator GRAFCET o otwartym kodzie (MIT). Działa w przeglądarce, także offline, i nie wymaga konta.',
  },
  ru: {
    language: 'Русский',
    locale: 'ru_RU',
    title: 'Что такое GRAFCET? Полное руководство по IEC 60848 с примерами',
    description:
      'GRAFCET простыми словами: шаги, переходы, условия переходов, действия, пять правил эволюции, ветвления ИЛИ и И, макрошаги и принудительная установка.',
    updated: '2026-10-29',
    updatedLabel: 'Обновлено',
    skip: 'Перейти к содержанию',
    contents: 'На этой странице',
    languages: 'Язык',
    openEditor: 'Открыть редактор',
    openExample: 'Открыть этот пример в редакторе',
    guide: 'Руководство по GRAFCET',
    appTitle: 'Бесплатный онлайн-редактор и симулятор GRAFCET | GrafcetMaker',
    appDescription:
      'Рисуйте, проверяйте и моделируйте GRAFCET (IEC 60848) в браузере. Бесплатно, открытый код, офлайн. Экспорт в PDF, SVG, Structured Text и PLCopen XML.',
    ogTitle: 'GrafcetMaker: бесплатный онлайн-редактор и симулятор GRAFCET',
    ogDescription:
      'Рисуйте, проверяйте и моделируйте диаграммы GRAFCET (IEC 60848) в браузере. Бесплатно, открытый код, работает офлайн, без учётной записи.',
    documentation: 'Документация',
    footer:
      'GrafcetMaker — бесплатный редактор и симулятор GRAFCET с открытым исходным кодом (MIT). Работает в браузере, в том числе офлайн, без учётной записи.',
  },
  zh: {
    language: '中文',
    locale: 'zh_CN',
    title: '什么是 GRAFCET？IEC 60848 完整指南与示例',
    description:
      'GRAFCET 详解：步、转换、转换条件、动作、五条演变规则、选择分支与并行分支、宏步和强制，配有图示和示例。',
    updated: '2026-10-29',
    updatedLabel: '更新于',
    skip: '跳到正文',
    contents: '本页内容',
    languages: '语言',
    openEditor: '打开编辑器',
    openExample: '在编辑器中打开此示例',
    guide: 'GRAFCET 指南',
    appTitle: '免费在线 GRAFCET 编辑器和仿真器（IEC 60848）| GrafcetMaker',
    appDescription:
      '在浏览器中绘制、检查和仿真 GRAFCET（IEC 60848）图。免费开源，可离线使用。可导出为 PDF、SVG、结构化文本（ST）和 PLCopen XML。',
    ogTitle: 'GrafcetMaker：免费在线 GRAFCET 编辑器和仿真器',
    ogDescription:
      '在浏览器中绘制、检查和仿真 GRAFCET 图（IEC 60848）。免费开源，可离线使用，无需注册。',
    documentation: '文档',
    footer:
      'GrafcetMaker 是一款免费、开源（MIT）的 GRAFCET 编辑器和仿真器。它在浏览器中运行，可离线使用，无需注册账号。',
  },
  hi: {
    language: 'हिन्दी',
    locale: 'hi_IN',
    title: 'GRAFCET क्या है? उदाहरणों के साथ IEC 60848 की पूरी गाइड',
    description:
      'GRAFCET की सरल व्याख्या: स्टेप, ट्रांज़िशन, रिसेप्टिविटी, एक्शन, विकास के पाँच नियम, OR और AND शाखाएँ, मैक्रो-स्टेप और फ़ोर्सिंग, उदाहरणों सहित।',
    updated: '2026-10-29',
    updatedLabel: 'अपडेट किया गया',
    skip: 'सामग्री पर जाएँ',
    contents: 'इस पेज पर',
    languages: 'भाषा',
    openEditor: 'एडिटर खोलें',
    openExample: 'यह उदाहरण एडिटर में खोलें',
    guide: 'GRAFCET गाइड',
    appTitle: 'मुफ़्त ऑनलाइन GRAFCET एडिटर और सिम्युलेटर | GrafcetMaker',
    appDescription:
      'ब्राउज़र में GRAFCET (IEC 60848) चार्ट बनाएँ, जाँचें और सिम्युलेट करें। मुफ़्त, ओपन सोर्स, ऑफ़लाइन। PDF, SVG, Structured Text और PLCopen XML में एक्सपोर्ट।',
    ogTitle: 'GrafcetMaker: मुफ़्त ऑनलाइन GRAFCET एडिटर और सिम्युलेटर',
    ogDescription:
      'ब्राउज़र में GRAFCET चार्ट (IEC 60848) बनाएँ, जाँचें और सिम्युलेट करें। मुफ़्त और ओपन सोर्स, ऑफ़लाइन चलता है, अकाउंट की ज़रूरत नहीं।',
    documentation: 'दस्तावेज़',
    footer:
      'GrafcetMaker एक मुफ़्त, ओपन सोर्स (MIT) GRAFCET एडिटर और सिम्युलेटर है। यह आपके ब्राउज़र में चलता है, ऑफ़लाइन भी काम करता है और इसके लिए अकाउंट की ज़रूरत नहीं।',
  },
};
