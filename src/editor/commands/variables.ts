import i18next from 'i18next';
import { showDialog } from '@/app/dialogs/dialogStore';
import { showSideTab } from '@/app/prefs';
import { toast } from '@/app/toasts';
import type { ExpressionKind } from '@/core/expr/check';
import { newId } from '@/core/model/factory';
import type { Grafcet, Id, Variable, VariableDirection, VariableType } from '@/core/model/types';
import {
  declareUnknownNames,
  referencedVariables,
  renameVariableEverywhere,
  uniqueVariableName,
  unusedVariables,
  validateVariableName,
  variableUsage,
  type VariableNameError,
} from '@/core/model/variables';
import { doc, getProject } from '../store/document';
import { useUi } from '../store/uiStore';
import { clipboardHooks, editActive } from './edit';

// Copy/paste brings along the variables the copied expressions use.
clipboardHooks.referencedVariables = referencedVariables;

export function addVariable(init: Partial<Pick<Variable, 'name' | 'type' | 'direction'>> = {}): Id {
  const p = getProject();
  const name = init.name && !validateVariableName(p, init.name) ? init.name : uniqueVariableName(p);
  const v: Variable = {
    id: newId(),
    name,
    type: init.type ?? 'BOOL',
    direction: init.direction ?? 'input',
  };
  doc.execute('history.addVariable', (d) => void (d.variables[v.id] = v));
  return v.id;
}

/** "Create variable" quick fix for an unknown identifier. Returns null if the name is unusable. */
export function createVariable(
  name: string,
  type: VariableType,
  direction: VariableDirection,
): Id | null {
  if (validateVariableName(getProject(), name)) return null;
  const id = addVariable({ name, type, direction });
  toast(i18next.t('variables.created', { name }), 'success');
  return id;
}

/**
 * An edit that writes an expression: `recipe` changes the grafcet and returns what it wrote. The
 * names the text uses that are not variables yet are declared in the same undo step, and a
 * message says which (so a typo is noticed).
 */
export function editExpression(
  label: string,
  recipe: (g: Grafcet) => { kind: ExpressionKind; source: string } | null,
): void {
  let created: Variable[] = [];
  editActive(label, (g, p) => {
    const written = recipe(g);
    if (written) created = declareUnknownNames(p, g.id, written.kind, written.source);
  });
  if (!created.length) return;
  const t = i18next.t;
  const list = created
    .map((v) => `${v.name} (${v.type} ${t(`variables.directions.${v.direction}`).toLowerCase()})`)
    .join(', ');
  toast(t('variables.autoCreated', { count: created.length, list }), 'success');
}

/** Removes the variables nothing uses, in one undo step, and says which. */
export function removeUnusedVariables(): void {
  const p = getProject();
  const unused = unusedVariables(p, variableUsage(p));
  const t = i18next.t;
  if (!unused.length) {
    toast(t('variables.noneUnused'));
    return;
  }
  doc.execute('history.removeUnusedVariables', (d) => {
    for (const v of unused) delete d.variables[v.id];
  });
  const names = unused.map((v) => v.name);
  const list = names.length > 8 ? `${names.slice(0, 8).join(', ')}, …` : names.join(', ');
  toast(t('variables.removedUnused', { count: names.length, list }), 'success');
}

export function renameVariable(id: Id, name: string): VariableNameError | null {
  const err = validateVariableName(getProject(), name, id);
  if (err) return err;
  doc.execute('history.renameVariable', (p) => renameVariableEverywhere(p, id, name));
  return null;
}

export function updateVariable(id: Id, recipe: (v: Variable) => void): void {
  doc.execute('history.editVariable', (p) => {
    const v = p.variables[id];
    if (v) recipe(v);
  });
}

export function deleteVariable(id: Id): void {
  doc.execute('history.deleteVariable', (p) => void delete p.variables[id]);
}

/** Opens a variable in the side panel's variable list. */
export function showVariable(id: Id | null): void {
  showSideTab('variables');
  useUi.setState({ focusedVariable: id });
}

/** Deletes a variable, asking first when expressions still use it. */
export async function confirmDeleteVariable(id: Id): Promise<void> {
  const p = getProject();
  const v = p.variables[id];
  if (!v) return;
  const uses = variableUsage(p).get(v.name.toLowerCase()) ?? 0;
  if (uses > 0) {
    const choice = await showDialog({
      title: i18next.t('variables.deleteTitle', { name: v.name }),
      message: i18next.t('variables.deleteUsed', { count: uses }),
      actions: [
        { id: 'cancel', label: i18next.t('common.cancel') },
        { id: 'delete', label: i18next.t('common.delete'), variant: 'danger' },
      ],
      cancelId: 'cancel',
    });
    if (choice !== 'delete') return;
  }
  deleteVariable(id);
  if (useUi.getState().focusedVariable === id) useUi.setState({ focusedVariable: null });
}
