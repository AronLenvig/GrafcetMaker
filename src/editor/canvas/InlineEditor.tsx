import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ACTION_PAD,
  CHAR_WIDTH_EM,
  FONT_SIZE,
  LABEL_FONT_SIZE,
  LINE_HEIGHT,
  STEP_FONT_SIZE,
  actionBoxOf,
  actionDecor,
  commentRect,
  stepLabelAnchor,
  transitionNumberAnchor,
  transitionTextAnchor,
  type GrafcetGeometry,
} from '@/core/layout/geometry';
import { actionTextKind, type ExpressionKind } from '@/core/expr/check';
import type { Grafcet } from '@/core/model/types';
import { ExpressionInput, type ExpressionInputHandle } from '@/panels/ExpressionInput';
import { continueAfter, nextAfter } from '../commands/edit';
import { editExpression } from '../commands/variables';
import { ui, useUi, type EditTarget, type Viewport } from '../store/uiStore';
import { useInteraction } from './interactionStore';
import { useCoarsePointer, useCompact } from '@/app/ui/media';
import { canvasSizeOf } from './viewport';

function focusCanvas(): void {
  document.querySelector<HTMLElement>('[data-canvas]')?.focus({ preventScroll: true });
}

function currentValue(g: Grafcet, t: EditTarget): string | null {
  const s = g.steps[t.id];
  if (s)
    return t.field === 'number' ? String(s.number) : t.field === 'label' ? (s.label ?? '') : null;
  const tr = g.transitions[t.id];
  if (tr)
    return t.field === 'receptivity'
      ? tr.receptivity
      : t.field === 'number'
        ? String(tr.number ?? '')
        : null;
  const a = g.actions[t.id];
  if (a) return t.field === 'text' ? a.text : t.field === 'condition' ? (a.condition ?? '') : null;
  const c = g.comments[t.id];
  if (c) return t.field === 'text' ? c.text : null;
  return null;
}

/** Applies an edited value. Returns an i18n error key when the value is rejected. */
export function applyEdit(t: EditTarget, raw: string): 'editor.invalidNumber' | null {
  const value = t.field === 'text' ? raw.replace(/\s+$/, '') : raw.trim();
  if (t.field === 'number' && value !== '' && !/^\d{1,6}$/.test(value))
    return 'editor.invalidNumber';
  // Receptivities, action texts and conditions declare the new names they use.
  editExpression('history.edit', (g) => {
    const s = g.steps[t.id];
    if (s) {
      if (t.field === 'number' && value !== '') s.number = Number(value);
      if (t.field === 'label') {
        if (value) s.label = value;
        else delete s.label;
      }
      return null;
    }
    const tr = g.transitions[t.id];
    if (tr) {
      if (t.field === 'receptivity') {
        tr.receptivity = value;
        return { kind: 'condition', source: value };
      }
      if (t.field === 'number') {
        if (value === '') delete tr.number;
        else tr.number = Number(value);
      }
      return null;
    }
    const a = g.actions[t.id];
    if (a) {
      if (t.field === 'text') {
        a.text = value;
        return { kind: actionTextKind(a.kind), source: value };
      }
      if (t.field === 'condition') {
        if (value) a.condition = value;
        else delete a.condition;
        return { kind: 'condition', source: value };
      }
      return null;
    }
    const c = g.comments[t.id];
    if (c && t.field === 'text') c.text = raw.replace(/\s+$/, '');
    return null;
  });
  return null;
}

/**
 * Where the edited text is drawn on screen, with the diagram's own font size: the editor takes its
 * place, so typing looks like typing on the diagram.
 */
interface Placement {
  /** Screen x where the text starts (left), is centered (center) or ends (right). */
  x: number;
  /** Screen y of the text's vertical center (single line), or of the top of its first line. */
  y: number;
  align: 'left' | 'center' | 'right';
  fontSize: number;
  /** Multi-line text (comments): the height of a line on screen. */
  lineHeight?: number;
}

