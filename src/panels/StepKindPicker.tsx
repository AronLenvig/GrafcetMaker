import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { StepKind } from '@/core/model/types';
import { PicturePicker } from './PicturePicker';

const KINDS: readonly StepKind[] = ['normal', 'initial', 'macro', 'enclosing'];

/** The step symbol with its links, as the diagram draws it. */
const BOX = (
  <>
    <rect x="13" y="6" width="14" height="14" />
    <path d="M20 1.5V6M20 20v8.5" />
  </>
);

const PICTURES: Record<StepKind, ReactNode> = {
  normal: BOX,
  initial: (
    <>
      {BOX}
      <rect x="15.6" y="8.6" width="8.8" height="8.8" strokeWidth="1.1" />
    </>
  ),
  macro: (
    <>
      {BOX}
      <path d="M13 9h14M13 17h14" strokeWidth="1.1" />
    </>
  ),
  enclosing: (
    <>
      {BOX}
      <path d="M16 6v14M24 6v14" strokeWidth="1.1" />
    </>
  ),
};

/** In an enclosed grafcet, "initial" steps are marked * (active when the enclosing step is). */
const ENCLOSED_INITIAL = (
  <>
    {BOX}
    <path d="M8 7.5v5M5.8 8.7l4.4 2.6M10.2 8.7l-4.4 2.6" strokeWidth="1.1" />
  </>
);

/** The kind of a step as picture buttons: step, initial step, macro-step, enclosing step. */
export function StepKindPicker({
  value,
  enclosed,
  onChange,
}: {
  value: StepKind;
  /** The step is in an enclosed grafcet: initial means "active with the enclosing step" (*). */
  enclosed: boolean;
  onChange: (kind: StepKind) => void;
}) {
  const { t } = useTranslation();
  return (
    <PicturePicker
      label={t('props.step.kind')}
      value={value}
      onChange={onChange}
      columns={4}
      options={KINDS.map((k) => {
        const star = enclosed && k === 'initial';
        return {
          value: k,
          label: star
            ? t('props.step.kindsShort.enclosedInitial')
            : t(`props.step.kindsShort.${k}`),
          help: star ? t('props.step.kinds.enclosedInitial') : t(`props.step.kinds.${k}`),
          picture: star ? ENCLOSED_INITIAL : PICTURES[k],
        };
      })}
    />
  );
}
