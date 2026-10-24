import {
  forwardRef,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  analyze,
  buildEnv,
  type Diagnostic,
  type ExprEnv,
  type ExpressionKind,
} from '@/core/expr/check';
import { toggleEdge, type Edge } from '@/core/expr/edges';
import { variableUsage } from '@/core/model/variables';
import type { Id, Variable } from '@/core/model/types';
import { openHelp } from '@/app/help/helpStore';
import { InfoIcon } from '@/app/ui/icons';
import { cx } from '@/app/ui/primitives';
import { tDynamic } from '@/i18n/dynamic';
import { useDoc } from '@/editor/store/document';

export function useExprEnv(grafcetId: Id | null): ExprEnv {
  const variables = useDoc((s) => s.project.variables);
  const grafcets = useDoc((s) => s.project.grafcets);
  // Rebuilt only when names or steps can have changed.
  return useMemo(
    () => buildEnv({ variables, grafcets }, grafcetId),
    [variables, grafcets, grafcetId],
  );
}

interface Suggestion {
  text: string;
  detail: string;
}

const IDENT_CHAR = /[A-Za-z0-9_]/;

function identifierAt(
  value: string,
  caret: number,
): { start: number; end: number; prefix: string } | null {
  let start = caret;
  while (start > 0 && IDENT_CHAR.test(value[start - 1]!)) start--;
  let end = caret;
  while (end < value.length && IDENT_CHAR.test(value[end]!)) end++;
  const prefix = value.slice(start, caret);
  if (!prefix || /^\d/.test(prefix)) return null;
  // Not the unit of a duration (3s) or number.
  if (start > 0 && /[0-9.]/.test(value[start - 1]!)) return null;
  return { start, end, prefix };
}

/** Symbols offered under condition inputs; `insert` is typed at the caret (`|` = caret). */
const SYMBOLS: { id: string; shown: string; insert?: string; edge?: Edge }[] = [
  { id: 'rising', shown: '↑', edge: '↑' },
  { id: 'falling', shown: '↓', edge: '↓' },
  { id: 'not', shown: '¬', insert: '/' },
  { id: 'and', shown: '·', insert: ' * ' },
  { id: 'or', shown: '+', insert: ' + ' },
  { id: 'paren', shown: '( )', insert: '(|)' },
  { id: 'timer', shown: 't/X', insert: '1s/|' },
];

function rank(v: Variable, kind: ExpressionKind): number {
  if (kind === 'condition') return v.type === 'BOOL' ? 0 : 1;
  if (kind === 'output') return v.type === 'BOOL' && v.direction !== 'input' ? 0 : 2;
  if (kind === 'assignment') return v.direction !== 'input' ? 0 : 2;
  return 1;
}

/**
 * What an empty field suggests (grey, Tab accepts): the first variable in the table, of the kind
 * the field expects, that no expression uses yet (an input for a condition, an output or internal
 * BOOL for an action).
 */
function unusedVariable(
  kind: ExpressionKind,
  variables: Record<Id, Variable>,
  grafcets: Parameters<typeof variableUsage>[0]['grafcets'],
): string {
  if (kind === 'forcing') return '';
  const wanted = (v: Variable) =>
    v.type === 'BOOL' && (kind === 'condition' ? v.direction === 'input' : v.direction !== 'input');
  const candidates = Object.values(variables).filter(wanted);
  if (!candidates.length) return '';
  const usage = variableUsage({ variables, grafcets });
  return candidates.find((v) => !usage.get(v.name.toLowerCase()))?.name ?? '';
}

/** Where the grey completion starts, in the input's own coordinates. */
interface GhostBox {
  left: number;
  top: number;
  height: number;
  maxWidth: number;
  font: string;
}

let measureCanvas: HTMLCanvasElement | null = null;

function textWidthIn(font: string, text: string): number {
  measureCanvas ??= document.createElement('canvas');
  const ctx = measureCanvas.getContext('2d');
  if (!ctx) return text.length * 8;
  ctx.font = font;
  return ctx.measureText(text).width;
}

export interface ExpressionInputHandle {
  focus: () => void;
  select: () => void;
}

