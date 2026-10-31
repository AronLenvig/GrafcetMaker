import { create } from 'zustand';

export interface DialogAction {
  id: string;
  label: string;
  variant?: 'primary' | 'danger' | 'default';
}

export interface DialogRequest {
  key: number;
  title: string;
  message?: string;
  details?: string[];
  actions: DialogAction[];
  /** Action id returned when the dialog is dismissed (Escape, close button). */
  cancelId: string | null;
  resolve: (actionId: string | null) => void;
}

export const useDialogs = create<{ queue: DialogRequest[] }>(() => ({ queue: [] }));

let counter = 0;

/** Shows a modal message with buttons; resolves with the chosen action id (or cancelId). */
export function showDialog(
  opts: Omit<DialogRequest, 'key' | 'resolve' | 'cancelId'> & { cancelId?: string | null },
): Promise<string | null> {
  return new Promise((resolve) => {
    const req: DialogRequest = { cancelId: null, ...opts, key: ++counter, resolve };
    useDialogs.setState((s) => ({ queue: [...s.queue, req] }));
  });
}

export function closeDialog(key: number, actionId: string | null): void {
  const req = useDialogs.getState().queue.find((r) => r.key === key);
  useDialogs.setState((s) => ({ queue: s.queue.filter((r) => r.key !== key) }));
  req?.resolve(actionId);
}

export function isDialogOpen(): boolean {
  return useDialogs.getState().queue.length > 0;
}
