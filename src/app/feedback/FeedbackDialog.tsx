import { useEffect, useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getProject } from '@/editor/store/document';
import { LIMITS } from '../../../worker/feedback';
import { FEEDBACK_EMAIL, FEEDBACK_ENDPOINT } from '../config';
import { shareLink } from '../persistence/session';
import { toast } from '../toasts';
import { Button, cx, Modal } from '../ui/primitives';

const KINDS = ['idea', 'problem', 'question', 'praise'] as const;
type Kind = (typeof KINDS)[number];

/** Some email apps truncate longer mailto: links; beyond this the dialog suggests copying. */
const MAILTO_LIMIT = 1800;

/**
 * How feedback leaves this installation: sent anonymously to the site's endpoint, opened in the
 * user's email app, or only copied (no channel configured, e.g. an on-premise install).
 */
type Channel = 'checking' | 'endpoint' | 'email' | 'copy';

let endpointProbe: Promise<boolean> | null = null;

/**
 * Whether this site serves the feedback endpoint and can deliver (asked once per session). Static
 * hosts answer the request with index.html, hence the JSON check; network errors are not cached.
 */
function hasEndpoint(): Promise<boolean> {
  endpointProbe ??= fetch(FEEDBACK_ENDPOINT, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })
    .then(async (r) => {
      if (!r.ok || !r.headers.get('Content-Type')?.includes('application/json')) return false;
      return ((await r.json()) as { ok?: unknown }).ok === true;
    })
    .catch(() => {
      endpointProbe = null;
      return false;
    });
  return endpointProbe;
}

function appDetails(): string {
  return [
    `GrafcetMaker ${__APP_VERSION__}`,
    navigator.userAgent,
    `Language: ${navigator.language}`,
    `Screen: ${screen.width}×${screen.height} @${window.devicePixelRatio}x`,
  ].join('\n');
}

/**
 * Feedback form. On the hosted site it is sent anonymously to the feedback endpoint (no account;
 * a contact is optional). Elsewhere it opens in the user's email app (VITE_FEEDBACK_EMAIL) or can
 * be copied. Only what the dialog shows is sent: the message, and if ticked the app details and a
 * share link of the open project (ticked by default, so the developers can open a copy of it).
 */
export function FeedbackDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [kind, setKind] = useState<Kind>('idea');
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [details, setDetails] = useState(true);
  const [withLink, setWithLink] = useState(true);
  const [project] = useState(getProject);
  // undefined while the project is compressed; null when there is nothing worth linking.
  const [link, setLink] = useState<string | null | undefined>(() =>
    Object.values(project.grafcets).some((g) => Object.keys(g.steps).length > 0) ? undefined : null,
  );
  const [endpoint, setEndpoint] = useState<boolean | null>(null);
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const messageId = useId();
  const contactId = useId();
  const detailsText = useMemo(appDetails, []);

  useEffect(() => {
    let live = true;
    void hasEndpoint().then((ok) => live && setEndpoint(ok));
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (link !== undefined) return;
    let live = true;
    void shareLink(project).then(
      (l) => live && setLink(l),
      () => live && setLink(null),
    );
    return () => {
      live = false;
    };
  }, [project, link]);

  const channel: Channel =
    endpoint === null ? 'checking' : endpoint ? 'endpoint' : FEEDBACK_EMAIL ? 'email' : 'copy';
  // The endpoint files an issue, whose size GitHub caps; email and copy take any length.
  const tooLarge = channel === 'endpoint' && !!link && link.length > LIMITS.link;
  const sentLink = withLink && link && !tooLarge ? link : '';
  const subject = `[GrafcetMaker] ${t(`feedback.kinds.${kind}`)}${
    message.trim() ? `: ${message.trim().split('\n')[0]!.slice(0, 60)}` : ''
  }`;
  const extra = [sentLink && `Project: ${sentLink}`, details && detailsText].filter(Boolean);
  const body = `${message.trim()}${extra.length ? `\n\n---\n${extra.join('\n\n')}` : ''}`;
  const href = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  // Nothing leaves before the link is ready, so a ticked box is never silently dropped.
  const blocked = !message.trim() || link === undefined;

  const copy = async () => {
    const text = `${channel === 'email' ? `To: ${FEEDBACK_EMAIL}\n` : ''}Subject: ${subject}\n\n${body}`;
    const ok = await navigator.clipboard.writeText(text).then(
      () => true,
      () => false,
    );
    toast(ok ? t('feedback.copied') : t('export.copyFailed'), ok ? 'success' : 'error');
  };

  const send = async () => {
    setSending(true);
    setFailed(false);
    const ok = await fetch(FEEDBACK_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind,
        message: message.trim(),
        contact: contact.trim(),
        details: details ? detailsText : '',
        link: sentLink,
      }),
    }).then(
      (r) => r.ok,
      () => false,
    );
    setSending(false);
    if (!ok) return setFailed(true);
    toast(t('feedback.sent'), 'success');
    onClose();
  };

  const privacy =
    channel === 'email'
      ? t('feedback.privacyEmail', { email: FEEDBACK_EMAIL })
      : channel === 'copy'
        ? t('feedback.privacyCopy')
        : t('feedback.privacyAnonymous');

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
            maxLength={5000}
            autoFocus
            className="gm-input"
          />
        </div>
        {channel === 'endpoint' && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={contactId} className="text-xs font-medium text-muted">
              {t('feedback.contact')}
            </label>
            <input
              id={contactId}
              type="email"
              autoComplete="email"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder={t('feedback.contactPlaceholder')}
              maxLength={200}
              className="gm-input"
            />
          </div>
        )}
        {link && (
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              className="mt-1"
              checked={!tooLarge && withLink}
              disabled={tooLarge}
              onChange={(e) => setWithLink(e.target.checked)}
            />
            <span>
              {t('feedback.includeProject')}
              <span className="mt-0.5 block text-xs text-muted">
                {t(tooLarge ? 'feedback.projectTooLarge' : 'feedback.projectHint', {
                  name: project.name,
                })}
              </span>
            </span>
          </label>
        )}
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
        <p className="text-xs text-muted">{privacy}</p>
        {channel === 'email' && href.length > MAILTO_LIMIT && (
          <p className="text-xs text-warning">{t('feedback.long')}</p>
        )}
        {failed && (
          <p role="alert" className="text-xs text-danger">
            {t('feedback.failed')}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button
            variant={channel === 'copy' ? 'primary' : 'default'}
            disabled={blocked}
            onClick={() => void copy()}
          >
            {t('feedback.copy')}
          </Button>
          {channel === 'email' ? (
            // A link, not location.href: opening the email app must not look like leaving the page.
            <a
              href={blocked ? undefined : href}
              aria-disabled={blocked}
              onClick={(e) => {
                if (blocked) e.preventDefault();
                else setTimeout(onClose, 300);
              }}
              className={cx(
                'inline-flex h-8 items-center justify-center rounded-md border border-transparent bg-accent px-3 font-medium text-accent-fg hover:bg-accent-hover',
                blocked && 'pointer-events-none opacity-50',
              )}
            >
              {t('feedback.openEmail')}
            </a>
          ) : (
            channel !== 'copy' && (
              <Button
                variant="primary"
                disabled={blocked || sending || channel === 'checking'}
                onClick={() => void send()}
              >
                {sending ? t('feedback.sending') : t('feedback.send')}
              </Button>
            )
          )}
        </div>
      </div>
    </Modal>
  );
}