/**
 * Text input for expressions with live diagnostics (caret position, hint, quick fixes) and
 * identifier autocomplete. Never blocks committing: invalid text is kept and reported.
 */
export const ExpressionInput = forwardRef<
  ExpressionInputHandle,
  {
    kind: ExpressionKind;
    grafcetId: Id | null;
    value: string;
    onChange: (v: string) => void;
    onCommit: () => void;
    /** Shift+Enter: commit this value (suggestion accepted) and continue with the next element. */
    onCommitNext?: (value: string) => void;
    onCancel: () => void;
    onBlur?: () => void;
    onFocus?: () => void;
    label: string;
    style?: CSSProperties;
    className?: string;
    floating?: boolean;
    /** Open suggestions and diagnostics above the input (when it sits low in its container). */
    dropUp?: boolean;
    placeholder?: string;
  }
>(function ExpressionInput(
  {
    kind,
    grafcetId,
    value,
    onChange,
    onCommit,
    onCommitNext,
    onCancel,
    onBlur,
    onFocus,
    label,
    style,
    className,
    floating,
    dropUp,
    placeholder,
  },
  ref,
) {
  const { t } = useTranslation();
  const env = useExprEnv(grafcetId);
  const steps = useDoc((s) => (grafcetId ? s.project.grafcets[grafcetId]?.steps : undefined));
  const inputRef = useRef<HTMLInputElement>(null);
  const [caret, setCaret] = useState(value.length);
  const [active, setActive] = useState(0);
  const [popupClosed, setPopupClosed] = useState(false);
  const [focused, setFocused] = useState(false);
  // Caret to restore after a programmatic edit; applied before the browser handles the next key.
  const pendingCaret = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (pendingCaret.current === null) return;
    inputRef.current?.setSelectionRange(pendingCaret.current, pendingCaret.current);
    pendingCaret.current = null;
  }, [value]);
  const listId = useId();
  const errId = useId();

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus({ preventScroll: true }),
    select: () => inputRef.current?.select(),
  }));

  const diagnostics: Diagnostic[] = useMemo(
    () => (value.trim() ? analyze(kind, value, env).diagnostics : []),
    [kind, value, env],
  );

  const ident = kind === 'forcing' ? null : identifierAt(value, caret);
  const suggestions: Suggestion[] = useMemo(() => {
    if (!ident) return [];
    const p = ident.prefix.toLowerCase();
    const vars = [...env.variables.values()]
      .filter((v) => v.name.toLowerCase().startsWith(p) && v.name.toLowerCase() !== p)
      .sort((a, b) => rank(a, kind) - rank(b, kind) || a.name.localeCompare(b.name))
      .map((v) => ({
        text: v.name,
        detail: `${v.type} · ${t(`variables.directions.${v.direction}`)}`,
      }));
    const stepRefs =
      kind === 'condition' && /^x\d*$/i.test(ident.prefix) && steps
        ? Object.values(steps)
            .map((s) => `X${s.number}`)
            .filter((x) => x.toLowerCase().startsWith(p) && x.toLowerCase() !== p)
            .sort((a, b) => a.length - b.length || a.localeCompare(b))
            .map((x) => ({ text: x, detail: t('expr.stepActivity') }))
        : [];
    return [...vars, ...stepRefs].slice(0, 8);
  }, [ident, env, steps, kind, t]);
  // Suggestions only while typing in the field.
  const open = focused && !popupClosed && suggestions.length > 0;

  const replaceRange = (start: number, end: number, text: string, caretAt = text.length) => {
    const next = value.slice(0, start) + text + value.slice(end);
    onChange(next);
    const pos = start + caretAt;
    setCaret(pos);
    pendingCaret.current = pos;
  };

  const applyEdge = (edge: Edge) => {
    const el = inputRef.current;
    const r = toggleEdge(value, el?.selectionStart ?? caret, edge);
    onChange(r.text);
    setCaret(r.caret);
    pendingCaret.current = r.caret;
  };

  /** Inserts a symbol at the caret; a selection is wrapped by parentheses. */
  const insertSymbol = (insert: string) => {
    const el = inputRef.current;
    const from = el?.selectionStart ?? caret;
    const to = el?.selectionEnd ?? from;
    const [before, after = ''] = insert.split('|');
    if (insert === '(|)' && to > from) replaceRange(from, to, `(${value.slice(from, to)})`);
    else replaceRange(from, to, before! + after, before!.length);
  };

  const symbols = kind === 'condition' && focused;

  const accept = (s: Suggestion | undefined) => {
    if (!s || !ident) return;
    replaceRange(ident.start, ident.end, s.text);
    setPopupClosed(true);
  };
  /** The value with a suggestion accepted. */
  const withSuggestion = (s: Suggestion | undefined) =>
    s && ident ? value.slice(0, ident.start) + s.text + value.slice(ident.end) : value;

  // Grey completion after the caret: the rest of the highlighted suggestion, or, in an empty
  // field, an unused variable of the expected kind. Tab or → accepts it.
  const variables = useDoc((s) => s.project.variables);
  const grafcets = useDoc((s) => s.project.grafcets);
  const empty = !value.trim();
  const emptyGhost = useMemo(
    () => (focused && empty ? unusedVariable(kind, variables, grafcets) : ''),
    [focused, empty, kind, variables, grafcets],
  );
  const atEnd = caret === value.length;
  const highlighted = open ? suggestions[active] : undefined;
  const ghost =
    !focused || !atEnd
      ? ''
      : highlighted &&
          ident &&
          highlighted.text.toLowerCase().startsWith(ident.prefix.toLowerCase())
        ? highlighted.text.slice(ident.prefix.length)
        : empty && !value
          ? emptyGhost
          : '';
  const [ghostBox, setGhostBox] = useState<GhostBox | null>(null);
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!ghost || !el) {
      setGhostBox(null);
      return;
    }
    const cs = getComputedStyle(el);
    if (cs.textAlign !== 'left' && cs.textAlign !== 'start') {
      setGhostBox(null);
      return;
    }
    const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const padL = parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth);
    const padR = parseFloat(cs.paddingRight) + parseFloat(cs.borderRightWidth);
    const left = el.offsetLeft + padL + textWidthIn(font, value) - el.scrollLeft;
    const right = el.offsetLeft + el.offsetWidth - padR;
    setGhostBox(
      left >= right - 4
        ? null
        : { left, top: el.offsetTop, height: el.offsetHeight, maxWidth: right - left, font },
    );
  }, [ghost, value]);
  const acceptGhost = () => {
    if (highlighted) accept(highlighted);
    else replaceRange(0, value.length, emptyGhost);
  };

  // Names that are not variables yet are declared when the text is applied: a note, not an error.
  const isNew = (d: Diagnostic) => d.code === 'unknownIdentifier' && !!d.create;
  const first = diagnostics.find((d) => !isNew(d));
  const newNames = [
    ...new Map(diagnostics.filter(isNew).map((d) => [d.create!.name.toLowerCase(), d])).values(),
  ];

  return (
    <div className={cx(!floating && 'relative', className)} style={style}>
      <input
        ref={inputRef}
        value={value}
        placeholder={placeholder}
        aria-label={label}
        aria-invalid={!!first}
        aria-describedby={first || newNames.length ? errId : undefined}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        spellCheck={false}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        enterKeyHint="done"
        className={floating ? 'gm-inline-editor static h-full w-full' : 'gm-input gm-input-mono'}
        onChange={(e) => {
          // ^ is not part of the grammar: typed (also as a dead key) it becomes a rising edge.
          const raw = e.target.value;
          const pos = e.target.selectionStart ?? raw.length;
          const next = kind === 'condition' ? raw.replaceAll('^', '↑') : raw;
          // Same length, but a changed value would move the caret to the end: keep it in place.
          if (next !== raw) pendingCaret.current = pos;
          onChange(next);
          setCaret(pos);
          setPopupClosed(false);
          setActive(0);
        }}
        onSelect={(e) => setCaret(e.currentTarget.selectionStart ?? 0)}
        onBlur={() => {
          setFocused(false);
          onBlur?.();
        }}
        onFocus={() => {
          setFocused(true);
          onFocus?.();
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter' && e.shiftKey && onCommitNext) {
            e.preventDefault();
            onCommitNext(withSuggestion(highlighted));
            return;
          }
          const caretAtEnd =
            e.currentTarget.selectionStart === value.length &&
            e.currentTarget.selectionEnd === value.length;
          if (
            ghost &&
            caretAtEnd &&
            ((e.key === 'Tab' && !e.shiftKey) || (e.key === 'ArrowRight' && !e.shiftKey))
          ) {
            e.preventDefault();
            acceptGhost();
            return;
          }
          if (kind === 'condition' && e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
            e.preventDefault();
            applyEdge(e.key === 'ArrowUp' ? '↑' : '↓');
          } else if (open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault();
            setActive(
              (a) =>
                (a + (e.key === 'ArrowDown' ? 1 : suggestions.length - 1)) % suggestions.length,
            );
          } else if (open && (e.key === 'Tab' || e.key === 'Enter')) {
            e.preventDefault();
            accept(suggestions[active]);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            if (open) setPopupClosed(true);
            else onCancel();
          } else if (e.key === 'Enter') {
            e.preventDefault();
            onCommit();
          }
        }}
      />
      {ghostBox && (
        <span
          aria-hidden
          data-ghost-text
          className="gm-ghost-text pointer-events-none absolute flex items-center overflow-hidden whitespace-pre"
          style={{
            left: ghostBox.left,
            top: ghostBox.top,
            height: ghostBox.height,
            maxWidth: ghostBox.maxWidth,
            font: ghostBox.font,
          }}
        >
          {ghost}
        </span>
      )}
      {symbols && (
        <div
          role="toolbar"
          aria-label={t('expr.symbols.label')}
          onMouseDown={(e) => e.preventDefault()}
          className={cx(
            'z-20 flex items-center gap-0.5 rounded-md border border-border bg-surface p-0.5 shadow-pop',
            floating
              ? cx(
                  'absolute left-0 w-max max-w-full flex-wrap',
                  dropUp ? 'top-full mt-1' : 'bottom-full mb-1',
                )
              : 'absolute right-1 bottom-full mb-1',
          )}
        >
          {SYMBOLS.map((sym) => {
            const name = tDynamic(t, `expr.symbols.${sym.id}`);
            return (
              <button
                key={sym.id}
                type="button"
                tabIndex={-1}
                title={name}
                aria-label={name}
                onClick={() => (sym.edge ? applyEdge(sym.edge) : insertSymbol(sym.insert!))}
                className="h-6 min-w-6 rounded px-1.5 font-mono text-[13px] text-text hover:bg-accent-soft pointer-coarse:h-9 pointer-coarse:min-w-9"
              >
                {sym.shown}
              </button>
            );
          })}
          <button
            type="button"
            tabIndex={-1}
            title={t('help.learnMore')}
            aria-label={t('help.learnMore')}
            onClick={() => openHelp('expressions', 'operators')}
            className="h-6 min-w-6 rounded px-1.5 text-[13px] font-medium text-accent hover:bg-accent-soft"
          >
            ?
          </button>
        </div>
      )}
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={t('expr.suggestions')}
          onMouseDown={(e) => e.preventDefault()}
          className={cx(
            'absolute left-0 z-30 max-h-60 min-w-48 overflow-auto rounded-md border border-border bg-surface p-1 text-sm shadow-pop',
            dropUp ? 'bottom-full mb-1' : 'top-full mt-1',
          )}
        >
          {suggestions.map((s, i) => (
            <li
              key={s.text}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseMove={() => setActive(i)}
              onClick={() => accept(s)}
              className={cx(
                'flex cursor-default items-center gap-3 rounded px-2 py-1',
                i === active && 'bg-accent-soft',
              )}
            >
              <span className="font-mono">{s.text}</span>
              <span className="ml-auto text-xs text-muted">{s.detail}</span>
            </li>
          ))}
        </ul>
      )}
      {first && !open && (
        <DiagnosticBox
          id={errId}
          d={first}
          more={diagnostics.length - newNames.length - 1}
          source={value}
          floating={!!floating}
          dropUp={!!dropUp}
          onReplace={replaceRange}
        />
      )}
      {!first && newNames.length > 0 && !open && (
        <NewNamesNote
          id={errId}
          list={newNames}
          floating={!!floating}
          dropUp={!!dropUp}
          onReplace={replaceRange}
        />
      )}
    </div>
  );
});

