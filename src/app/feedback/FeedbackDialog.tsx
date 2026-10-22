import { useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FEEDBACK_EMAIL } from '../config';
import { toast } from '../toasts';
import { Button, cx, Modal } from '../ui/primitives';

const KINDS = ['idea', 'problem', 'question', 'praise'] as const;
type Kind = (typeof KINDS)[number];

/** Some email apps truncate longer mailto: links; beyond this the dialog suggests copying. */
const MAILTO_LIMIT = 1800;

function appDetails(): string {
  return [
    `GrafcetMaker ${__APP_VERSION__}`,
    navigator.userAgent,
    `Language: ${navigator.language}`,
    `Screen: ${screen.width}×${screen.height} @${window.devicePixelRatio}x`,
  ].join('\n');
}

/**
 * Feedback without a server: the message is composed here and opened in the user's email app
 * (mailto:), to be reviewed and sent from there. Nothing is transmitted by the app itself.
 */
export function FeedbackDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [kind, setKind] = useState<Kind>('idea');
  const [message, setMessage] = useState('');
  const [details, setDetails] = useState(true);
  const messageId = useId();
  const detailsText = useMemo(appDetails, []);

  const subject = `[GrafcetMaker] ${t(`feedback.kinds.${kind}`)}${
    message.trim() ? `: ${message.trim().split('\n')[0]!.slice(0, 60)}` : ''
  }`;
  const body = `${message.trim()}${details ? `\n\n---\n${detailsText}` : ''}`;
  const href = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const empty = !message.trim();

  const copy = async () => {
    const text = `To: ${FEEDBACK_EMAIL}\nSubject: ${subject}\n\n${body}`;
    const ok = await navigator.clipboard.writeText(text).then(
      () => true,
      () => false,
    );
    toast(ok ? t('feedback.copied') : t('export.copyFailed'), ok ? 'success' : 'error');
  };

  return (
    <Modal open title={t('feedback.title')} onOpenChange={(o) => !o && onClose()} width={520}>
      <div className="flex flex-col gap-3">
        <p className="text-muted">{t('feedback.intro')}</p>
        <div role="radiogroup" aria-label={t('feedback.kind')} className="flex flex-wrap gap-1.5">
          {KINDS.map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => setKind(k)}
              className={cx(
                'h-7 rounded-full border px-3 text-xs',
                kind === k
                  ? 'border-accent bg-accent-soft text-text'
                  : 'border-border text-muted hover:text-text',
              )}
            >
              {t(`feedback.kinds.${k}`)}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={messageId} className="text-xs font-medium text-muted">
            {t('feedback.message')}
          </label>
          <textarea
            id={messageId}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t(`feedback.placeholders.${kind}`)}
            rows={6}
            autoFocus
            className="gm-input"
          />
        </div>
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            className="mt-1"
            checked={details}
            onChange={(e) => setDetails(e.target.checked)}
          />
          <span>
            {t('feedback.includeDetails')}
            <span className="mt-0.5 block font-mono text-[11px] whitespace-pre-wrap text-muted">
              {detailsText}
            </span>
          </span>
        </label>
        <p className="text-xs text-muted">{t('feedback.privacy', { email: FEEDBACK_EMAIL })}</p>
        {href.length > MAILTO_LIMIT && <p className="text-xs text-warning">{t('feedback.long')}</p>}
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button disabled={empty} onClick={() => void copy()}>
            {t('feedback.copy')}
          </Button>
          {/* A link, not location.href: opening the email app must not look like leaving the page. */}
          <a
            href={empty ? undefined : href}
            aria-disabled={empty}
            onClick={(e) => {
              if (empty) e.preventDefault();
              else setTimeout(onClose, 300);
            }}
            className={cx(
              'inline-flex h-8 items-center justify-center rounded-md border border-transparent bg-accent px-3 font-medium text-accent-fg hover:bg-accent-hover',
              empty && 'pointer-events-none opacity-50',
            )}
          >
            {t('feedback.send')}
          </a>
        </div>
      </div>
    </Modal>
  );
}
