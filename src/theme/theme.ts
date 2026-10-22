import { create } from 'zustand';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

/** Must match the key read by the inline bootstrap script in index.html. */
const STORAGE_KEY = 'grafcetmaker.theme';

const media: MediaQueryList | null =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

function readMode(): ThemeMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    // Storage blocked (private mode, policy): fall back to system.
  }
  return 'system';
}

function writeMode(mode: ThemeMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Not persisted; the choice still applies for this session.
  }
}

function resolve(mode: ThemeMode): ResolvedTheme {
  if (mode === 'system') return media?.matches ? 'dark' : 'light';
  return mode;
}

function apply(resolved: ResolvedTheme): void {
  document.documentElement.setAttribute('data-theme', resolved);
}

interface ThemeState {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
}

const initialMode = readMode();

export const useTheme = create<ThemeState>((set) => ({
  mode: initialMode,
  resolved: resolve(initialMode),
  setMode: (mode) => {
    writeMode(mode);
    const resolved = resolve(mode);
    apply(resolved);
    set({ mode, resolved });
  },
}));

media?.addEventListener('change', () => {
  const { mode } = useTheme.getState();
  if (mode !== 'system') return;
  const resolved = resolve(mode);
  apply(resolved);
  useTheme.setState({ resolved });
});

// Another tab changed the theme: follow it.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY) return;
    const mode = readMode();
    const resolved = resolve(mode);
    apply(resolved);
    useTheme.setState({ mode, resolved });
  });
}
