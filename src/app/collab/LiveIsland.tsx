import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { Presence } from '@/core/collab/wire';
import { openAppDialog } from '@/editor/commands/registry';
import { useDoc } from '@/editor/store/document';
import { AlertIcon, PlayIcon, UsersIcon } from '../ui/icons';
import { cx, IconButton, Tip } from '../ui/primitives';
import { initials, peerColor, useLive } from './liveState';
import { followPeer, useLiveAvailable } from './liveStore';

/** A participant: initials on their color; a click shows where they are (not for oneself). */
export function PeerAvatar({
  id,
  p,
  size = 32,
  self = false,
}: {
  id: string;
  p: Presence;
  size?: number;
  self?: boolean;
}) {
  const { t } = useTranslation();
  const grafcet = useDoc((s) => (p.g ? s.project.grafcets[p.g]?.name : undefined));
  const name = p.name || t('live.guest');
  const details = [
    name,
    grafcet && t('live.onGrafcet', { name: grafcet }),
    p.sim && t('live.simulating'),
  ]
    .filter(Boolean)
    .join(' · ');
  const style = {
    width: size,
    height: size,
    background: peerColor(p.cid),
    color: 'var(--peer-fg)',
  };
  const round =
    'relative flex shrink-0 items-center justify-center rounded-full text-[11px] font-semibold';
  if (self)
    return (
      <span aria-hidden="true" className={round} style={style}>
        {initials(name)}
      </span>
    );
  return (
    <Tip label={details} side="bottom">
      <button
        type="button"
        aria-label={`${t('live.show', { name })} (${details})`}
        onClick={() => followPeer(id)}
        className={cx(round, 'outline-offset-2')}
        style={style}
      >
        {initials(name)}
        {p.sim && (
          <span className="absolute -right-1 -bottom-1 flex h-4 w-4 items-center justify-center rounded-full border border-border bg-surface text-success">
            <PlayIcon size={9} />
          </span>
        )}
      </button>
    </Tip>
  );
}

/**
 * Top right (phones: the top bar): outside a session, the button that starts one where this site
 * offers it (`fallback` where it does not); in a session, the others' avatars and the session
 * button (a warning while the connection is lost).
 */
export function LiveIsland({
  compact = false,
  fallback = null,
}: {
  compact?: boolean;
  fallback?: ReactNode;
}) {
  const { t } = useTranslation();
  const status = useLive((s) => s.status);
  const peers = useLive((s) => s.peers);
  const available = useLiveAvailable();
  const open = () => openAppDialog('live');

  if (status === 'off') {
    if (!available || compact) return fallback;
    return (
      <Tip label={t('commands.file.live')} side="bottom">
        <button
          type="button"
          aria-label={t('commands.file.live')}
          onClick={open}
          className="gm-island flex h-11 w-11 items-center justify-center text-muted hover:bg-surface-2 hover:text-text"
        >
          <UsersIcon size={18} />
        </button>
      </Tip>
    );
  }

  const known = Object.entries(peers).filter((e): e is [string, Presence] => !!e[1]);
  const shown = known.slice(0, compact ? 2 : 4);
  const more = known.length - shown.length;
  const lost = status !== 'connected';
  const label = lost
    ? t(`live.status.${status}`)
    : t('live.people', { count: Object.keys(peers).length });
  return (
    <div className={cx('flex items-center gap-1', compact ? 'px-0.5' : 'gm-island h-11 px-1.5')}>
      {shown.map(([id, p]) => (
        <PeerAvatar key={id} id={id} p={p} size={compact ? 28 : 32} />
      ))}
      {more > 0 && <span className="px-0.5 text-xs text-muted">+{more}</span>}
      <Tip label={label} side="bottom">
        <IconButton
          label={label}
          className={cx(compact ? 'h-10 w-10' : 'h-9 w-9', lost ? 'text-warning' : 'text-accent')}
          onClick={open}
        >
          {lost ? <AlertIcon size={18} /> : <UsersIcon size={18} />}
        </IconButton>
      </Tip>
    </div>
  );
}
