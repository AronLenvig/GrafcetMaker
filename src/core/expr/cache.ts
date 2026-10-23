import type { Assignment, BoolNode, ForcingOrder, ParseResult } from './ast';
import { parseAssignment, parseBool, parseForcing, parseOutputName } from './parser';

const MAX_ENTRIES = 4000;

/** Memoizes a function of a source text (bounded: the oldest entries go first). */
export function memoBySource<T>(parse: (s: string) => T): (s: string) => T {
  const cache = new Map<string, T>();
  return (source: string) => {
    let hit = cache.get(source);
    if (hit === undefined) {
      hit = parse(source);
      if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value as string);
      cache.set(source, hit);
    }
    return hit;
  };
}

/** Parsers memoized by source text: ASTs are immutable and shared by renderer, validation and simulation. */
export const cachedBool: (s: string) => ParseResult<BoolNode> = memoBySource(parseBool);
export const cachedAssignment: (s: string) => ParseResult<Assignment> =
  memoBySource(parseAssignment);
export const cachedOutput: (
  s: string,
) => ParseResult<{ name: string; start: number; end: number }> = memoBySource(parseOutputName);
export const cachedForcing: (s: string) => ParseResult<ForcingOrder> = memoBySource(parseForcing);
