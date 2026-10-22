import type { TFunction } from 'i18next';

type Loose = (key: string, params?: Record<string, unknown>) => string;

/**
 * Translates a key computed at runtime (diagnostic codes, rule ids). Static keys should use `t`
 * directly so missing translations are caught by the type checker.
 */
export function tDynamic(t: TFunction, key: string, params?: Record<string, unknown>): string {
  return (t as unknown as Loose)(key, params);
}
