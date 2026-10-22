/**
 * The kinds of action offered to the user. "Conditional" is a continuous action with an
 * assignment condition (IEC 60848 draws the condition on a line above the box); in the model it is
 * \`kind: 'continuous'\` with a \`condition\` (possibly still empty while it is being written).
 */
import type { Action } from './types';

export const ACTION_UI_KINDS = [
  'continuous',
  'conditional',
  'storedOnActivation',
  'storedOnDeactivation',
  'storedOnEvent',
  'forcing',
] as const;

export type ActionUiKind = (typeof ACTION_UI_KINDS)[number];

export function uiKindOf(a: Pick<Action, 'kind' | 'condition'>): ActionUiKind {
  return a.kind === 'continuous' && a.condition !== undefined ? 'conditional' : a.kind;
}

/**
 * Switches an action to another kind (mutates it). The condition is kept where it still means
 * something (between conditional and on-event it is the condition / the event) and dropped
 * elsewhere; a conditional action gets an empty condition to be filled in.
 */
export function setUiKind(a: Action, kind: ActionUiKind): void {
  if (kind === 'conditional') {
    a.kind = 'continuous';
    a.condition ??= '';
    return;
  }
  a.kind = kind;
  if (kind !== 'storedOnEvent') delete a.condition;
}
