import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cx, Field, inputClass } from '@/app/ui/primitives';

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
  onCommit: (v: string) => void;
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
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setDraft(value);
  }, [value]);

  const commit = () => {
    const err = validate?.(draft) ?? null;
    setError(err);
    if (err) return;
    if (draft !== value) onCommit(draft);
  };

  const common = {
    id,
    value: draft,
    placeholder,
    spellCheck: false,
    autoComplete: 'off',
    'aria-invalid': !!error,
    'aria-describedby': error ? `${id}-err` : undefined,
    onFocus: () => (focused.current = true),
    onBlur: () => {
      focused.current = false;
      commit();
      if (validate?.(draft)) {
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
        setDraft(value);
        setError(null);
        (e.target as HTMLElement).blur();
      } else if (e.key === 'Enter' && (!multiline || e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        commit();
      }
    },
  };

  return (
    <Field
      label={label}
      htmlFor={id}
      hint={
        error ? (
          <span id={`${id}-err`} role="alert" className="text-xs text-danger">
            {error}
          </span>
        ) : (
          hint
        )
      }
    >
      {multiline ? (
        <textarea
          {...common}
          rows={4}
          className={cx(inputClass, 'h-auto py-1', mono && 'font-mono')}
        />
      ) : (
        <input {...common} inputMode={inputMode} className={cx(inputClass, mono && 'font-mono')} />
      )}
    </Field>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id}>
      <select
        id={id}
        className={cx(inputClass, 'px-1')}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function CheckField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[var(--accent)]"
      />
      <label htmlFor={id}>{label}</label>
    </div>
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
    <section className="flex flex-col gap-3 border-b border-border px-3 py-3">
      <div className="flex items-center">
        <h2 className="flex-1 text-xs font-semibold tracking-wide text-muted uppercase">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}
