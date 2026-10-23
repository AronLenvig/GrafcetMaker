import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { Presence } from '@/core/collab/wire';
import { useDoc } from '@/editor/store/document';
import { useUi } from '@/editor/store/uiStore';
import { setPrefs, usePrefs } from '../prefs';
import { toast } from '../toasts';
import { PlayIcon } from '../ui/icons';
import { Button, Field, Modal } from '../ui/primitives';
import { PeerAvatar } from './LiveIsland';
import { clientId, useLive, type LiveState } from './liveState';
import { declineInvite, joinLive, leaveLive, startLive } from './liveStore';

async function copyLink(link: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(link);
    return true;
  } catch {
    return false;
  }
}

/** The name the others see, edited in place (kept per device). */
function NameField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation();
  const id = useId();
  return (
    <Field label={t('live.name')} htmlFor={id}>
      <input
        id={id}
        className="gm-input"
        value={value}
        maxLength={40}
        autoComplete="nickname"
        placeholder={t('live.namePlaceholder')}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setPrefs({ liveName: value.trim() })}
      />
    </Field>
  );
}

function Participant({ id, p, self = false }: { id: string; p: Presence; self?: boolean }) {
  const { t } = useTranslation();
  const grafcet = useDoc((s) => (p.g ? s.project.grafcets[p.g]?.name : undefined));
  const name = p.name || t('live.guest');
  return (
    <li className="flex items-center gap-2 py-1">
      <PeerAvatar id={id} p={p} size={28} self={self} />
      <span className="min-w-0 flex-1 truncate">
        {self ? t('live.you', { name }) : name}
        {grafcet && <span className="text-muted"> · {t('live.onGrafcet', { name: grafcet })}</span>}
        {p.sim && (
          <span className="text-muted">
            {' · '}
            <PlayIcon size={10} className="inline" /> {t('live.simulating')}
          </span>
        )}
      </span>
    </li>
  );
}

/** Start a session, join one from a link, or see who is in it, share its link and leave. */
export function LiveDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const status = useLive((s) => s.status);
  const invite = useLive((s) => s.invite);
  const link = useLive((s) => s.link);
  const peers = useLive((s) => s.peers);
  const [name, setName] = useState(() => usePrefs.getState().liveName);
  const [busy, setBusy] = useState(false);
  const linkId = useId();
  const saveName = () => setPrefs({ liveName: name.trim() });

  const close = () => {
    if (invite) declineInvite();
    onClose();
  };

  const copy = async (url: string) => {
    if (await copyLink(url)) toast(t('live.linkCopied'), 'success', 5000);
    else toast(t('export.copyFailed'), 'error');
  };

  if (invite) {
    const join = (e: FormEvent) => {
      e.preventDefault();
      saveName();
      onClose();
      void joinLive(invite);
    };
    return (
      <Modal open title={t('live.joinTitle')} onOpenChange={(o) => !o && close()} width={460}>
        <form className="flex flex-col gap-3" onSubmit={join}>
          <p>{t('live.joinIntro')}</p>
          <NameField value={name} onChange={setName} />
          <p className="text-xs text-muted">{t('live.privacy')}</p>
          <div className="flex justify-end gap-2">
            <Button onClick={close}>{t('common.cancel')}</Button>
            <Button type="submit" variant="primary">
              {t('live.join')}
            </Button>
          </div>
        </form>
      </Modal>
    );
  }

  if (status === 'off') {
    const start = async (e: FormEvent) => {
      e.preventDefault();
      saveName();
      setBusy(true);
      try {
        await startLive();
        const url = useLive.getState().link;
        // Best effort: some browsers allow the clipboard only right after a click.
        if (url && (await copyLink(url))) toast(t('live.linkCopied'), 'success', 5000);
      } finally {
        setBusy(false);
      }
    };
    return (
      <Modal open title={t('live.title')} onOpenChange={(o) => !o && onClose()} width={460}>
        <form className="flex flex-col gap-3" onSubmit={(e) => void start(e)}>
          <p>{t('live.intro')}</p>
          <NameField value={name} onChange={setName} />
          <p className="text-xs text-muted">{t('live.privacy')}</p>
          <div className="flex justify-end gap-2">
            <Button onClick={onClose}>{t('common.cancel')}</Button>
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? t('live.starting') : t('live.start')}
            </Button>
          </div>
        </form>
      </Modal>
    );
  }

  return (
    <Modal open title={t('live.title')} onOpenChange={(o) => !o && onClose()} width={460}>
      <LiveSessionView
        status={status}
        link={link}
        peers={peers}
        name={name}
        setName={setName}
        linkId={linkId}
        onCopy={(url) => void copy(url)}
        onLeave={() => {
          saveName();
          onClose();
          void leaveLive();
        }}
      />
    </Modal>
  );
}

function LiveSessionView({
  status,
  link,
  peers,
  name,
  setName,
  linkId,
  onCopy,
  onLeave,
}: {
  status: Exclude<LiveState['status'], 'off'>;
  link: string | null;
  peers: LiveState['peers'];
  name: string;
  setName: (v: string) => void;
  linkId: string;
  onCopy: (url: string) => void;
  onLeave: () => void;
}) {
  const { t } = useTranslation();
  const activeGrafcet = useUi((s) => s.activeGrafcetId);
  const me: Presence = {
    cid: clientId(),
    name: name.trim(),
    g: activeGrafcet,
    c: null,
    sel: [],
    ed: null,
    sim: false,
  };
  const others = Object.entries(peers).filter((e): e is [string, Presence] => !!e[1]);
  return (
    <div className="flex flex-col gap-3">
      <p role="status" className={status === 'connected' ? 'text-muted' : 'text-warning'}>
        {t(`live.status.${status}`)}
      </p>
      {link && (
        <Field label={t('live.link')} htmlFor={linkId}>
          <div className="flex gap-2">
            <input
              id={linkId}
              className="gm-input min-w-0 flex-1 font-mono text-xs"
              value={link}
              readOnly
              onFocus={(e) => e.currentTarget.select()}
            />
            <Button variant="primary" onClick={() => onCopy(link)}>
              {t('live.copyLink')}
            </Button>
          </div>
        </Field>
      )}
      <section aria-label={t('live.participants')}>
        <h3 className="text-xs font-medium text-muted">{t('live.participants')}</h3>
        <ul className="mt-1">
          <Participant id="" p={me} self />
          {others.map(([id, p]) => (
            <Participant key={id} id={id} p={p} />
          ))}
        </ul>
        {!others.length && <p className="text-xs text-muted">{t('live.alone')}</p>}
      </section>
      <NameField value={name} onChange={setName} />
      <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
        <p className="text-xs text-muted">{t('live.leaveHint')}</p>
        <Button variant="danger" onClick={onLeave}>
          {t('live.leave')}
        </Button>
      </div>
    </div>
  );
}
