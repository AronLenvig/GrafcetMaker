import { useStore } from 'zustand';
import { createProject } from '@/core/model/factory';
import { elementKind } from '@/core/model/graph';
import type { Grafcet, Project } from '@/core/model/types';
import { createDocumentStore, type DocumentState } from './documentStore';
import { useUi } from './uiStore';

/** The single open document of the app. */
export const doc = createDocumentStore(createProject('Untitled'));

export function useDoc<T>(selector: (s: DocumentState) => T): T {
  return useStore(doc.store, selector);
}

export const getProject = (): Project => doc.store.getState().project;

export function getActiveGrafcet(): Grafcet | undefined {
  const id = useUi.getState().activeGrafcetId;
  return id ? getProject().grafcets[id] : undefined;
}

export function useActiveGrafcet(): Grafcet | undefined {
  const id = useUi((s) => s.activeGrafcetId);
  return useDoc((s) => (id ? s.project.grafcets[id] : undefined));
}

/** Keeps UI state consistent with the document (after undo, load, delete...). */
function reconcile(project: Project): void {
  // A split pane whose grafcet was deleted (or a new project) closes the split.
  const split = useUi.getState().split;
  if (split && !split.panes.every((id) => project.grafcets[id])) useUi.setState({ split: null });
  const s = useUi.getState();
  let active = s.activeGrafcetId;
  if (!active || !project.grafcets[active]) active = project.grafcetOrder[0] ?? null;
  const g = active ? project.grafcets[active] : undefined;
  let selection = s.selection;
  const stale = Object.keys(selection).filter((id) => !g || !elementKind(g, id));
  if (stale.length) {
    selection = { ...selection };
    for (const id of stale) delete selection[id];
  }
  const editingStale = s.editing && (!g || !elementKind(g, s.editing.id));
  if (active !== s.activeGrafcetId || selection !== s.selection || editingStale) {
    useUi.setState({
      activeGrafcetId: active,
      selection: active !== s.activeGrafcetId ? {} : selection,
      editing: editingStale ? null : s.editing,
      selectedLink: active !== s.activeGrafcetId ? null : s.selectedLink,
    });
  }
}

reconcile(getProject());
doc.store.subscribe((state, prev) => {
  if (state.project !== prev.project) reconcile(state.project);
});
