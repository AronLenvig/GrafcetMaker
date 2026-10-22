import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import changelog from '../../../CHANGELOG.md?raw';
import { Modal } from '../ui/primitives';
import { parseMarkdown } from './markdown';
import { Blocks } from './MarkdownView';

/** The in-app changelog (CHANGELOG.md, Keep a Changelog format). Loaded on demand. */
export default function ChangelogDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  // The title and format note are for the file; the dialog has its own title.
  const blocks = useMemo(
    () => parseMarkdown(changelog).filter((b) => !(b.t === 'h' && b.level === 1)),
    [],
  );
  return (
    <Modal
      open
      title={t('pwa.changelogTitle', { version: __APP_VERSION__ })}
      onOpenChange={(o) => !o && onClose()}
      width={640}
    >
      <div className="text-[13px]">
        <Blocks blocks={blocks} />
      </div>
    </Modal>
  );
}