function placement(
  g: Grafcet,
  geom: GrafcetGeometry,
  t: EditTarget,
  v: Viewport,
): Placement | null {
  const z = v.zoom;
  const sx = (x: number) => (x - v.x) * z;
  const sy = (y: number) => (y - v.y) * z;
  const fontSize = FONT_SIZE * z;
  const s = g.steps[t.id];
  if (s) {
    if (t.field === 'number')
      return {
        x: sx(s.position.x),
        y: sy(s.position.y),
        align: 'center',
        fontSize: STEP_FONT_SIZE * z,
      };
    const a = stepLabelAnchor(s);
    return { x: sx(a.x), y: sy(a.y), align: 'right', fontSize: LABEL_FONT_SIZE * z };
  }
  const tr = g.transitions[t.id];
  if (tr) {
    const a = t.field === 'number' ? transitionNumberAnchor(tr) : transitionTextAnchor(tr);
    return { x: sx(a.x), y: sy(a.y), align: t.field === 'number' ? 'right' : 'left', fontSize };
  }
  const act = g.actions[t.id];
  if (act) {
    const box = actionBoxOf(g, geom, act.id);
    if (!box) return null;
    if (t.field === 'condition') {
      // Where its condition is written, also while it is still empty.
      const d = actionDecor({ ...act, condition: 'x' }, box).text!;
      return { x: sx(d.x), y: sy(d.y), align: d.anchor === 'end' ? 'right' : 'left', fontSize };
    }
    const pad = ACTION_PAD + (act.kind === 'forcing' ? 3 : 0);
    return { x: sx(box.x + pad), y: sy(box.y + box.height / 2), align: 'left', fontSize };
  }
  const c = g.comments[t.id];
  if (c) {
    const r = commentRect(c);
    return {
      x: sx(r.x + 8),
      y: sy(r.y + 6),
      align: 'left',
      fontSize,
      lineHeight: LINE_HEIGHT * z,
    };
  }
  return null;
}

type Box = { left: number; top: number; width: number; height: number };

/** Height of the symbol bar of a condition (ExpressionInput) and its gap, in screen pixels. */
const SYMBOL_BAR_HEIGHT = 34;

/**
 * Screen box of the editor for the current text: exactly the text, plus room for the caret. The
 * text is always left-aligned in it; a right-aligned or centered text moves the box instead, so it
 * grows to the left (or both ways) as it would on the diagram.
 */
function boxFor(p: Placement, value: string): Box {
  const char = p.fontSize * CHAR_WIDTH_EM;
  if (p.lineHeight) {
    const lines = value.split('\n');
    const longest = Math.max(...lines.map((l) => [...l].length));
    return {
      left: p.x,
      top: p.y,
      width: (longest + 1) * char,
      height: lines.length * p.lineHeight,
    };
  }
  const textWidth = [...value].length * char;
  const height = Math.round(p.fontSize * 1.3);
  const left =
    p.align === 'left' ? p.x : p.align === 'center' ? p.x - textWidth / 2 : p.x - textWidth;
  return { left, top: p.y - height / 2, width: textWidth + char, height };
}

/** Phones: a boxed field across the canvas, large enough to read and keep on screen. */
function phoneBoxFor(p: Placement, value: string, canvasWidth: number): Box & { fontSize: number } {
  const fontSize = Math.min(26, Math.max(14, p.fontSize));
  const lines = p.lineHeight ? value.split('\n').length : 1;
  const height = p.lineHeight ? lines * fontSize * 1.25 + 16 : Math.round(fontSize * 1.8);
  return {
    left: 8,
    top: p.lineHeight ? p.y - 4 : p.y - height / 2,
    width: Math.max(120, canvasWidth - 16),
    height,
    fontSize,
  };
}

/** Expression kind edited by a field, or null for plain text (numbers, labels, comments). */
function expressionKind(g: Grafcet, t: EditTarget): ExpressionKind | null {
  if (t.field === 'receptivity' || t.field === 'condition') return 'condition';
  const a = g.actions[t.id];
  if (a && t.field === 'text') return actionTextKind(a.kind);
  return null;
}

function EditorHint({
  left,
  top,
  multiline,
  error,
  next,
}: {
  left: number;
  top: number;
  multiline: boolean;
  error: string | null;
  next: 'action' | 'step' | null;
}) {
  const { t } = useTranslation();
  return (
    <div
      className="pointer-events-none absolute z-10 flex flex-col items-start gap-1"
      style={{ left, top }}
    >
      {error && (
        <div
          role="alert"
          className="rounded-md border border-danger bg-surface px-2 py-1 text-xs text-danger shadow-pop"
        >
          {error}
        </div>
      )}
      <div className="flex items-center gap-1 rounded-md bg-surface/90 px-1.5 py-0.5 text-[11px] text-muted shadow-sm">
        <kbd className="gm-kbd">{multiline ? 'Ctrl+↵' : '↵'}</kbd> {t('fields.apply')}
        {next && (
          <>
            <kbd className="gm-kbd ml-1">⇧↵</kbd>{' '}
            {t(next === 'action' ? 'fields.nextAction' : 'fields.nextStep')}
          </>
        )}
        <kbd className="gm-kbd ml-1">Esc</kbd> {t('fields.cancel')}
      </div>
    </div>
  );
}

