/**
 * File System Access API (Chromium) with portable fallbacks: <input type=file> to open and a
 * download to save. Feature-detected; types declared locally because they are not in lib.dom.
 */
import i18next from 'i18next';

interface PickerType {
  description?: string;
  accept: Record<string, string[]>;
}

interface FsWindow {
  showOpenFilePicker?: (o?: {
    multiple?: boolean;
    types?: PickerType[];
    id?: string;
  }) => Promise<FileSystemFileHandle[]>;
  showSaveFilePicker?: (o?: {
    suggestedName?: string;
    types?: PickerType[];
    id?: string;
  }) => Promise<FileSystemFileHandle>;
}

type PermissionHandle = FileSystemFileHandle & {
  queryPermission?: (d: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>;
  requestPermission?: (d: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>;
};

const fsWindow = window as unknown as FsWindow;

export const supportsFileSystemAccess =
  typeof fsWindow.showOpenFilePicker === 'function' &&
  typeof fsWindow.showSaveFilePicker === 'function';

export interface PickedFile {
  file: File;
  handle?: FileSystemFileHandle;
}

export interface FileKind {
  description: string;
  /** MIME type → file extensions. */
  accept: Record<string, string[]>;
}

export const PROJECT_FILE: FileKind = {
  // Read when a picker opens, so it follows the language.
  get description() {
    return i18next.t('file.types.project');
  },
  // .grafcetio: grafcet.io files, converted on opening.
  accept: { 'application/json': ['.json', '.grafcetio'] },
};

const isAbort = (e: unknown) => e instanceof DOMException && e.name === 'AbortError';

function pickWithInput(kind: FileKind): Promise<PickedFile | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = Object.entries(kind.accept)
      .flatMap(([mime, exts]) => [...exts, mime])
      .join(',');
    input.style.display = 'none';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      input.remove();
      resolve(file ? { file } : null);
    });
    input.addEventListener('cancel', () => {
      input.remove();
      resolve(null);
    });
    document.body.appendChild(input);
    input.click();
  });
}

/** Asks the user for a file. Resolves null when cancelled. */
export async function pickFile(kind: FileKind = PROJECT_FILE): Promise<PickedFile | null> {
  if (supportsFileSystemAccess) {
    try {
      const [handle] = await fsWindow.showOpenFilePicker!({
        id: 'grafcetmaker',
        types: [{ description: kind.description, accept: kind.accept }],
      });
      if (!handle) return null;
      return { file: await handle.getFile(), handle };
    } catch (e) {
      if (isAbort(e)) return null;
      throw e;
    }
  }
  return pickWithInput(kind);
}

/** Save As dialog. Returns null when cancelled or unsupported. */
export async function pickSaveHandle(
  suggestedName: string,
  kind: FileKind = PROJECT_FILE,
): Promise<FileSystemFileHandle | null> {
  if (!supportsFileSystemAccess) return null;
  try {
    return await fsWindow.showSaveFilePicker!({
      id: 'grafcetmaker',
      suggestedName,
      types: [{ description: kind.description, accept: kind.accept }],
    });
  } catch (e) {
    if (isAbort(e)) return null;
    throw e;
  }
}

export async function ensurePermission(
  handle: FileSystemFileHandle,
  mode: 'read' | 'readwrite',
): Promise<boolean> {
  const h = handle as PermissionHandle;
  if (!h.queryPermission || !h.requestPermission) return true;
  if ((await h.queryPermission({ mode })) === 'granted') return true;
  return (await h.requestPermission({ mode })) === 'granted';
}

export async function writeHandle(
  handle: FileSystemFileHandle,
  content: string | Blob,
): Promise<void> {
  const writable = await handle.createWritable();
  try {
    await writable.write(content);
  } finally {
    await writable.close();
  }
}

/** Triggers a browser download of the content. */
export function downloadBlob(
  content: string | Blob,
  fileName: string,
  mime = 'application/octet-stream',
): void {
  const blob = typeof content === 'string' ? new Blob([content], { type: mime }) : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
