/**
 * Flags of the interface languages, drawn as SVG (flag emoji do not render on Windows). Plain data,
 * so the app (React) and the website (static HTML, src/site) draw the same flags. Simplified for
 * a 21 × 14 icon: no coat of arms, the Union Jack without its counterchange.
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

export const FLAGS: Record<'en' | 'fr' | 'de' | 'es', Flag> = {
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
