import { computeGeometry, isJump, parseLinkKey } from '@/core/layout/geometry';
import { uiKindOf } from '@/core/model/actionKind';
import { indexGrafcet } from '@/core/model/graph';
import type { Grafcet, Id } from '@/core/model/types';
import { useSim } from '@/editor/simulation/simStore';
import { getActiveGrafcet } from '@/editor/store/document';
import { useUi } from '@/editor/store/uiStore';
import { closeHelp, openHelp, useHelp } from './helpStore';
import { HELP_TARGETS as H, type HelpTarget } from './helpTargets';

/** The help on what is being typed: expression inputs carry their kind in `data-expression`. */
function expressionHelp(): HelpTarget | null {
  const kind =
    document.activeElement instanceof HTMLElement
      ? document.activeElement.dataset.expression
      : undefined;
  if (kind === 'condition') return H.condition;
  if (kind === 'assignment') return H.assignment;
  if (kind === 'forcing') return H.forcing;
  if (kind === 'output') return H.continuousAction;
  return null;
}

/** The help on one element of the diagram. */
function elementHelp(g: Grafcet, id: Id): HelpTarget | null {
  const step = g.steps[id];
  if (step)
    return step.kind === 'macro'
      ? H.macroStep
      : step.kind === 'enclosing'
        ? H.enclosingStep
        : H.step;
  const tr = g.transitions[id];
  if (tr) {
    if (tr.from.length > 1 || tr.to.length > 1) return H.andBranch;
    if (!tr.from.length) return H.sourceTransition;
    const index = indexGrafcet(g);
    const branches =
      tr.from.some((s) => (index.outgoing.get(s)?.length ?? 0) > 1) ||
      tr.to.some((s) => (index.incoming.get(s)?.length ?? 0) > 1);
    return branches ? H.orBranch : H.transition;
  }
  const action = g.actions[id];
  if (action) {
    if (action.kind === 'forcing') return H.forcing;
    if (action.stepId === null) return H.actionWithoutStep;
    const kind = uiKindOf(action);
    return kind === 'continuous' || kind === 'conditional' ? H.continuousAction : H.storedAction;
  }
  return g.comments[id] ? H.comment : null;
}

/** The help on a selected link: a jump's arrow, an AND double line, a loop, or any link. */
function linkHelp(g: Grafcet | undefined, key: string): HelpTarget {
  const ref = parseLinkKey(key);
  if (ref?.kind === 'bar') return H.andBranch;
  const tr = ref && g?.transitions[ref.transitionId];
  if (!g || !ref || !tr) return H.link;
  if (ref.side === 'out' && isJump(tr)) return H.jump;
  return computeGeometry(g).links.find((l) => l.key === key)?.loop ? H.loop : H.link;
}

/**
 * The help on what the user is working on: the expression or jump being typed, the simulation,
 * the variable, the selected element(s), a loop waiting for its step or a placing tool. Null when
 * nothing in particular is selected.
 */
export function contextHelp(): HelpTarget | null {
  const typing = expressionHelp();
  if (typing) return typing;
  if (useSim.getState().on) return H.simulation;
  const { selection, selectedLink, focusedVariable, editing, pending, tool } = useUi.getState();
  if (editing?.field === 'jump') return H.jump;
  if (focusedVariable) return H.variable;
  if (pending?.kind === 'loop') return H.loop;
  const g = getActiveGrafcet();
  if (selectedLink) return linkHelp(g, selectedLink);
  const ids = Object.keys(selection);
  if (ids.length > 1) return H.severalElements;
  if (ids.length === 1 && g) return elementHelp(g, ids[0]!);
  return tool !== 'select' && tool !== 'hand' ? H.tools : null;
}

/**
 * F1: the help on the selection (or what is being typed); again on the same section closes it.
 * With nothing in particular selected it opens and closes the help where it was.
 */
export function toggleContextHelp(): void {
  const target = contextHelp();
  const { open, page, anchor } = useHelp.getState();
  if (open && (!target || (target.page === page && target.anchor === anchor))) closeHelp();
  else if (target) openHelp(target.page, target.anchor);
  else openHelp(page);
}
