/**
 * Tokenizer for receptivities, conditions, assignments and forcing orders.
 * ASCII input with the textbook symbols accepted as aliases (· ¬ ↑ ↓ ≠ ≤ ≥).
 */

export type TokenKind =
  | 'ident'
  | 'number'
  | 'duration'
  | 'true'
  | 'false'
  | 'plus' // + : OR, or arithmetic addition
  | 'minus'
  | 'star' // * : AND, or arithmetic multiplication
  | 'slash' // / : NOT, timer separator, or division
  | 'dot' // · : AND
  | 'or' // OR ||
  | 'and' // AND &&
  | 'not' // NOT ! ¬
  | 'rise' // RE ↑
  | 'fall' // FE ↓
  | 'mod'
  | 'cmp'
  | 'assign'
  | 'lparen'
  | 'rparen'
  | 'lbrace'
  | 'rbrace'
  | 'comma'
  | 'eof';

export type CmpOp = '=' | '<>' | '<' | '<=' | '>' | '>=';

export interface Token {
  kind: TokenKind;
  text: string;
  start: number;
  end: number;
  /** number: its value; duration: milliseconds. */
  value?: number;
  /** number: written without a decimal point. */
  isInt?: boolean;
  cmp?: CmpOp;
}

export class LexError extends Error {
  constructor(
    readonly code: 'unexpectedChar' | 'invalidNumber',
    readonly start: number,
    readonly end: number,
    readonly params: Record<string, string> = {},
  ) {
    super(code);
    this.name = 'LexError';
  }
}

const KEYWORDS: Record<string, TokenKind> = {
  and: 'and',
  or: 'or',
  not: 'not',
  re: 'rise',
  fe: 'fall',
  true: 'true',
  false: 'false',
  mod: 'mod',
};

/** Reserved words (case-insensitive): cannot be used as variable or grafcet names. */
export const RESERVED_WORDS = new Set([...Object.keys(KEYWORDS), 'init']);

export const DURATION_UNITS: Record<string, number> = { ms: 1, s: 1000, min: 60_000, h: 3_600_000 };

const isIdentStart = (c: string) => /[A-Za-z_]/.test(c);
const isIdentPart = (c: string) => /[A-Za-z0-9_]/.test(c);
const isDigit = (c: string) => c >= '0' && c <= '9';

const SYMBOLS: [string, TokenKind, CmpOp?][] = [
  [':=', 'assign'],
  ['<>', 'cmp', '<>'],
  ['!=', 'cmp', '<>'],
  ['<=', 'cmp', '<='],
  ['>=', 'cmp', '>='],
  ['==', 'cmp', '='],
  ['||', 'or'],
  ['&&', 'and'],
  ['≠', 'cmp', '<>'],
  ['≤', 'cmp', '<='],
  ['≥', 'cmp', '>='],
  ['=', 'cmp', '='],
  ['<', 'cmp', '<'],
  ['>', 'cmp', '>'],
  ['+', 'plus'],
  ['-', 'minus'],
  ['*', 'star'],
  ['×', 'star'],
  ['/', 'slash'],
  ['·', 'dot'],
  ['⋅', 'dot'],
  ['•', 'dot'],
  ['!', 'not'],
  ['¬', 'not'],
  ['↑', 'rise'],
  ['↓', 'fall'],
  ['(', 'lparen'],
  [')', 'rparen'],
  ['{', 'lbrace'],
  ['}', 'rbrace'],
  [',', 'comma'],
];

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = source.length;
  outer: while (i < n) {
    const c = source[i]!;
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
      i++;
      continue;
    }
    const start = i;
    if (isDigit(c)) {
      while (i < n && isDigit(source[i]!)) i++;
      let isInt = true;
      if (source[i] === '.' && isDigit(source[i + 1] ?? '')) {
        isInt = false;
        i++;
        while (i < n && isDigit(source[i]!)) i++;
      }
      const numText = source.slice(start, i);
      if (i < n && isIdentStart(source[i]!)) {
        const unitStart = i;
        while (i < n && isIdentPart(source[i]!)) i++;
        const unit = source.slice(unitStart, i).toLowerCase();
        const factor = DURATION_UNITS[unit];
        if (factor === undefined) {
          throw new LexError('invalidNumber', start, i, { text: source.slice(start, i) });
        }
        tokens.push({
          kind: 'duration',
          text: source.slice(start, i),
          start,
          end: i,
          value: Number(numText) * factor,
        });
        continue;
      }
      tokens.push({ kind: 'number', text: numText, start, end: i, value: Number(numText), isInt });
      continue;
    }
    if (isIdentStart(c)) {
      while (i < n && isIdentPart(source[i]!)) i++;
      const text = source.slice(start, i);
      tokens.push({ kind: KEYWORDS[text.toLowerCase()] ?? 'ident', text, start, end: i });
      continue;
    }
    for (const [sym, kind, cmp] of SYMBOLS) {
      if (source.startsWith(sym, i)) {
        i += sym.length;
        tokens.push({ kind, text: sym, start, end: i, ...(cmp ? { cmp } : {}) });
        continue outer;
      }
    }
    throw new LexError('unexpectedChar', start, start + 1, { char: c });
  }
  tokens.push({ kind: 'eof', text: '', start: n, end: n });
  return tokens;
}
