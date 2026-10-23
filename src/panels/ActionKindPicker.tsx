import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ACTION_UI_KINDS, type ActionUiKind } from '@/core/model/actionKind';
import { tDynamic } from '@/i18n/dynamic';
import { PicturePicker } from './PicturePicker';

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

/** The symbol of an action kind, small (compact action rows). */
export function ActionKindIcon({ kind }: { kind: ActionUiKind }) {
  return (
    <svg
      width="24"
      height="18"
      viewBox="0 0 40 30"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
      className="shrink-0"
    >
      {PICTURES[kind]}
    </svg>
  );
}

/** The kind of an action as picture buttons showing the symbol the diagram uses. */
export function ActionKindPicker({
  value,
  onChange,
}: {
  value: ActionUiKind;
  onChange: (kind: ActionUiKind) => void;
}) {
  const { t } = useTranslation();
  return (
    <PicturePicker
      label={t('props.action.kind')}
      value={value}
      onChange={onChange}
      options={ACTION_UI_KINDS.map((k) => ({
        value: k,
        label: tDynamic(t, `props.action.kinds.${k}.label`),
        help: tDynamic(t, `props.action.kinds.${k}.help`),
        picture: PICTURES[k],
      }))}
    />
  );
}
