import { useTranslation } from 'react-i18next';
import {
  ActionIcon,
  CommentIcon,
  HandIcon,
  PointerIcon,
  RedoIcon,
  FeedbackIcon,
  HelpIcon,
  PanelBottomIcon,
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

/** Left tool rail. */
export function Toolbar() {
  const { t } = useTranslation();
  const tool = useUi((s) => s.tool);
  const canUndo = useDoc((s) => s.past.length > 0);
  const canRedo = useDoc((s) => s.future.length > 0);
  return (
    <nav aria-label={t('tools.label')} className="flex h-full flex-col items-center gap-1 py-2">
      <div role="radiogroup" aria-label={t('tools.label')} className="flex flex-col gap-1">
        {TOOLS.map(({ id, Icon }) => (
          <Tip key={id} label={t(`commands.tools.${id}`)} keys={keysOf(`tools.${id}`)}>
            <IconButton
              role="radio"
              aria-checked={tool === id}
              label={t(`commands.tools.${id}`)}
              active={tool === id}
              onClick={() => ui.setTool(id)}
            >
              <Icon size={18} />
            </IconButton>
          </Tip>
        ))}
      </div>
      <div className="my-1 h-px w-6 bg-border" />
      <Tip label={t('commands.edit.undo')} keys={keysOf('edit.undo')}>
        <IconButton
          label={t('commands.edit.undo')}
          disabled={!canUndo}
          onClick={() => runCommand('edit.undo')}
        >
          <UndoIcon size={18} />
        </IconButton>
      </Tip>
      <Tip label={t('commands.edit.redo')} keys={keysOf('edit.redo')}>
        <IconButton
          label={t('commands.edit.redo')}
          disabled={!canRedo}
          onClick={() => runCommand('edit.redo')}
        >
          <RedoIcon size={18} />
        </IconButton>
      </Tip>
      <RailFooter />
    </nav>
  );
}

/** Bottom of the left rail (also shown while simulating): help and feedback. */
export function RailFooter() {
  const { t } = useTranslation();
  return (
    <div className="mt-auto flex flex-col items-center gap-1">
      <Tip label={t('commands.help.open')} keys="F1">
        <IconButton label={t('commands.help.open')} onClick={() => runCommand('help.open')}>
          <HelpIcon size={18} />
        </IconButton>
      </Tip>
      <Tip label={t('commands.help.feedback')}>
        <IconButton label={t('commands.help.feedback')} onClick={() => runCommand('help.feedback')}>
          <FeedbackIcon size={18} />
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
                  <Icon size={20} />
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
