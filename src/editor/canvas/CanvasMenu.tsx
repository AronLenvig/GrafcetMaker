import * as ContextMenu from '@radix-ui/react-context-menu';
import { useRef, type ReactElement, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { menuContentClass, menuItemClass } from '@/app/ui/primitives';
import type { Grafcet, Id } from '@/core/model/types';
import { tDynamic } from '@/i18n/dynamic';
import { addStepAt, editActive } from '../commands/edit';
import { formatKeys, getCommand, isAvailable, runCommand } from '../commands/registry';
import { useUi } from '../store/uiStore';
import { useInteraction } from './interactionStore';

type MenuKind = 'step' | 'transition' | 'action' | 'comment' | 'link' | 'many' | 'canvas';

/** Commands by id, '-' a separator; `addStep` and `autoRoute` are the menu's own. */
const MENUS: Record<MenuKind, readonly string[]> = {
  step: [
    'insert.action',
    'insert.append',
    'insert.parallel',
    'insert.alternative',
    'insert.loop',
    '-',
    'edit.rename',
    'edit.toggleInitial',
    'insert.macroStep',
    'insert.enclosingStep',
    'view.openChild',
    '-',
    'edit.cut',
    'edit.copy',
    'edit.paste',
    '-',
    'edit.delete',
    'edit.deleteNoHeal',
  ],
  transition: [
    'edit.rename',
    'insert.append',
    'insert.jump',
    'edit.drawAsJump',
    'edit.drawAsLink',
    'edit.rotate',
    'autoRoute',
    '-',
    'edit.cut',
    'edit.copy',
    'edit.paste',
    '-',
    'edit.delete',
    'edit.deleteNoHeal',
  ],
  action: ['edit.rename', 'insert.action', '-', 'edit.cut', 'edit.copy', '-', 'edit.delete'],
  comment: ['edit.rename', '-', 'edit.cut', 'edit.copy', '-', 'edit.delete'],
  link: ['edit.drawAsJump', 'edit.delete'],
  many: [
    'arrange.layoutSelection',
    'view.fitSelection',
    '-',
    'edit.cut',
    'edit.copy',
    'edit.paste',
    '-',
    'edit.delete',
  ],
  canvas: [
    'addStep',
    'edit.paste',
    'edit.selectAll',
    '-',
    'arrange.layout',
    'arrange.renumber',
    'view.fit',
    '-',
    'edit.undo',
    'edit.redo',
  ],
};

function menuKind(g: Grafcet, selection: Record<Id, true>, link: string | null): MenuKind {
  if (link) return 'link';
  const ids = Object.keys(selection);
  if (ids.length > 1) return 'many';
  const id = ids[0];
  if (id === undefined) return 'canvas';
  if (g.steps[id]) return 'step';
  if (g.transitions[id]) return 'transition';
  if (g.actions[id]) return 'action';
  return g.comments[id] ? 'comment' : 'canvas';
}

interface Entry {
  key: string;
  label: string;
  keys?: string;
  run: () => void;
}

/** The entries for what was right-clicked, without the unavailable ones or stray separators. */
function useEntries(g: Grafcet): (Entry | '-')[] {
  const { t } = useTranslation();
  const selection = useUi((s) => s.selection);
  const link = useUi((s) => s.selectedLink);
  const kind = menuKind(g, selection, link);
  const entries: (Entry | '-')[] = [];
  for (const id of MENUS[kind]) {
    if (id === '-') {
      if (entries.length && entries[entries.length - 1] !== '-') entries.push('-');
    } else if (id === 'addStep') {
      entries.push({
        key: id,
        label: t('canvas.menu.addStepHere'),
        run: () => {
          const at = useInteraction.getState().menuAt;
          if (at) addStepAt(at);
        },
      });
    } else if (id === 'autoRoute') {
      const tid = Object.keys(selection)[0]!;
      if (g.transitions[tid]?.routing)
        entries.push({
          key: id,
          label: t('canvas.menu.autoRoute'),
          run: () =>
            editActive('history.route', (gd) => {
              const tr = gd.transitions[tid];
              if (tr) delete tr.routing;
            }),
        });
    } else {
      const c = getCommand(id);
      if (!isAvailable(c)) continue;
      entries.push({
        key: id,
        label: tDynamic(t, `commands.${c.label}`),
        keys: c.keys?.[0] ? formatKeys(c.keys[0]) : undefined,
        run: () => runCommand(id),
      });
    }
  }
  if (entries[entries.length - 1] === '-') entries.pop();
  return entries;
}

function Entries({ g, onChoose }: { g: Grafcet; onChoose: (run: () => void) => void }) {
  const entries = useEntries(g);
  return (
    <>
      {entries.map((e, i) =>
        e === '-' ? (
          <ContextMenu.Separator key={i} className="my-1 h-px bg-border" />
        ) : (
          <ContextMenu.Item key={e.key} className={menuItemClass} onSelect={() => onChoose(e.run)}>
            <span className="flex-1">{e.label}</span>
            {e.keys && <kbd className="font-mono text-xs text-muted">{e.keys}</kbd>}
          </ContextMenu.Item>
        ),
      )}
    </>
  );
}

/**
 * Desktops: the canvas's right-click menu, for the element under the pointer (selected first),
 * the selection, or the empty canvas. The menu key opens it for the current selection.
 */
export function CanvasMenu({
  g,
  disabled,
  canvasRef,
  children,
}: {
  g: Grafcet | undefined;
  disabled: boolean;
  /** The canvas, focused again when the menu closes. */
  canvasRef: RefObject<HTMLElement | null>;
  children: ReactElement;
}) {
  // The chosen entry runs once the menu has closed and the canvas has the focus back, so an
  // editor it opens (action text, receptivity) keeps the focus.
  const chosen = useRef<(() => void) | null>(null);
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild disabled={disabled}>
        {children}
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content
          className={menuContentClass}
          collisionPadding={8}
          onCloseAutoFocus={(e) => {
            const run = chosen.current;
            chosen.current = null;
            if (!run) return;
            e.preventDefault();
            canvasRef.current?.focus({ preventScroll: true });
            run();
          }}
        >
          {g && <Entries g={g} onChoose={(run) => (chosen.current = run)} />}
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
