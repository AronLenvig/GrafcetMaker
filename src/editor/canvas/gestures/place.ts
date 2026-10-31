import type { Grafcet, Id, Point } from '@/core/model/types';
import {
  addActionAt,
  addActionToSelection,
  addCommentAt,
  addStepAt,
  addTransitionAt,
  appendSequence,
  appendTransition,
} from '../../commands/edit';
import { jumpToStep } from '../../commands/structure';
import { toggleInput, useSim } from '../../simulation/simStore';
import { ui, type Tool } from '../../store/uiStore';
import { useInteraction } from '../interactionStore';
import type { GestureContext, Hit } from './gesture';

/** Tools that place an element with a click (the overlay shows its ghost under the pointer). */
const PLACING = new Set(['step', 'transition', 'comment', 'action']);

/**
 * What a press does as a placing press: `place` to run (on release with a finger), or nothing
 * (`panWithFinger`: a finger pans instead). Null: the press is not a placing press.
 */
export type Placing = { place: () => void } | { panWithFinger: boolean } | null;

/**
 * A press that places something, in this order: simulating, an input written in a receptivity or
 * condition switches and the value of a numeric variable shown on the diagram is typed in place;
 * editing, a ghost of the selection adds what it shows, and the placing tools place their element.
 */
export function placingPress(
  ctx: GestureContext,
  g: Grafcet,
  target: Element,
  hit: Hit | null,
  tool: Tool,
  d: Point,
  keepTool: boolean,
): Placing {
  const { readOnly, snapPoint } = ctx;
  // Simulating: an input written in a receptivity or condition switches when clicked.
  const input = readOnly ? target.closest('[data-input]')?.getAttribute('data-input') : null;
  if (input) return { place: () => toggleInput(input) };
  // Simulating: the value of a numeric variable shown on the diagram is typed in place.
  const value = readOnly ? target.closest('[data-value]') : null;
  if (value) {
    const name = value.getAttribute('data-value')!;
    const at = {
      x: Number(value.getAttribute('data-x')),
      y: Number(value.getAttribute('data-y')),
    };
    return {
      place: () => {
        const sim = useSim.getState();
        if (sim.on && !sim.replay && !sim.snapshot?.error)
          useInteraction.setState({ valueEdit: { name, at } });
      },
    };
  }
  // A ghost of the selection: add the action (and type its text), the transition alone, or the
  // transition and step it shows; the new transition or step is selected, so its ghosts are next
  // (Enter would type the receptivity).
  const ghost = target.closest('[data-ghost]')?.getAttribute('data-ghost');
  if (!readOnly && ghost) {
    return {
      place: () =>
        ghost === 'action'
          ? addActionToSelection()
          : ghost === 'transition'
            ? appendTransition()
            : ghost === 'jump'
              ? jumpToStep()
              : appendSequence({ editReceptivity: false }),
    };
  }
  if (!readOnly && tool === 'action') {
    // On a step (or one of its actions): attach. On empty canvas: unattached action.
    const stepId =
      hit?.kind === 'step' && hit.id
        ? hit.id
        : hit?.kind === 'action' && hit.id
          ? (g.actions[hit.id]?.stepId ?? null)
          : null;
    if (!stepId && hit) return { panWithFinger: false };
    return {
      place: () => {
        // Back to Select first: changing tools closes the editor the new action opens.
        if (!keepTool) ui.setTool('select');
        addActionAt(snapPoint(d), stepId);
      },
    };
  }
  if (!readOnly && (tool === 'step' || tool === 'transition' || tool === 'comment')) {
    if (hit) return { panWithFinger: true };
    return {
      place: () => {
        const at = snapPoint(d);
        // Back to Select first: changing tools closes the editor a new comment opens.
        if (!keepTool) ui.setTool('select');
        if (tool === 'step') addStepAt(at);
        else if (tool === 'transition') addTransitionAt(at);
        else addCommentAt(at);
      },
    };
  }
  return null;
}

/**
 * With a placing tool and a mouse or pen: where a click would place the element (the overlay
 * draws its ghost there), or null over an element where a click places nothing.
 */
export function updateCursor(
  readOnly: boolean,
  g: Grafcet | undefined,
  tool: Tool,
  pointerType: string,
  hit: Hit | null,
  at: () => Point,
): void {
  let next: { at: Point; stepId: Id | null } | null = null;
  if (!readOnly && g && pointerType !== 'touch' && PLACING.has(tool)) {
    const stepId =
      tool !== 'action' || !hit?.id
        ? null
        : hit.kind === 'step'
          ? hit.id
          : hit.kind === 'action'
            ? (g.actions[hit.id]?.stepId ?? null)
            : null;
    if (!hit || stepId) next = { at: at(), stepId };
  }
  const cur = useInteraction.getState().cursor;
  if (cur?.stepId !== next?.stepId || cur?.at.x !== next?.at.x || cur?.at.y !== next?.at.y)
    useInteraction.setState({ cursor: next });
}
