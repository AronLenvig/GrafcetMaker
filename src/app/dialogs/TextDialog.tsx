import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { openProjectText, textErrorMessage, useTextDraft } from '../persistence/session';
import { Button, Modal } from '../ui/primitives';

/** What the empty text box shows: a short chart in GRAFCET text. */
const PLACEHOLDER = `project Conveyor
input start, stop
output Motor
step 0 initial Ready
0 -> 1: start
step 1 Running
  do Motor
1 -> 0: stop`;

/**
 * File › Open from text: a chart written as GRAFCET text (core/io/grafcetText), typically by an AI
 * assistant that read ai.txt. A line that cannot be read is named with what is wrong.
 */
export function TextDialog() {
  const { t } = useTranslation();
  const { open, text, error } = useTextDraft();
  const [busy, setBusy] = useState(false);
  const fieldId = useId();
  const errorId = useId();
  if (!open) return null;
  // The format for assistants, published beside the app (also on premises).
  const guide = new URL('ai.txt', document.baseURI).href;
  const [before, after] = t('file.text.intro', { url: '\u0000' }).split('\u0000');
  const close = () => useTextDraft.setState({ open: false, error: null });
  const submit = async () => {
    if (busy || !text.trim()) return;
    setBusy(true);
    try {
      if (await openProjectText(text))
        useTextDraft.setState({ open: false, text: '', error: null });
    } catch (e) {
      useTextDraft.setState({ error: textErrorMessage(e) });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open title={t('file.text.title')} onOpenChange={(o) => !o && close()} width={640}>
      <div className="flex flex-col gap-3">
        <p className="text-muted">
          {before}
          <a href={guide} target="_blank" rel="noopener" className="text-accent underline">
            {guide}
          </a>
          {after}
        </p>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={fieldId} className="text-xs font-medium text-muted">
            {t('file.text.label')}
          </label>
          <textarea
            id={fieldId}
            value={text}
            onChange={(e) => useTextDraft.setState({ text: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                void submit();
              }
            }}
            placeholder={PLACEHOLDER}
            rows={14}
            spellCheck={false}
            autoFocus
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            className="gm-input font-mono text-xs [font-variant-ligatures:none]"
          />
        </div>
        {error && (
          <p id={errorId} role="alert" className="text-danger">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button onClick={close}>{t('common.cancel')}</Button>
          <Button variant="primary" disabled={busy || !text.trim()} onClick={() => void submit()}>
            {t('file.text.open')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
