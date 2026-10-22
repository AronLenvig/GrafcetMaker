import { useTranslation } from 'react-i18next';
import { formatSimTime } from '@/editor/canvas/SimOverlay';
import { formatKeys, runCommand } from '@/editor/commands/registry';
import { useDoc } from '@/editor/store/document';
import {
  nextEvent,
  resetSimulation,
  setSpeed,
  SPEEDS,
  startRecording,
  stopRecording,
  stopSimulation,
  togglePlay,
  useSim,
  type Speed,
} from '@/editor/simulation/simStore';
import { ThemeSwitcher } from '@/theme/ThemeSwitcher';
import { toast } from './toasts';
import {
  ErrorIcon,
  MoreIcon,
  PauseIcon,
  PlayIcon,
  RecordIcon,
  ResetIcon,
  SearchIcon,
  StepForwardIcon,
  StopIcon,
} from './ui/icons';
import { useCompact } from './ui/media';
import {
  Button,
  IconButton,
  IconMenu,
  MenuCheckItem,
  MenuItem,
  MenuSeparator,
  Tip,
} from './ui/primitives';

/** Top bar while simulating: visibly different, with transport controls and the virtual clock. */
export function SimBar() {
  const { t } = useTranslation();
  const playing = useSim((s) => s.playing);
  const speed = useSim((s) => s.speed);
  const time = useSim((s) => s.snapshot?.time ?? 0);
  const cycle = useSim((s) => s.snapshot?.cycle ?? 0);
  const next = useSim((s) => s.snapshot?.nextDeadline ?? null);
  const error = useSim((s) => s.snapshot?.error ?? null);
  const recording = useSim((s) => s.recording);
  const replay = useSim((s) => s.replay);
  const cursor = useSim((s) => s.cursor);
  const name = useDoc((s) => s.project.name);
  const scenarioCount = useDoc((s) => Object.keys(s.project.scenarios ?? {}).length);
  const compact = useCompact();

  const toggleRecording = () => {
    if (!recording) {
      void startRecording();
      return;
    }
    const sc = stopRecording(t('simulation.scenarioName', { n: scenarioCount + 1 }));
    toast(
      sc ? t('simulation.scenarioSaved', { name: sc.name }) : t('simulation.scenarioEmpty'),
      sc ? 'success' : 'info',
    );
  };

  if (compact) {
    // Phones: transport controls, the clock and Stop; speed and recording in the ⋯ menu.
    const big = 'h-10 w-10';
    return (
      <header className="shrink-0 border-b-2 border-accent bg-accent-soft pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]">
        <h1 className="sr-only">{t('app.heading', { name })}</h1>
        <div className="flex h-11 items-center gap-0.5 px-1">
          <span
            role="status"
            className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-accent-fg"
          >
            {t('simulation.badge')}
          </span>
          <IconButton
            label={t('simulation.reset')}
            className={big}
            onClick={() => void resetSimulation()}
          >
            <ResetIcon size={18} />
          </IconButton>
          <IconButton
            label={playing ? t('simulation.pause') : t('simulation.play')}
            disabled={!!error}
            className={big}
            onClick={togglePlay}
          >
            {playing ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
          </IconButton>
          <IconButton
            label={t('simulation.step')}
            disabled={!!error || playing}
            className={big}
            onClick={() => void nextEvent()}
          >
            <StepForwardIcon size={18} />
          </IconButton>
          <span className="min-w-0 flex-1 truncate px-1 font-mono text-xs tabular-nums">
            {formatSimTime(cursor ?? time)}
            {recording && <span className="ml-1 text-danger">● {recording.length}</span>}
          </span>
          {error && (
            <span role="alert" title={t('simulation.transientLoop')} className="text-danger">
              <ErrorIcon size={18} aria-label={t('simulation.transientLoop')} />
            </span>
          )}
          <IconMenu label={t('simulation.options')} icon={<MoreIcon size={18} />}>
            {SPEEDS.map((s) => (
              <MenuCheckItem
                key={String(s)}
                checked={speed === s}
                onCheckedChange={() => setSpeed(s)}
              >
                {t('simulation.speed')} {s === 'fast' ? t('simulation.fast') : `×${s}`}
              </MenuCheckItem>
            ))}
            <MenuSeparator />
            <MenuItem onSelect={toggleRecording}>
              {recording
                ? t('simulation.stopRecording', { count: recording.length })
                : t('simulation.record')}
            </MenuItem>
          </IconMenu>
          <IconButton
            label={t('simulation.stop')}
            className="h-10 w-10 bg-accent text-accent-fg hover:bg-accent-hover hover:text-accent-fg"
            onClick={stopSimulation}
          >
            <StopIcon size={16} />
          </IconButton>
        </div>
      </header>
    );
  }

  return (
    <header className="flex h-10 shrink-0 items-center gap-1.5 border-b-2 border-accent bg-accent-soft px-2">
      <h1 className="sr-only">{t('app.heading', { name })}</h1>
      <span
        role="status"
        className="rounded bg-accent px-2 py-0.5 text-xs font-bold tracking-wider text-accent-fg"
      >
        {t('simulation.badge')}
      </span>
      <Tip label={t('simulation.reset')} side="bottom">
        <IconButton label={t('simulation.reset')} onClick={() => void resetSimulation()}>
          <ResetIcon size={16} />
        </IconButton>
      </Tip>
      <Tip
        label={playing ? t('simulation.pause') : t('simulation.play')}
        keys={formatKeys('F5')}
        side="bottom"
      >
        <IconButton
          label={playing ? t('simulation.pause') : t('simulation.play')}
          disabled={!!error}
          onClick={togglePlay}
        >
          {playing ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
        </IconButton>
      </Tip>
      <Tip label={t('simulation.step')} keys={formatKeys('F10')} side="bottom">
        <IconButton
          label={t('simulation.step')}
          disabled={!!error || playing}
          onClick={() => void nextEvent()}
        >
          <StepForwardIcon size={16} />
        </IconButton>
      </Tip>
      <label className="flex items-center gap-1 text-xs text-muted">
        {t('simulation.speed')}
        <select
          value={String(speed)}
          onChange={(e) =>
            setSpeed((e.target.value === 'fast' ? 'fast' : Number(e.target.value)) as Speed)
          }
          className="gm-input gm-input-sm w-auto pr-2"
        >
          {SPEEDS.map((s) => (
            <option key={String(s)} value={String(s)}>
              {s === 'fast' ? t('simulation.fast') : `×${s}`}
            </option>
          ))}
        </select>
      </label>
      <span className="ml-1 font-mono text-xs tabular-nums" aria-live="off">
        {t('simulation.clock', { time: formatSimTime(cursor ?? time), cycle })}
        {next !== null && !error && (
          <span className="text-muted">
            {' '}
            · {t('simulation.nextTimer', { time: formatSimTime(next) })}
          </span>
        )}
      </span>
      {error && (
        <span role="alert" className="rounded bg-danger-soft px-2 py-0.5 text-xs text-danger">
          {t('simulation.transientLoop')}
        </span>
      )}
      {replay && (
        <span className="rounded bg-surface px-2 py-0.5 text-xs">
          {t('simulation.replaying', { name: replay.name })}
        </span>
      )}
      <div className="mx-2 min-w-0 flex-1 truncate text-center font-medium">{name}</div>
      <Button
        size="sm"
        variant={recording ? 'danger' : 'default'}
        onClick={toggleRecording}
        aria-pressed={!!recording}
      >
        <RecordIcon size={12} />{' '}
        {recording
          ? t('simulation.stopRecording', { count: recording.length })
          : t('simulation.record')}
      </Button>
      <Tip label={t('commands.view.palette')} keys={formatKeys('Mod+K')} side="bottom">
        <IconButton label={t('commands.view.palette')} onClick={() => runCommand('view.palette')}>
          <SearchIcon size={16} />
        </IconButton>
      </Tip>
      <ThemeSwitcher />
      <Button size="sm" variant="primary" onClick={stopSimulation}>
        <StopIcon size={12} /> {t('simulation.stop')}
      </Button>
    </header>
  );
}
