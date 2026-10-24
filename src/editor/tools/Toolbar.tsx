import { useTranslation } from 'react-i18next';
import {
  ActionIcon,
  CommentIcon,
  HandIcon,
  PanelBottomIcon,
  PlayIcon,
  PointerIcon,
  RedoIcon,
  StepIcon,
  TransitionIcon,
  UndoIcon,
} from '@/app/ui/icons';
import { closeSheet, showSheet, useSheet } from '@/app/sheet';
import { cx, IconButton, Tip } from '@/app/ui/primitives';
import { formatKeys, getCommand, runCommand } from '../commands/registry';
import { useSim } from '../simulation/simStore';
import { useDoc } from '../store/document';
import { ui, useUi, type Tool } from '../store/uiStore';

const TOOLS: { id: Tool; Icon: typeof StepIcon }[] = [
  { id: 'select', Icon: PointerIcon },
  { id: 'hand', Icon: HandIcon },
  { id: 'step', Icon: StepIcon },
  { id: 'transition', Icon: TransitionIcon },
  { id: 'comment', Icon: CommentIcon },
  { id: 'action', Icon: ActionIcon },
];

function keysOf(id: string): string | undefined {
  const k = getCommand(id).keys?.[0];
  return k ? formatKeys(k) : undefined;
}

/** The key in a button's corner, compact (`⇧A`); the tooltip spells it out. */
function CornerKey({ id }: { id: string }) {
  const k = getCommand(id).keys?.[0];
  if (!k) return null;
  return (
    <span
      aria-hidden="true"
      className="absolute right-1 bottom-0.5 text-[9px] leading-none font-normal text-muted"
    >
      {k.replace('Shift+', '⇧')}
    </span>
  );
}

/**
 * Desktops and tablets: the tools as a floating island at the top of the canvas, Simulate at its
 * right end. Each button shows its key in the corner.
 */
export function ToolIsland() {
  const { t } = useTranslation();
  const tool = useUi((s) => s.tool);
  return (
    <div data-tour="tools" className="gm-island flex items-center gap-0.5 p-1">
      <div role="radiogroup" aria-label={t('tools.label')} className="flex items-center gap-0.5">
        {TOOLS.map(({ id, Icon }) => {
          const keys = keysOf(`tools.${id}`);
          const label = t(`commands.tools.${id}`);
          return (
            <Tip key={id} label={label} keys={keys} side="bottom">
              <button
                type="button"
                role="radio"
                aria-checked={tool === id}
                aria-label={label}
                onClick={() => ui.setTool(id)}
                className={cx(
                  'relative flex h-9 w-9 items-center justify-center rounded-lg',
                  tool === id ? 'bg-accent-soft text-accent' : 'text-text hover:bg-surface-2',
                )}
              >
                <Icon size={20} />
                <CornerKey id={`tools.${id}`} />
              </button>
            </Tip>
          );
        })}
      </div>
      <div aria-hidden="true" className="mx-1 h-6 w-px bg-border" />
      <Tip label={t('commands.simulate.start')} keys="F5" side="bottom">
        <button
          type="button"
          aria-label={t('simulation.simulateLabel')}
          data-tour="simulate"
          onClick={() => runCommand('sim.toggle')}
          className="relative flex h-9 w-9 items-center justify-center rounded-lg hover:bg-surface-2"
        >
          <PlayIcon size={14} className="text-success" />
          <CornerKey id="sim.toggle" />
        </button>
      </Tip>
    </div>
  );
}

/** Undo and redo, as a floating island. */
export function UndoRedoIsland() {
  const { t } = useTranslation();
  const canUndo = useDoc((s) => s.past.length > 0);
  const canRedo = useDoc((s) => s.future.length > 0);
  return (
    <div className="gm-island flex items-center p-0.5">
      <Tip label={t('commands.edit.undo')} keys={keysOf('edit.undo')} side="top">
        <IconButton
          label={t('commands.edit.undo')}
          disabled={!canUndo}
          className="h-9 w-9"
          onClick={() => runCommand('edit.undo')}
        >
          <UndoIcon size={18} />
        </IconButton>
      </Tip>
      <Tip label={t('commands.edit.redo')} keys={keysOf('edit.redo')} side="top">
        <IconButton
          label={t('commands.edit.redo')}
          disabled={!canRedo}
          className="h-9 w-9"
          onClick={() => runCommand('edit.redo')}
        >
          <RedoIcon size={18} />
        </IconButton>
      </Tip>
    </div>
  );
}

/** Phones: no hand tool (one finger on the empty canvas pans). */
const PHONE_TOOLS = TOOLS.filter((x) => x.id !== 'hand');

/**
 * Phones: the tools, undo/redo and the panel sheet in one bar at the bottom of the screen, where
 * thumbs reach. While simulating only the panels button remains (inputs live in the sheet).
 */
export function BottomToolbar() {
  const { t } = useTranslation();
  const tool = useUi((s) => s.tool);
  const canUndo = useDoc((s) => s.past.length > 0);
  const canRedo = useDoc((s) => s.future.length > 0);
  const simulating = useSim((s) => s.on);
  const sheetOpen = useSheet((s) => s.open);
  const big = 'h-11 w-10';
  return (
    <nav
      aria-label={t('tools.label')}
      className="shrink-0 border-t border-border bg-surface pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]"
    >
      <div className="flex h-12 items-center gap-0.5 px-1">
        {!simulating && (
          <>
            <div role="radiogroup" aria-label={t('tools.label')} className="flex">
              {PHONE_TOOLS.map(({ id, Icon }) => (
                <IconButton
                  key={id}
                  role="radio"
                  aria-checked={tool === id}
                  label={t(`commands.tools.${id}`)}
                  active={tool === id}
                  className={big}
                  onClick={() => ui.setTool(id)}
                >
                  <Icon size={22} />
                </IconButton>
              ))}
            </div>
            <div className="mx-0.5 h-6 w-px bg-border" />
            <IconButton
              label={t('commands.edit.undo')}
              disabled={!canUndo}
              className={big}
              onClick={() => runCommand('edit.undo')}
            >
              <UndoIcon size={20} />
            </IconButton>
            <IconButton
              label={t('commands.edit.redo')}
              disabled={!canRedo}
              className={big}
              onClick={() => runCommand('edit.redo')}
            >
              <RedoIcon size={20} />
            </IconButton>
          </>
        )}
        <IconButton
          label={t('panels.label')}
          active={sheetOpen}
          className={cx(big, 'ml-auto')}
          onClick={() => (sheetOpen ? closeSheet() : showSheet(useSheet.getState().tab))}
        >
          <PanelBottomIcon size={20} />
        </IconButton>
      </div>
    </nav>
  );
}
