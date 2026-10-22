import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ACTION_PAD,
  FONT_SIZE,
  STEP_FONT_SIZE,
  TRANSITION_WIDTH,
  commentRect,
  layoutActions,
  stepLabelAnchor,
  transitionTextAnchor,
  type GrafcetGeometry,
} from '@/core/layout/geometry';
import { actionTextKind, type ExpressionKind } from '@/core/expr/check';
import type { Grafcet } from '@/core/model/types';
import { ExpressionInput, type ExpressionInputHandle } from '@/panels/ExpressionInput';
import { editActive } from '../commands/edit';
import { ui, useUi, type EditTarget, type Viewport } from '../store/uiStore';
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
  editActive('history.edit', (g) => {
    const s = g.steps[t.id];
    if (s) {
      if (t.field === 'number' && value !== '') s.number = Number(value);
      if (t.field === 'label') {
        if (value) s.label = value;
        else delete s.label;
      }
      return;
    }
    const tr = g.transitions[t.id];
    if (tr) {
      if (t.field === 'receptivity') tr.receptivity = value;
      if (t.field === 'number') {
        if (value === '') delete tr.number;
        else tr.number = Number(value);
      }
      return;
    }
    const a = g.actions[t.id];
    if (a) {
      if (t.field === 'text') a.text = value;
      if (t.field === 'condition') {
        if (value) a.condition = value;
        else delete a.condition;
      }
      return;
    }
    const c = g.comments[t.id];
    if (c && t.field === 'text') c.text = raw.replace(/\s+$/, '');
  });
  return null;
}

/** Where the edited text sits on screen: the editor overlays it exactly, same font and size. */
interface Placement {
  /** Screen x where the text starts (left), is centered (center) or ends (right). */
  x: number;
  /** Screen y of the text's vertical center (single line) or top (multi-line). */
  y: number;
  align: 'left' | 'center' | 'right';
  fontSize: number;
  minWidth: number;
  multiline?: { width: number; height: number };
}

const PAD = 6;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function placement(
  g: Grafcet,
  geom: GrafcetGeometry,
  t: EditTarget,
  v: Viewport,
): Placement | null {
  const z = v.zoom;
  const sx = (x: number) => (x - v.x) * z;
  const sy = (y: number) => (y - v.y) * z;
  const fontSize = clamp(FONT_SIZE * z, 11, 26);
  const s = g.steps[t.id];
  if (s) {
    if (t.field === 'number') {
      return {
        x: sx(s.position.x),
        y: sy(s.position.y),
        align: 'center',
        fontSize: clamp(STEP_FONT_SIZE * z, 12, 28),
        minWidth: 56,
      };
    }
    const a = stepLabelAnchor(s);
    return { x: sx(a.x), y: sy(a.y), align: 'right', fontSize, minWidth: 140 };
  }
  const tr = g.transitions[t.id];
  if (tr) {
    const a = transitionTextAnchor(tr);
    if (t.field === 'number') {
      return {
        x: sx(tr.position.x - TRANSITION_WIDTH / 2 - 6),
        y: sy(a.y),
        align: 'right',
        fontSize,
        minWidth: 56,
      };
    }
    return { x: sx(a.x), y: sy(a.y), align: 'left', fontSize, minWidth: 160 };
  }
  const act = g.actions[t.id];
  if (act) {
    const step = g.steps[act.stepId];
    const box =
      step &&
      layoutActions(step, geom.index.actions.get(step.id) ?? []).find((b) => b.id === act.id);
    if (!box) return null;
    if (t.field === 'condition')
      return { x: sx(box.x + 16), y: sy(box.y - 9), align: 'left', fontSize, minWidth: 140 };
    return {
      x: sx(box.x + ACTION_PAD),
      y: sy(box.y + box.height / 2),
      align: 'left',
      fontSize,
      minWidth: Math.max(110, box.width * z - 2 * ACTION_PAD * z),
    };
  }
  const c = g.comments[t.id];
  if (c) {
    const r = commentRect(c);
    return {
      x: sx(r.x),
      y: sy(r.y),
      align: 'left',
      fontSize,
      minWidth: 220,
      multiline: { width: Math.max(r.width * z, 240), height: Math.max(r.height * z, 72) },
    };
  }
  return null;
}

/** Screen box of the editor for the current text: grows with the text, never shrinks below minWidth. */
function boxFor(
  p: Placement,
  value: string,
): { left: number; top: number; width: number; height: number } {
  if (p.multiline) {
    const lines = value.split('\n');
    const longest = Math.max(...lines.map((l) => [...l].length));
    const width = Math.max(p.multiline.width, longest * p.fontSize * 0.6 + 2 * PAD + p.fontSize);
    const height = Math.max(p.multiline.height, lines.length * p.fontSize * 1.25 + 16);
    return { left: p.x - 4, top: p.y - 4, width, height };
  }
  const textW = [...value].length * p.fontSize * 0.6;
  const width = Math.max(p.minWidth, textW + 2 * PAD + p.fontSize * 1.2);
  const height = Math.round(p.fontSize * 1.8);
  const left =
    p.align === 'left' ? p.x - PAD : p.align === 'center' ? p.x - width / 2 : p.x - width + PAD;
  return { left, top: p.y - height / 2, width, height };
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
}: {
  left: number;
  top: number;
  multiline: boolean;
  error: string | null;
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

  const place = placement(g, geom, target, viewport);
  if (!place) return null;
  const box = boxFor(place, value);

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
    fontSize: place.fontSize,
    textAlign: place.align,
  };
  const hint = (
    <EditorHint
      left={box.left}
      top={box.top + box.height + 6}
      multiline={!!place.multiline}
      error={error}
    />
  );

  const exprKind = expressionKind(g, target);
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
          onCancel={() => finish(false)}
          onBlur={onBlur}
          label={label}
          floating
          dropUp={box.top > canvasSizeOf(g.id).height / 2}
          className="absolute z-10"
          style={style}
        />
        {box.top <= canvasSizeOf(g.id).height / 2 ? null : hint}
      </>
    );
  }

  const common = {
    ref: inputRef,
    value,
    style,
    'aria-label': label,
    'aria-invalid': !!error,
    className: 'gm-inline-editor',
    spellCheck: false,
    autoComplete: 'off',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValue(e.target.value);
      setError(null);
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'Escape') {
        e.preventDefault();
        finish(false);
      } else if (e.key === 'Enter' && (!place.multiline || e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        finish(true);
      }
    },
    onBlur,
  };

  return (
    <>
      {place.multiline ? <textarea {...common} /> : <input {...common} />}
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
