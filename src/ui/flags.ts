/**
 * Flags of the interface languages, drawn as SVG (flag emoji do not render on Windows). Plain data,
 * so the app (React) and the website (static HTML, src/site) draw the same flags. Simplified for
 * a 21 × 14 icon: no coat of arms, the Union Jack without its counterchange; the Nordic crosses
 * keep their place off centre; Portuguese is Brazil's (the language is Brazilian Portuguese).
 */
export interface FlagShape {
  d: string;
  fill?: string;
  stroke?: string;
  width?: number;
}

export interface Flag {
  viewBox: string;
  shapes: FlagShape[];
}

const UNION = 'M30 0v30M0 15h60';
const SALTIRE = 'M0 0l60 30M60 0L0 30';

export const FLAGS: Record<
  'en' | 'fr' | 'de' | 'es' | 'da' | 'sv' | 'pt' | 'pl' | 'ru' | 'zh' | 'hi',
  Flag
> = {
  en: {
    viewBox: '0 0 60 30',
    shapes: [
      { d: 'M0 0h60v30H0z', fill: '#012169' },
      { d: SALTIRE, stroke: '#fff', width: 6 },
      { d: SALTIRE, stroke: '#c8102e', width: 2 },
      { d: UNION, stroke: '#fff', width: 10 },
      { d: UNION, stroke: '#c8102e', width: 6 },
    ],
  },
  fr: {
    viewBox: '0 0 3 2',
    shapes: [
      { d: 'M0 0h1v2H0z', fill: '#0055a4' },
      { d: 'M1 0h1v2H1z', fill: '#fff' },
      { d: 'M2 0h1v2H2z', fill: '#ef4135' },
    ],
  },
  de: {
    viewBox: '0 0 5 3',
    shapes: [
      { d: 'M0 0h5v1H0z', fill: '#000' },
      { d: 'M0 1h5v1H0z', fill: '#dd0000' },
      { d: 'M0 2h5v1H0z', fill: '#ffce00' },
    ],
  },
  es: {
    viewBox: '0 0 3 2',
    shapes: [
      { d: 'M0 0h3v2H0z', fill: '#c60b1e' },
      { d: 'M0 .5h3v1H0z', fill: '#ffc400' },
    ],
  },
  da: {
    viewBox: '0 0 37 28',
    shapes: [
      { d: 'M0 0h37v28H0z', fill: '#c8102e' },
      { d: 'M12 0h4v28h-4zM0 12h37v4H0z', fill: '#fff' },
    ],
  },
  sv: {
    viewBox: '0 0 16 10',
    shapes: [
      { d: 'M0 0h16v10H0z', fill: '#006aa7' },
      { d: 'M5 0h2v10H5zM0 4h16v2H0z', fill: '#fecc02' },
    ],
  },
  pt: {
    viewBox: '0 0 20 14',
    shapes: [
      { d: 'M0 0h20v14H0z', fill: '#009b3a' },
      { d: 'M1.7 7L10 1.2L18.3 7L10 12.8z', fill: '#fedf00' },
      { d: 'M6.5 7a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0z', fill: '#002776' },
    ],
  },
  pl: {
    viewBox: '0 0 8 5',
    shapes: [
      { d: 'M0 0h8v5H0z', fill: '#fff' },
      { d: 'M0 2.5h8v2.5H0z', fill: '#dc143c' },
    ],
  },
  ru: {
    viewBox: '0 0 3 2',
    shapes: [
      { d: 'M0 0h3v2H0z', fill: '#fff' },
      { d: 'M0 .667h3v.667H0z', fill: '#0039a6' },
      { d: 'M0 1.333h3v.667H0z', fill: '#d52b1e' },
    ],
  },
  zh: {
    viewBox: '0 0 30 20',
    shapes: [
      { d: 'M0 0h30v20H0z', fill: '#ee1c25' },
      {
        d: 'M5 2L5.67 4.07L7.85 4.07L6.09 5.35L6.76 7.43L5 6.15L3.24 7.43L3.91 5.35L2.15 4.07L4.33 4.07z',
        fill: '#ffff00',
      },
      {
        d: 'M9.14 2.51L9.62 1.97L9.25 1.34L9.91 1.63L10.39 1.08L10.33 1.8L11 2.09L10.29 2.25L10.22 2.97L9.85 2.35zM11.01 4.14L11.66 3.82L11.56 3.1L12.07 3.62L12.72 3.3L12.38 3.95L12.88 4.47L12.17 4.34L11.83 4.99L11.73 4.27zM11.04 6.73L11.76 6.7L11.96 6L12.21 6.68L12.94 6.66L12.37 7.1L12.62 7.79L12.01 7.38L11.44 7.83L11.64 7.13zM9.22 8.38L9.9 8.63L10.35 8.06L10.32 8.79L11 9.05L10.3 9.24L10.26 9.96L9.87 9.36L9.16 9.55L9.62 8.98z',
        fill: '#ffff00',
      },
    ],
  },
  hi: {
    viewBox: '0 0 3 2',
    shapes: [
      { d: 'M0 0h3v.667H0z', fill: '#ff9933' },
      { d: 'M0 .667h3v.667H0z', fill: '#fff' },
      { d: 'M0 1.333h3v.667H0z', fill: '#138808' },
      { d: 'M1.25 1a.25.25 0 1 0 .5 0a.25.25 0 1 0-.5 0', stroke: '#000080', width: 0.05 },
    ],
  },
};

/** The flag as SVG markup, for static pages. */
export function flagSvg(lang: keyof typeof FLAGS, className = ''): string {
  const { viewBox, shapes } = FLAGS[lang];
  const paths = shapes
    .map((s) =>
      s.stroke
        ? `<path d="${s.d}" fill="none" stroke="${s.stroke}" stroke-width="${s.width}"/>`
        : `<path d="${s.d}" fill="${s.fill}"/>`,
    )
    .join('');
  return `<svg class="${className}" viewBox="${viewBox}" width="21" height="14" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">${paths}</svg>`;
}
