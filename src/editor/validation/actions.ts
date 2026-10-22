import type { TFunction } from 'i18next';
import { showBottomTab } from '@/app/prefs';
import type { Project } from '@/core/model/types';
import type { Issue, QuickFix } from '@/core/validation/types';
import { tDynamic } from '@/i18n/dynamic';
import { revealElements } from '../canvas/viewport';
import { setActiveGrafcet } from '../commands/edit';
import { renumberActive } from '../commands/structure';
import { createVariable, deleteVariable } from '../commands/variables';
import { doc, getProject } from '../store/document';
import { ui } from '../store/uiStore';

export function issueMessage(t: TFunction, issue: Issue): string {
  return tDynamic(t, issue.messageKey, issue.params);
}

/** Where an issue is, in words: "G1 · Step 3", "G1 · Transition 2 → 3". */
export function issueLocation(t: TFunction, p: Project, issue: Issue): string {
  if (!issue.grafcetId) return t('problems.location.project');
  const g = p.grafcets[issue.grafcetId];
  if (!g) return '';
  const id = issue.elementIds[0];
  const num = (sid: string) => (g.steps[sid] ? String(g.steps[sid].number) : '?');
  let where = '';
  if (id && g.steps[id]) where = t('problems.location.step', { n: num(id) });
  else if (id && g.transitions[id]) {
    const tr = g.transitions[id];
    const from = tr.from.map(num).join(', ') || '–';
    const to = tr.to.map(num).join(', ') || '–';
    where = t('problems.location.transition', { from, to });
  } else if (id && g.actions[id]) {
    const stepId = g.actions[id].stepId;
    where = stepId
      ? t('problems.location.action', { n: num(stepId) })
      : t('problems.location.freeAction');
  } else if (id && g.comments[id]) where = t('problems.location.comment');
  return where ? `${g.name} · ${where}` : g.name;
}

/** Jumps to the elements of an issue: switches grafcet, selects, pans/zooms and flashes them. */
export function revealIssue(issue: Issue): void {
  if (issue.ruleId === 'unusedVariable' || !issue.grafcetId) {
    showBottomTab('variables');
    return;
  }
  const g = getProject().grafcets[issue.grafcetId];
  if (!g) return;
  const ids = issue.elementIds.filter(
    (id) => g.steps[id] || g.transitions[id] || g.actions[id] || g.comments[id],
  );
  setActiveGrafcet(g.id);
  ui.select(ids.slice(0, 1));
  requestAnimationFrame(() => {
    revealElements(g.id, ids);
    ui.flash(ids);
  });
}

export function applyQuickFix(fix: QuickFix): void {
  switch (fix.kind) {
    case 'setReceptivity':
      doc.execute('history.quickFix', (p) => {
        const tr = p.grafcets[fix.grafcetId]?.transitions[fix.transitionId];
        if (tr) tr.receptivity = fix.value;
      });
      return;
    case 'makeInitial':
      doc.execute('history.quickFix', (p) => {
        const s = p.grafcets[fix.grafcetId]?.steps[fix.stepId];
        if (s && s.kind === 'normal') s.kind = 'initial';
      });
      return;
    case 'createVariable':
      createVariable(fix.name, fix.type, fix.direction);
      return;
    case 'renumber':
      setActiveGrafcet(fix.grafcetId);
      void renumberActive();
      return;
    case 'deleteVariable':
      deleteVariable(fix.variableId);
      return;
  }
}
