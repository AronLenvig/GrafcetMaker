import i18next from 'i18next';
import { showDialog } from '@/app/dialogs/dialogStore';
import { toast } from '@/app/toasts';
import { autoLayout } from '@/core/layout/autoLayout';
import { isJump, parseLinkKey } from '@/core/layout/geometry';
import { planRenumber } from '@/core/model/renumber';
import {
  addAlternativeBranch,
  addLoop,
  addParallelBranch,
  addSinkTransition,
  addSourceTransition,
} from '@/core/model/structure';
import type { Id, Transition } from '@/core/model/types';
import { fitToContent, revealElements } from '../canvas/viewport';
import { doc, getActiveGrafcet, getProject } from '../store/document';
import { ui, useUi } from '../store/uiStore';
import { editActive } from './edit';

const t = i18next.t.bind(i18next);

function single(): Id | null {
  const ids = ui.selectedIds();
  return ids.length === 1 ? ids[0]! : null;
}

function revealAndSelect(ids: Id[], select: Id): void {
  ui.select([select]);
  const gid = useUi.getState().activeGrafcetId;
  if (gid) revealElements(gid, ids);
}

/** `P`: parallel branch (AND) next to the selected step, or below the selected transition. */
export function parallelBranch(): void {
  const id = single();
  if (!id) return;
  let created: Id | null = null;
  editActive('history.parallel', (g) => void (created = addParallelBranch(g, id)));
  if (created) revealAndSelect([created], created);
}

/** `O`: alternative branch (OR) from the selected step, or a bypass for the selected transition. */
export function alternativeBranch(): void {
  const id = single();
  if (!id) return;
  let created: { transitionId: Id; stepId?: Id } | null = null;
  editActive('history.alternative', (g) => void (created = addAlternativeBranch(g, id)));
  const c = created as { transitionId: Id; stepId?: Id } | null;
  if (!c) return;
  revealAndSelect([c.transitionId, ...(c.stepId ? [c.stepId] : [])], c.stepId ?? c.transitionId);
  ui.edit({ id: c.transitionId, field: 'receptivity' });
}

/** The transition a jump command acts on: the selected one, or the one the selected link leaves. */
function jumpCandidate(): Transition | undefined {
  const g = getActiveGrafcet();
  if (!g) return undefined;
  const { selectedLink } = useUi.getState();
  const ref = selectedLink ? parseLinkKey(selectedLink) : null;
  const id = ref ? (ref.kind === 'link' && ref.side === 'out' ? ref.transitionId : null) : single();
  return id ? g.transitions[id] : undefined;
}

export function canJump(): boolean {
  const tr = jumpCandidate();
  return !!tr && tr.to.length <= 1;
}

/** `J`: type under the selected transition the step it jumps to (X10), instead of drawing a line. */
export function jumpToStep(): void {
  const tr = jumpCandidate();
  if (!tr || tr.to.length > 1) return;
  ui.select([tr.id]);
  ui.edit({ id: tr.id, field: 'jump' });
}

export function canDrawAs(kind: 'jump' | 'link'): boolean {
  const tr = jumpCandidate();
  return !!tr && tr.to.length === 1 && (kind === 'jump') !== isJump(tr);
}

/** Draws the link of the selected transition to its step as a jump (arrow marked X10), or as a line. */
export function drawAs(kind: 'jump' | 'link'): void {
  const tr = jumpCandidate();
  if (!tr || !canDrawAs(kind)) return;
  editActive('history.jump', (g) => {
    const t = g.transitions[tr.id];
    if (!t) return;
    if (kind === 'jump') t.jump = true;
    else delete t.jump;
  });
  ui.select([tr.id]);
}

export function canStartLoop(): boolean {
  const g = getActiveGrafcet();
  const id = single();
  if (!g || !id) return false;
  return !!g.steps[id] || (!!g.transitions[id] && g.transitions[id].to.length === 0);
}

/** `L`: then click the step to loop back to. */
export function startLoop(): void {
  const id = single();
  if (!id) return;
  if (!canStartLoop()) {
    toast(t('structure.loopNeedsSource'), 'warning');
    return;
  }
  ui.set({ pending: { kind: 'loop', from: id } });
}

export function cancelPending(): void {
  if (useUi.getState().pending) ui.set({ pending: null });
}

export function completeLoop(target: Id): void {
  const pending = useUi.getState().pending;
  ui.set({ pending: null });
  if (!pending) return;
  const g = getActiveGrafcet();
  const fromStep = !!g?.steps[pending.from];
  let loop: Id | null = null;
  editActive('history.loop', (gd) => void (loop = addLoop(gd, pending.from, target)));
  if (!loop) return;
  ui.select([loop]);
  if (fromStep) ui.edit({ id: loop, field: 'receptivity' });
}

export function sourceTransition(): void {
  const id = single();
  const g = getActiveGrafcet();
  if (!id || !g?.steps[id]) return;
  let created: Id | null = null;
  editActive('history.addTransition', (gd) => void (created = addSourceTransition(gd, id)));
  if (created) {
    revealAndSelect([created], created);
    ui.edit({ id: created, field: 'receptivity' });
  }
}

export function sinkTransition(): void {
  const id = single();
  const g = getActiveGrafcet();
  if (!id || !g?.steps[id]) return;
  let created: Id | null = null;
  editActive('history.addTransition', (gd) => void (created = addSinkTransition(gd, id)));
  if (created) {
    revealAndSelect([created], created);
    ui.edit({ id: created, field: 'receptivity' });
  }
}

/** Auto-layout of the active grafcet, or of the selection only. One undo step. */
export function autoLayoutActive(selectionOnly = false): void {
  const g = getActiveGrafcet();
  if (!g) return;
  const only = selectionOnly ? new Set(ui.selectedIds()) : undefined;
  if (only && only.size === 0) return;
  const positions = autoLayout(g, only);
  editActive(selectionOnly ? 'history.layoutSelection' : 'history.layout', (gd) => {
    for (const [id, p] of positions) {
      const s = gd.steps[id];
      if (s) s.position = p;
      const tr = gd.transitions[id];
      if (tr) {
        tr.position = p;
        delete tr.routing;
        // The layout runs top to bottom.
        delete tr.flow;
      }
    }
  });
  if (!selectionOnly) fitToContent(g.id);
}

/** Renumbers the steps of the active grafcet along the flow, updating every reference. */
export async function renumberActive(): Promise<void> {
  const g = getActiveGrafcet();
  if (!g) return;
  const plan = planRenumber(getProject(), g.id);
  if (!plan.ok) {
    await showDialog({
      title: t('structure.renumberConflictTitle'),
      message: t('structure.renumberConflict', {
        numbers: plan.conflicts.map((n) => `X${n}`).join(', '),
      }),
      actions: [{ id: 'ok', label: t('common.ok'), variant: 'primary' }],
      cancelId: 'ok',
    });
    return;
  }
  if (plan.changed === 0) {
    toast(t('structure.renumberNothing'));
    return;
  }
  doc.execute('history.renumber', plan.apply);
  toast(t('structure.renumbered', { count: plan.changed }), 'success');
}
