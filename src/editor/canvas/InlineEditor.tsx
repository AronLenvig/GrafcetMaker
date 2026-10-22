import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FONT_SIZE,
  commentRect,
  layoutActions,
  stepLabelAnchor,
  textWidth,
  transitionTextAnchor,
  type GrafcetGeometry,
} from '@/core/layout/geometry';
import type { Grafcet } from '@/core/model/types';
import { editActive } from '../commands/edit';
import { ui, useUi, type EditTarget, type Viewport } from '../store/uiStore';

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

interface Placement {
  left: number;
  top: number;
  width: number;
  height: number;
  multiline: boolean;
  align: 'left' | 'center' | 'right';
}

function placement(
  g: Grafcet,
  geom: GrafcetGeometry,
  t: EditTarget,
  v: Viewport,
  value: string,
): Placement | null {
  const z = v.zoom;
  const sx = (x: number) => (x - v.x) * z;
  const sy = (y: number) => (y - v.y) * z;
  const line = Math.max(24, 22 * z);
  const textW = (s: string) => Math.max(160, (textWidth(s) + 40) * Math.max(z, 1));
  const s = g.steps[t.id];
  if (s) {
    if (t.field === 'number')
      return {
        left: sx(s.position.x) - 32,
        top: sy(s.position.y) - line / 2,
        width: 64,
        height: line,
        multiline: false,
        align: 'center',
      };
    const a = stepLabelAnchor(s);
    return {
      left: sx(a.x) - 200,
      top: sy(a.y) - line / 2,
      width: 200,
      height: line,
      multiline: false,
      align: 'right',
    };
  }
  const tr = g.transitions[t.id];
  if (tr) {
    const a = transitionTextAnchor(tr);
    if (t.field === 'number')
      return {
        left: sx(tr.position.x) - 90,
        top: sy(a.y) - line / 2,
        width: 64,
        height: line,
        multiline: false,
        align: 'right',
      };
    return {
      left: sx(a.x) - 4,
      top: sy(a.y) - line / 2,
      width: textW(value),
      height: line,
      multiline: false,
      align: 'left',
    };
  }
  const act = g.actions[t.id];
  if (act) {
    const step = g.steps[act.stepId];
    const box =
      step &&
      layoutActions(step, geom.index.actions.get(step.id) ?? []).find((b) => b.id === act.id);
    if (!box) return null;
    if (t.field === 'condition')
      return {
        left: sx(box.x + 12),
        top: sy(box.y) - line - 4,
        width: textW(value),
        height: line,
        multiline: false,
        align: 'left',
      };
    return {
      left: sx(box.x),
      top: sy(box.y + box.height / 2) - line / 2,
      width: Math.max(box.width * z, textW(value)),
      height: line,
      multiline: false,
      align: 'left',
    };
  }
  const c = g.comments[t.id];
  if (c) {
    const r = commentRect(c);
    return {
      left: sx(r.x),
      top: sy(r.y),
      width: Math.max(r.width * z + 40, 240),
      height: Math.max(r.height * z + 24, 80),
      multiline: true,
      align: 'left',
    };
  }
  return null;
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
  const done = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const place = placement(g, geom, target, viewport, value);
  if (!place) return null;

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

  const onKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Escape') {
      e.preventDefault();
      finish(false);
    } else if (e.key === 'Enter' && (!place.multiline || e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      finish(true);
    }
  };

  const style: CSSProperties = {
    left: place.left,
    top: place.top,
    width: place.width,
    height: place.height,
    fontSize: Math.max(12, FONT_SIZE * viewport.zoom),
    textAlign: place.align,
  };
  const common = {
    ref: inputRef,
    value,
    style,
    'aria-label': t(`editor.fields.${target.field}`),
    'aria-invalid': !!error,
    className:
      'absolute z-10 rounded border border-accent bg-surface px-1 font-mono text-text shadow-pop outline-none focus:ring-2 focus:ring-focus',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValue(e.target.value);
      setError(null);
    },
    onKeyDown,
    // Clicking elsewhere keeps valid edits and drops invalid ones; focus stays where the user clicked.
    onBlur: () => {
      if (done.current) return;
      done.current = true;
      applyEdit(target, value);
      ui.edit(null);
    },
    spellCheck: false,
    autoComplete: 'off',
  };

  return (
    <>
      {place.multiline ? <textarea {...common} /> : <input {...common} />}
      {error && (
        <div
          role="alert"
          className="absolute z-10 rounded bg-danger-soft px-2 py-1 text-danger"
          style={{ left: place.left, top: place.top + place.height + 4 }}
        >
          {error}
        </div>
      )}
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
