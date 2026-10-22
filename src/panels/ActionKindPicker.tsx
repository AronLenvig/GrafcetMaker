import { useId, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cx } from '@/app/ui/primitives';
import { ACTION_UI_KINDS, type ActionUiKind } from '@/core/model/actionKind';
import { tDynamic } from '@/i18n/dynamic';

/** Pictograms of each kind, as the diagram draws them (box, condition line, arrows, flag, frame). */
const PICTURES: Record<ActionUiKind, ReactNode> = {
  continuous: <rect x="6" y="10" width="28" height="14" />,
  conditional: (
    <>
      <rect x="6" y="10" width="28" height="14" />
      <path d="M12 10V3" />
    </>
  ),
  storedOnActivation: (
    <>
      <rect x="6" y="10" width="28" height="14" />
      <path d="M12 10V3" />
      <path d="M12 1.5l-2.6 3.6h5.2z" fill="currentColor" stroke="none" />
    </>
  ),
  storedOnDeactivation: (
    <>
      <rect x="6" y="6" width="28" height="14" />
      <path d="M12 20v7" />
      <path d="M12 28.5l-2.6-3.6h5.2z" fill="currentColor" stroke="none" />
    </>
  ),
  storedOnEvent: (
    <>
      <rect x="6" y="10" width="28" height="14" />
      <path d="M28 10V2" />
      <path d="M28 2l5 2-5 2z" fill="currentColor" stroke="none" />
    </>
  ),
  forcing: (
    <>
      <rect x="6" y="9" width="28" height="16" />
      <rect x="8.5" y="11.5" width="23" height="11" />
    </>
  ),
};

/**
 * The kind of an action as a group of picture buttons (WAI-ARIA radio group: arrow keys move
 * the choice). Each picture is the symbol the diagram uses for that kind.
 */
export function ActionKindPicker({
  value,
  onChange,
}: {
  value: ActionUiKind;
  onChange: (kind: ActionUiKind) => void;
}) {
  const { t } = useTranslation();
  const labelId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const move = (from: number, delta: number) => {
    const next = (from + delta + ACTION_UI_KINDS.length) % ACTION_UI_KINDS.length;
    onChange(ACTION_UI_KINDS[next]!);
    refs.current[next]?.focus();
  };
  return (
    <div className="flex flex-col gap-1.5">
      <span id={labelId} className="text-xs font-medium text-muted">
        {t('props.action.kind')}
      </span>
      <div role="radiogroup" aria-labelledby={labelId} className="grid grid-cols-3 gap-1">
        {ACTION_UI_KINDS.map((k, i) => {
          const selected = value === k;
          return (
            <button
              key={k}
              ref={(el) => void (refs.current[i] = el)}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              title={tDynamic(t, `props.action.kinds.${k}.help`)}
              onClick={() => onChange(k)}
              onKeyDown={(e) => {
                const delta =
                  e.key === 'ArrowRight' || e.key === 'ArrowDown'
                    ? 1
                    : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
                      ? -1
                      : 0;
                if (!delta) return;
                e.preventDefault();
                move(i, delta);
              }}
              className={cx(
                'flex flex-col items-center gap-0.5 rounded-md border px-1 pt-1.5 pb-1 text-[11px] leading-tight',
                selected
                  ? 'border-accent bg-accent-soft text-text'
                  : 'border-border text-muted hover:border-border-strong hover:text-text',
              )}
            >
              <svg
                width="40"
                height="30"
                viewBox="0 0 40 30"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                aria-hidden="true"
              >
                {PICTURES[k]}
              </svg>
              <span className="text-center">{tDynamic(t, `props.action.kinds.${k}.label`)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
