import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { ExpressionKind } from '@/core/expr/check';
import { cx, Field, Select } from '@/app/ui/primitives';
import { useUi } from '@/editor/store/uiStore';
import { ExpressionInput } from './ExpressionInput';

/** "↵ apply · Esc revert", shown while a field has unapplied changes. */
export function PendingHint({ multiline }: { multiline?: boolean }) {
  const { t } = useTranslation();
  return (
    <span className="flex items-center gap-1 text-xs text-muted">
      <kbd className="gm-kbd">{multiline ? 'Ctrl+↵' : '↵'}</kbd> {t('fields.apply')}
      <span aria-hidden="true">·</span>
      <kbd className="gm-kbd">Esc</kbd> {t('fields.revert')}
    </span>
  );
}

/**
 * Text input that commits on Enter or blur (one undo entry per edit) and reverts on Escape.
 * `validate` returns an error message to keep the field open with an inline error.
 */
export function CommitField({
  label,
  value,
  onCommit,
  validate,
  multiline,
  mono,
  placeholder,
  hint,
  inputMode,
}: {
  label: string;
  value: string;
  /** A returned string is an error message: the value is rejected (e.g. a name already taken). */
  onCommit: (v: string) => unknown;
  validate?: (v: string) => string | null;
  multiline?: boolean;
  mono?: boolean;
  placeholder?: string;
  hint?: ReactNode;
  inputMode?: 'numeric' | 'text';
}) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!focused) setDraft(value);
  }, [value, focused]);

  // Multi-line fields grow with their content.
  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(320, el.scrollHeight + 2)}px`;
  }, [draft]);

  const commit = () => {
    let err = validate?.(draft) ?? null;
    if (!err && draft !== value) {
      const r = onCommit(draft);
      if (typeof r === 'string') err = r;
    }
    setError(err);
    return !err;
  };

  const common = {
    id,
    value: draft,
    placeholder,
    spellCheck: false,
    autoComplete: 'off',
    'aria-invalid': !!error,
    'aria-describedby': error ? `${id}-error` : undefined,
    onFocus: () => setFocused(true),
    onBlur: () => {
      setFocused(false);
      if (!commit()) {
        setDraft(value);
        setError(null);
      }
    },
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setDraft(e.target.value);
      if (error) setError(null);
    },
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setDraft(value);
        setError(null);
        (e.target as HTMLElement).blur();
      } else if (e.key === 'Enter' && (!multiline || e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        commit();
      }
    },
  };

  const dirty = focused && draft !== value;
  return (
    <Field
      label={label}
      htmlFor={id}
      error={error}
      hint={dirty ? <PendingHint multiline={multiline} /> : hint}
    >
      {multiline ? (
        <textarea
          ref={area}
          {...common}
          rows={3}
          className={cx('gm-input', mono && 'gm-input-mono')}
        />
      ) : (
        <input
          {...common}
          inputMode={inputMode}
          className={cx('gm-input', mono && 'gm-input-mono')}
        />
      )}
    </Field>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  hint?: ReactNode;
}) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </Field>
  );
}

export function Section({
  title,
  children,
  actions,
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3.5 border-b border-border px-4 py-4">
      <div className="flex min-h-6 items-center gap-2">
        <h2 className="flex-1 text-[11px] font-semibold tracking-wider text-muted uppercase">
          {title}
        </h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

/** Labelled expression input (receptivity, action text, condition) with live diagnostics. */
export function ExpressionField({
  label,
  kind,
  value,
  onCommit,
  placeholder,
  hint,
}: {
  label: string;
  kind: ExpressionKind;
  value: string;
  onCommit: (v: string) => void;
  placeholder?: string;
  hint?: ReactNode;
}) {
  const gid = useUi((s) => s.activeGrafcetId);
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setDraft(value);
  }, [value, focused]);
  const commit = () => {
    if (draft !== value) onCommit(draft);
  };
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted">{label}</span>
      <ExpressionInput
        kind={kind}
        grafcetId={gid}
        value={draft}
        label={label}
        placeholder={placeholder}
        onChange={setDraft}
        onCommit={commit}
        onCancel={() => setDraft(value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          commit();
        }}
      />
      {focused && draft !== value ? (
        <PendingHint />
      ) : (
        hint && <div className="text-xs text-muted">{hint}</div>
      )}
    </div>
  );
}