/** Names the text uses that are not variables yet, with the type and direction they will get. */
function NewNamesNote({
  id,
  list,
  floating,
  dropUp,
  onReplace,
}: {
  id: string;
  list: Diagnostic[];
  floating: boolean;
  dropUp: boolean;
  onReplace: (start: number, end: number, text: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      id={id}
      role="status"
      onMouseDown={(e) => e.preventDefault()}
      className={cx(
        'z-20 mt-1 flex flex-col gap-1 rounded-md border border-border bg-surface p-2 text-xs text-text',
        floating ? 'absolute left-0 w-max max-w-[440px] shadow-pop' : '',
        floating && (dropUp ? 'bottom-full mb-1' : 'top-full'),
      )}
    >
      {list.map((d) => (
        <p key={d.create!.name} className="flex flex-wrap items-center gap-1.5">
          <InfoIcon size={12} className="shrink-0 text-muted" />
          {t('expr.newVariable', {
            name: d.create!.name,
            type: d.create!.type,
            direction: t(`variables.directions.${d.create!.direction}`),
          })}
          {/* Close to an existing name: perhaps a typo. */}
          {d.params.suggestion && (
            <button
              type="button"
              className="rounded border border-border px-2 py-0.5 hover:bg-surface-2"
              onClick={() => onReplace(d.start, d.end, d.params.suggestion!)}
            >
              {t('expr.fixes.use', { name: d.params.suggestion })}
            </button>
          )}
        </p>
      ))}
    </div>
  );
}

function DiagnosticBox({
  id,
  d,
  more,
  source,
  floating,
  dropUp,
  onReplace,
}: {
  id: string;
  d: Diagnostic;
  more: number;
  source: string;
  floating: boolean;
  dropUp: boolean;
  onReplace: (start: number, end: number, text: string) => void;
}) {
  const { t } = useTranslation();
  // The variable an unknown name would become, for the hint that says so.
  const params: Record<string, string> = {
    ...d.params,
    ...(d.create && {
      type: d.create.type,
      direction: t(`variables.directions.${d.create.direction}`),
    }),
  };
  const end = Math.max(d.end, d.start + 1);
  return (
    <div
      id={id}
      role="alert"
      onMouseDown={(e) => e.preventDefault()}
      className={cx(
        'z-20 mt-1 flex flex-col gap-1 rounded-md border border-danger bg-surface p-2 text-xs text-text',
        floating ? 'absolute left-0 w-max max-w-[440px] shadow-pop' : '',
        floating && (dropUp ? 'bottom-full mb-1' : 'top-full'),
      )}
    >
      <p className="font-medium text-danger">{tDynamic(t, `expr.errors.${d.code}`, params)}</p>
      {source && (
        <pre className="overflow-x-auto font-mono whitespace-pre">
          {source.slice(0, d.start)}
          <mark className="rounded-sm bg-danger-soft text-danger underline decoration-wavy">
            {source.slice(d.start, end) || ' '}
          </mark>
          {source.slice(end)}
        </pre>
      )}
      {d.hint && <p className="text-muted">{tDynamic(t, `expr.hints.${d.hint}`, params)}</p>}
      <div className="flex flex-wrap gap-1">
        {d.code === 'empty' && d.hint === 'useOne' && (
          <button
            type="button"
            className="rounded border border-border px-2 py-0.5 hover:bg-surface-2"
            onClick={() => onReplace(0, source.length, '1')}
          >
            {t('expr.fixes.useOne')}
          </button>
        )}
      </div>
      {more > 0 && <p className="text-muted">{t('expr.more', { count: more })}</p>}
    </div>
  );
}
