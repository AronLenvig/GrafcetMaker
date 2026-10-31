import { create } from 'zustand';

export interface Toast {
  id: number;
  message: string;
  tone: 'info' | 'success' | 'warning' | 'error';
}

export const useToasts = create<{ toasts: Toast[] }>(() => ({ toasts: [] }));

let counter = 0;

/** Shows a short, non-blocking status message (announced to screen readers). */
export function toast(message: string, tone: Toast['tone'] = 'info', ms = 3500): void {
  const id = ++counter;
  useToasts.setState((s) => ({ toasts: [...s.toasts.slice(-3), { id, message, tone }] }));
  setTimeout(
    () => useToasts.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
    ms,
  );
}
