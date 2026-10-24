import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { PicturePicker } from './PicturePicker';

type Flow = 'down' | 'left';

const FLOWS: readonly Flow[] = ['down', 'left'];

/** The bar with its links, as the diagram draws it; right to left carries its arrow. */
const PICTURES: Record<Flow, ReactNode> = {
  down: (
    <>
      <path d="M20 2v26" />
      <path d="M11 15h18" strokeWidth="3" />
    </>
  ),
  left: (
    <>
      <path d="M3 15h34" />
      <path d="M20 6v18" strokeWidth="3" />
      <path d="M8 15l5-3.5v7z" fill="currentColor" stroke="none" />
    </>
  ),
};

/** Direction of the flow through a transition as picture buttons: top to bottom, right to left. */
export function TransitionFlowPicker({
  value,
  onChange,
}: {
  value: Flow;
  onChange: (flow: Flow) => void;
}) {
  const { t } = useTranslation();
  return (
    <PicturePicker
      label={t('props.transition.flow')}
      value={value}
      onChange={onChange}
      options={FLOWS.map((f) => ({
        value: f,
        label: t(`props.transition.flows.${f}`),
        help: t(`props.transition.flowHelp.${f}`),
        picture: PICTURES[f],
      }))}
    />
  );
}
