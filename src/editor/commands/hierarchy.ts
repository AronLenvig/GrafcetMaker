import i18next from 'i18next';
import { toast } from '@/app/toasts';
import { convertStep, parentOf, revertToNormal, type HierarchyKind } from '@/core/model/hierarchy';
import type { Id, StepKind } from '@/core/model/types';
import { fitToContent } from '../canvas/viewport';
import { doc, getActiveGrafcet, getProject } from '../store/document';
import { ui } from '../store/uiStore';
import { setActiveGrafcet } from './edit';

const t = i18next.t.bind(i18next);

function selectedStepId(): Id | null {
  const g = getActiveGrafcet();
  const ids = ui.selectedIds();
  return g && ids.length === 1 && g.steps[ids[0]!] ? ids[0]! : null;
}

/** Changes a step's kind; macro-step and enclosing step get a new sub-grafcet if needed. */
export function setStepKind(stepId: Id, kind: StepKind): void {
  const g = getActiveGrafcet();
  const s = g?.steps[stepId];
  if (!g || !s || s.kind === kind) return;
  if (kind === 'macro' || kind === 'enclosing') {
    if (s.kind === 'initial') {
      toast(t('hierarchy.initialCannotConvert'), 'warning');
      return;
    }
    let child: Id | null = null;
    doc.execute('history.convertStep', (p) => {
      if (s.kind !== 'normal') revertToNormal(p, g.id, stepId);
      child = convertStep(p, g.id, stepId, kind as HierarchyKind);
    });
    const name = child ? getProject().grafcets[child]?.name : undefined;
    if (name)
      toast(
        t(kind === 'macro' ? 'hierarchy.expansionCreated' : 'hierarchy.enclosedCreated', { name }),
        'success',
      );
    return;
  }
  doc.execute('history.convertStep', (p) => {
    revertToNormal(p, g.id, stepId);
    const step = p.grafcets[g.id]?.steps[stepId];
    if (step) step.kind = kind;
  });
}

export function convertSelected(kind: HierarchyKind): void {
  const id = selectedStepId();
  if (id) setStepKind(id, kind);
}

/** Opens the expansion of a macro-step or the grafcet enclosed by an enclosing step. */
export function openChild(stepId: Id | null = selectedStepId()): boolean {
  const g = getActiveGrafcet();
  const ref = stepId ? g?.steps[stepId]?.refGrafcetId : undefined;
  if (!ref || !getProject().grafcets[ref]) return false;
  setActiveGrafcet(ref);
  requestAnimationFrame(() => fitToContent(ref));
  return true;
}

/** From an expansion or enclosed grafcet back to the step that uses it. */
export function goToParent(): void {
  const g = getActiveGrafcet();
  if (!g) return;
  const parent = parentOf(getProject(), g.id);
  if (!parent) return;
  setActiveGrafcet(parent.grafcet.id);
  ui.select([parent.step.id]);
  requestAnimationFrame(() => {
    fitToContent(parent.grafcet.id);
    ui.flash([parent.step.id]);
  });
}

export function canOpenChild(): boolean {
  const id = selectedStepId();
  return !!id && !!getActiveGrafcet()?.steps[id]?.refGrafcetId;
}

export function canGoToParent(): boolean {
  const g = getActiveGrafcet();
  return !!g && !!parentOf(getProject(), g.id);
}
