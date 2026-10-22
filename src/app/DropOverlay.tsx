import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { openFile } from './persistence/session';
import { UploadIcon } from './ui/icons';

const hasFiles = (e: DragEvent) => !!e.dataTransfer && [...e.dataTransfer.types].includes('Files');

/** Drop a project file anywhere on the window to open it. */
export function DropOverlay() {
  const { t } = useTranslation();
  const [active, setActive] = useState(false);

  useEffect(() => {
    let depth = 0;
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth++;
      setActive(true);
    };
    const over = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    };
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setActive(false);
    };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setActive(false);
      const file = e.dataTransfer?.files[0];
      if (!file) return;
      // A CSV file is a variable list to import; anything else is opened as a project.
      if (/\.csv$/i.test(file.name))
        void import('./export/commands').then((m) => m.importVariablesFile(file));
      else void openFile(file);
    };
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragover', over);
    window.addEventListener('dragleave', leave);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragover', over);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('drop', drop);
    };
  }, []);

  if (!active) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-overlay">
      <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-accent bg-surface px-10 py-8 text-text shadow-pop">
        <UploadIcon size={28} className="text-accent" />
        <p className="font-medium">{t('file.dropToOpen')}</p>
      </div>
    </div>
  );
}
