import { useTranslation } from 'react-i18next';
import { openHelp } from '@/app/help/helpStore';
import { setPrefs, usePrefs } from '@/app/prefs';
import { CloseIcon } from '@/app/ui/icons';
import { useCoarsePointer, useCompact } from '@/app/ui/media';
import type { Grafcet } from '@/core/model/types';
import { tDynamic } from '@/i18n/dynamic';
import { formatKeys } from '../commands/registry';
import { useSim } from '../simulation/simStore';
import { useDoc } from '../store/document';
import { useUi } from '../store/uiStore';
import { useInteraction } from './interactionStore';

/** One hint: keys (combos formatted for the platform, or a gesture key under `hints.keys`) and what they do. */
type Hint = [keys: string | null, what: string];

const EMPTY: Hint[] = [
  ['@dblclick', 'addStep'],
  ['S', 'placeStep'],
  ['Mod+K', 'commands'],
  ['?', 'shortcuts'],
];
const IDLE: Hint[] = [
  ['@click', 'select'],
  ['@dblclickEmpty', 'addStep'],
  ['@spaceDrag', 'pan'],
  ['@modWheel', 'zoom'],
  ['Mod+K', 'commands'],
];
const STEP: Hint[] = [
  ['Enter', 'appendFromStep'],
  ['A', 'action'],
  ['P', 'parallel'],
  ['O', 'alternative'],
  ['L', 'loop'],
  ['F2', 'editNumber'],
  ['@dragHandle', 'connectToTransition'],
  ['Delete', 'deleteHeal'],
];
const TRANSITION: Hint[] = [
  ['F2', 'editReceptivity'],
  ['Enter', 'appendFromTransition'],
  ['@dragHandle', 'connectToStep'],
  ['@edges', 'edges'],
  ['Delete', 'deleteHeal'],
];
const ACTION: Hint[] = [
  ['F2', 'editAction'],
  ['A', 'nextAction'],
  ['@properties', 'actionKind'],
  ['Delete', 'delete'],
];
const FREE_ACTION: Hint[] = [
  ['@dragOntoStep', 'attach'],
  ['@properties', 'chooseStep'],
  ['F2', 'editAction'],
  ['Delete', 'delete'],
];
const COMMENT: Hint[] = [
  ['F2', 'editComment'],
  ['@drag', 'move'],
  ['Delete', 'delete'],
];
const MANY: Hint[] = [
  ['@drag', 'moveAll'],
  ['@arrows', 'nudge'],
  ['Mod+C', 'copy'],
  ['Mod+V', 'paste'],
  ['@shiftClick', 'toggleSelect'],
  ['Delete', 'delete'],
];
const LINK: Hint[] = [
  ['@dragSideways', 'route'],
  ['Delete', 'deleteLink'],
];

/** Touch screens: gestures instead of keys and clicks (the selection toolbar covers selections). */
const TOUCH_IDLE: Hint[] = [
  ['@tap', 'select'],
  ['@doubleTapEmpty', 'addStep'],
  ['@dragEmpty', 'pan'],
  ['@pinch', 'zoom'],
  ['@holdDrag', 'marqueeSelect'],
];

function touchHints(tool: string, linkFrom: 'step' | 'transition' | null, loop: boolean): Hint[] {
  if (linkFrom)
    return [
      ['@release', linkFrom === 'step' ? 'linkToTransition' : 'linkToStep'],
      ['@releaseEmpty', linkFrom === 'step' ? 'linkNewTransition' : 'linkNewStep'],
    ];
  if (loop) return [['@tapStep', 'loopTarget']];
  if (tool === 'action')
    return [
      ['@tapStep', 'attachNew'],
      ['@tapEmpty', 'place.action'],
    ];
  if (tool === 'step' || tool === 'transition' || tool === 'comment')
    return [['@tapEmpty', `place.${tool}`]];
  return TOUCH_IDLE;
}

function selectionHints(g: Grafcet, ids: string[]): Hint[] {
  if (ids.length > 1) return MANY;
  const id = ids[0]!;
  const step = g.steps[id];
  if (step) {
    const child: Hint[] =
      step.kind === 'macro' || step.kind === 'enclosing' ? [['Alt+ArrowDown', 'openChild']] : [];
    return [...STEP, ...child, ['@properties', 'stepKind']];
  }
  if (g.transitions[id]) return TRANSITION;
  if (g.actions[id]) return g.actions[id].stepId === null ? FREE_ACTION : ACTION;
  if (g.comments[id]) return COMMENT;
  return IDLE;
}

