import i18next from 'i18next';
import { showDialog } from '@/app/dialogs/dialogStore';
import { showSideTab } from '@/app/prefs';
import { toast } from '@/app/toasts';
import { newId } from '@/core/model/factory';
import type { Id, Variable, VariableDirection, VariableType } from '@/core/model/types';
import {
  referencedVariables,
  renameVariableEverywhere,
  uniqueVariableName,
  validateVariableName,
  variableUsage,
  type VariableNameError,
} from '@/core/model/variables';
import { doc, getProject } from '../store/document';
import { useUi } from '../store/uiStore';
import { clipboardHooks } from './edit';

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
