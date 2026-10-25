/**
 * Text without the characters XML 1.0 cannot carry (controls other than tab and line breaks,
 * U+FFFE, U+FFFF, lone surrogates): one of them makes a whole SVG or PLCopen file unreadable.
 */
export const xmlChars = (s: string): string =>
  s.replace(/[^\t\n\r\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu, '');
