/** Editing helpers for expression text (pure: used by inputs and tests). */

const IDENT_CHAR = /[A-Za-z0-9_]/;

export type Edge = '↑' | '↓';

/**
 * Puts a rising / falling edge on the operand at the caret (variable or Xn): adds it, swaps ↑ and ↓,
 * or removes it when the same edge is already there (RE / FE included). Without an operand at the
 * caret the symbol is inserted, ready for the name. Returns the new text and caret.
 */
export function toggleEdge(
  value: string,
  caret: number,
  edge: Edge,
): { text: string; caret: number } {
  let start = caret;
  while (start > 0 && IDENT_CHAR.test(value[start - 1]!)) start--;
  let end = caret;
  while (end < value.length && IDENT_CHAR.test(value[end]!)) end++;
  if (start === end || /^\d/.test(value.slice(start, end))) {
    return { text: value.slice(0, caret) + edge + value.slice(caret), caret: caret + 1 };
  }
  let j = start;
  while (j > 0 && value[j - 1] === ' ') j--;
  let markStart = -1;
  let current: Edge | null = null;
  if (value[j - 1] === '↑' || value[j - 1] === '↓') {
    markStart = j - 1;
    current = value[j - 1] as Edge;
  } else {
    const word = value.slice(Math.max(0, j - 2), j).toUpperCase();
    if (
      (word === 'RE' || word === 'FE') &&
      j - 2 >= 0 &&
      !IDENT_CHAR.test(value[j - 3] ?? ' ') &&
      j < start
    ) {
      markStart = j - 2;
      current = word === 'RE' ? '↑' : '↓';
    }
  }
  if (markStart < 0) {
    return { text: value.slice(0, start) + edge + value.slice(start), caret: caret + 1 };
  }
  const replacement = current === edge ? '' : edge;
  const text = value.slice(0, markStart) + replacement + value.slice(start);
  return { text, caret: caret - (start - markStart) + replacement.length };
}
