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

/**
 * The help on what the user is working on: the expression being typed, the simulation, the
 * variable or the selected element(s). Null when nothing in particular is selected.
 */
export function contextHelp(): HelpTarget | null {
  const typing = expressionHelp();
  if (typing) return typing;
  if (useSim.getState().on) return H.simulation;
  const { selection, selectedLink, focusedVariable } = useUi.getState();
  if (focusedVariable) return H.variable;
  if (selectedLink) return H.link;
  const ids = Object.keys(selection);
  if (ids.length > 1) return H.severalElements;
  const g = getActiveGrafcet();
  return ids.length === 1 && g ? elementHelp(g, ids[0]!) : null;
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
