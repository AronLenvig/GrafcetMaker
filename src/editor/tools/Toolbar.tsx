import { useTranslation } from 'react-i18next';
import {
  ActionIcon,
  CommentIcon,
  HandIcon,
  PointerIcon,
  RedoIcon,
  FeedbackIcon,
  HelpIcon,
  StepIcon,
  TransitionIcon,
  UndoIcon,
} from '@/app/ui/icons';
import { IconButton, Tip } from '@/app/ui/primitives';
import { formatKeys, getCommand, runCommand } from '../commands/registry';
import { useDoc } from '../store/document';
import { ui, useUi, type Tool } from '../store/uiStore';

const TOOLS: { id: Tool; Icon: typeof StepIcon }[] = [
  { id: 'select', Icon: PointerIcon },
  { id: 'hand', Icon: HandIcon },
  { id: 'step', Icon: StepIcon },
  { id: 'transition', Icon: TransitionIcon },
  { id: 'comment', Icon: CommentIcon },
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
  const oneSelected = useUi((s) => Object.keys(s.selection).length === 1);
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
      <Tip label={t('commands.insert.action')} keys={keysOf('insert.action')}>
        <IconButton
          label={t('commands.insert.action')}
          disabled={!oneSelected}
          onClick={() => runCommand('insert.action')}
        >
          <ActionIcon size={18} />
        </IconButton>
      </Tip>
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