/**
 * Contextual hints (under the toolbar; on phones, in the canvas corner): what can be done with the
 * current selection, tool or gesture, with its keys. Hidden from View › Hints or Settings.
 */
export function HintBar() {
  const { t } = useTranslation();
  const show = usePrefs((s) => s.showHints);
  const simulating = useSim((s) => s.on);
  const tool = useUi((s) => s.tool);
  const pending = useUi((s) => s.pending);
  const selection = useUi((s) => s.selection);
  const selectedLink = useUi((s) => s.selectedLink);
  const editing = useUi((s) => s.editing);
  const gid = useUi((s) => s.activeGrafcetId);
  const g = useDoc((s) => (gid ? s.project.grafcets[gid] : undefined));
  const link = useInteraction((s) => s.link);
  const moving = useInteraction((s) => s.moving);
  const marquee = useInteraction((s) => s.marquee);
  const coarse = useCoarsePointer();
  const compact = useCompact();
  const hasSelection = Object.keys(selection).length > 0 || !!selectedLink;
  if (!show || !g || editing) return null;
  if (coarse && !simulating && (moving || marquee || (hasSelection && !link))) return null;

  let hints: Hint[];
  if (coarse)
    hints = simulating
      ? [['@inputs', 'simInputs']]
      : touchHints(tool, link?.fromKind ?? null, pending?.kind === 'loop');
  else if (simulating)
    hints = [
      ['F5', 'simRun'],
      ['F10', 'simStep'],
      ['Shift+F5', 'simStop'],
      ['@inputs', 'simInputs'],
    ];
  else if (link)
    hints = [
      ['@release', link.fromKind === 'step' ? 'linkToTransition' : 'linkToStep'],
      ['@releaseEmpty', link.fromKind === 'step' ? 'linkNewTransition' : 'linkNewStep'],
      ['Escape', 'cancel'],
    ];
  else if (moving) hints = [['Escape', 'cancelMove']];
  else if (marquee) hints = [['@release', 'marqueeSelect']];
  else if (pending?.kind === 'loop')
    hints = [
      ['@clickStep', 'loopTarget'],
      ['Escape', 'cancel'],
    ];
  else if (tool === 'action')
    hints = [
      ['@clickStep', 'attachNew'],
      ['@clickEmpty', 'place.action'],
      ['@shiftClick', 'placeMany'],
      ['Escape', 'backToSelect'],
    ];
  else if (tool === 'step' || tool === 'transition' || tool === 'comment')
    hints = [
      ['@clickEmpty', `place.${tool}`],
      ['@shiftClick', 'placeMany'],
      ['Escape', 'backToSelect'],
    ];
  else if (tool === 'hand')
    hints = [
      ['@drag', 'pan'],
      ['V', 'backToSelect'],
    ];
  else if (selectedLink) hints = LINK;
  else {
    const ids = Object.keys(selection);
    hints = ids.length ? selectionHints(g, ids) : Object.keys(g.steps).length ? IDLE : EMPTY;
  }

  return (
    <div
      role="note"
      aria-label={t('hints.label')}
      className={
        compact
          ? 'pointer-events-auto absolute top-2 left-2 flex max-w-[calc(100%-64px)] items-start gap-2 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-muted shadow-pop'
          : 'pointer-events-auto flex max-w-full items-start gap-2 rounded-lg border border-border bg-surface/90 px-2.5 py-1 text-xs text-muted backdrop-blur-sm'
      }
    >
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {hints.map(([keys, what]) => (
          <span key={`${keys}-${what}`} className="inline-flex items-center gap-1">
            {keys &&
              (keys.startsWith('@') ? (
                <span className="font-medium text-text">
                  {tDynamic(t, `hints.keys.${keys.slice(1)}`)}
                </span>
              ) : (
                <kbd className="gm-kbd">{formatKeys(keys)}</kbd>
              ))}
            <span>{tDynamic(t, `hints.do.${what}`)}</span>
          </span>
        ))}
      </p>
      <button
        type="button"
        onClick={() => openHelp(simulating ? 'simulation' : 'editing')}
        title={t('help.learnMore')}
        className="shrink-0 rounded px-1 font-medium text-accent hover:bg-surface-2"
      >
        {t('help.learnMore')}
      </button>
      <button
        type="button"
        onClick={() => setPrefs({ showHints: false })}
        aria-label={t('hints.hide')}
        title={t('hints.hide')}
        className="-mr-1 flex h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-surface-2 hover:text-text pointer-coarse:-my-1.5 pointer-coarse:h-8 pointer-coarse:w-8"
      >
        <CloseIcon size={12} />
      </button>
    </div>
  );
}