function EditorField({
  g,
  geom,
  viewport,
  target,
}: {
  g: Grafcet;
  geom: GrafcetGeometry;
  viewport: Viewport;
  target: EditTarget;
}) {
  const { t } = useTranslation();
  const initial = currentValue(g, target) ?? '';
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const exprRef = useRef<ExpressionInputHandle>(null);
  const done = useRef(false);
  const compact = useCompact();
  const coarse = useCoarsePointer();

  useEffect(() => {
    // preventScroll: the canvas container must never scroll to reveal the editor.
    if (inputRef.current) {
      inputRef.current.focus({ preventScroll: true });
      inputRef.current.select();
    } else {
      exprRef.current?.focus();
      exprRef.current?.select();
    }
  }, []);

  // The diagram draws the typed text's surroundings live: boxes grow as it is typed.
  useEffect(() => {
    useInteraction.setState({ draft: value });
  }, [value]);
  useEffect(() => () => useInteraction.setState({ draft: null }), []);

  const place = placement(g, geom, target, viewport);
  if (!place) return null;
  // Desktops: in place, in the diagram's font, only the caret shows. Phones: a boxed field across
  // the canvas, so the text and the symbol buttons stay on screen above the keyboard.
  const seamless = !compact;
  const phone = seamless ? null : phoneBoxFor(place, value, canvasSizeOf(g.id).width);
  const box = phone ?? boxFor(place, value);
  const multiline = place.lineHeight !== undefined;

  const finish = (save: boolean) => {
    if (done.current) return;
    if (save) {
      const err = applyEdit(target, value);
      if (err) {
        setError(t(err));
        return;
      }
    }
    done.current = true;
    ui.edit(null);
    focusCanvas();
  };

  // Shift+Enter: apply, then edit the next action or receptivity (created at the end).
  const next =
    target.field === 'text' || target.field === 'receptivity'
      ? nextAfter(g, target.id, geom.index)
      : null;
  const finishNext = (v: string) => {
    if (done.current) return;
    applyEdit(target, v);
    done.current = true;
    ui.edit(null);
    continueAfter(target.id);
    if (!ui.get().editing) focusCanvas();
  };

  // Clicking elsewhere keeps valid edits and drops invalid ones; focus stays where the user clicked.
  const onBlur = () => {
    if (done.current) return;
    done.current = true;
    applyEdit(target, value);
    ui.edit(null);
  };

  const label = t(`editor.fields.${target.field}`);
  const style: CSSProperties = {
    left: box.left,
    top: box.top,
    width: box.width,
    height: box.height,
    ...(phone
      ? { fontSize: phone.fontSize, textAlign: multiline ? 'left' : place.align }
      : { fontSize: place.fontSize, lineHeight: `${place.lineHeight ?? box.height}px` }),
  };
  // Touch keyboards have no Esc: the key hint only shows with a mouse (errors always do).
  const exprKind = expressionKind(g, target);
  // Conditions show their symbol bar under the text when it sits low on the screen (dropUp):
  // the key hint goes below the bar.
  const belowBar = exprKind === 'condition' ? SYMBOL_BAR_HEIGHT : 0;
  const hint =
    coarse && !error ? null : (
      <EditorHint
        left={box.left}
        top={box.top + box.height + 6 + belowBar}
        multiline={multiline}
        error={error}
        next={next}
      />
    );

  if (exprKind) {
    return (
      <>
        <ExpressionInput
          ref={exprRef}
          kind={exprKind}
          grafcetId={g.id}
          value={value}
          onChange={setValue}
          onCommit={() => finish(true)}
          onCommitNext={next ? finishNext : undefined}
          onCancel={() => finish(false)}
          onBlur={onBlur}
          label={label}
          floating
          seamless={seamless}
          dropUp={box.top > canvasSizeOf(g.id).height / 2}
          className="absolute z-10"
          style={style}
        />
        {box.top <= canvasSizeOf(g.id).height / 2 ? null : hint}
      </>
    );
  }

  // Comments and step labels are prose; everything else is code.
  const prose = !!g.comments[target.id] || target.field === 'label';
  const common = {
    ref: inputRef,
    value,
    style,
    'aria-label': label,
    'aria-invalid': !!error,
    className: seamless ? 'gm-inline-editor gm-seamless' : 'gm-inline-editor',
    spellCheck: false,
    autoComplete: 'off',
    // Phone keyboards: no capitals or "corrections" in step numbers and action code.
    autoCapitalize: prose ? undefined : 'off',
    autoCorrect: prose ? undefined : 'off',
    enterKeyHint: multiline ? undefined : ('done' as const),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValue(e.target.value);
      setError(null);
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'Escape') {
        e.preventDefault();
        finish(false);
      } else if (e.key === 'Enter' && (!multiline || e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        finish(true);
      }
    },
    onBlur,
  };

  return (
    <>
      {multiline ? <textarea {...common} wrap="off" /> : <input {...common} />}
      {hint}
    </>
  );
}

/** In-place text editor positioned over the element being edited (F2, double-click, Enter flow). */
export function InlineEditor({
  g,
  geom,
  viewport,
}: {
  g: Grafcet;
  geom: GrafcetGeometry;
  viewport: Viewport;
}) {
  const editing = useUi((s) => s.editing);
  if (!editing || currentValue(g, editing) === null) return null;
  return (
    <EditorField
      key={`${editing.id}:${editing.field}`}
      g={g}
      geom={geom}
      viewport={viewport}
      target={editing}
    />
  );
}
