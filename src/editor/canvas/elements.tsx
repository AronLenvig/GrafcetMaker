import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ACTION_GAP,
  ACTION_PAD,
  DOUBLE_BAR_GAP,
  FONT_SIZE,
  INITIAL_INSET,
  LABEL_FONT_SIZE,
  LINE_HEIGHT,
  STEP_FONT_SIZE,
  STEP_HALF,
  TRANSITION_THICKNESS,
  TRANSITION_WIDTH,
  actionDecor,
  commentRect,
  stepLabelAnchor,
  transitionHitRect,
  transitionTextAnchor,
} from '@/core/layout/geometry';
import type { Action, Comment, Step, Transition } from '@/core/model/types';
import { ExprText } from './ExprText';
import { baseline } from './svg';

/**
 * `mark`: E / S for the entry and exit steps of a macro-step expansion; * for the steps an
 * enclosing step activates (drawn instead of the initial double square, as IEC 60848 does).
 */
export type StepMark = 'E' | 'S' | '*';

export const StepView = memo(function StepView({
  step,
  active,
  mark,
}: {
  step: Step;
  /** Simulation: filled box plus a token dot, so activity never relies on color alone. */
  active?: boolean;
  mark?: StepMark;
}) {
  const { x, y } = step.position;
  const r = STEP_HALF;
  const label = step.label ? stepLabelAnchor(step) : null;
  return (
    <g data-el="step" data-id={step.id} aria-current={active ? 'step' : undefined}>
      <rect
        className={active ? 'gm-box gm-box-active' : 'gm-box'}
        x={x - r}
        y={y - r}
        width={2 * r}
        height={2 * r}
      />
      {active && <circle className="gm-token" cx={x} cy={y + r - 8} r={3.5} />}
      {step.kind === 'initial' && mark !== '*' && (
        <rect
          className="gm-thin"
          x={x - r + INITIAL_INSET}
          y={y - r + INITIAL_INSET}
          width={2 * (r - INITIAL_INSET)}
          height={2 * (r - INITIAL_INSET)}
        />
      )}
      {mark === '*' && (
        <text className="gm-step-number" x={x - r - 4} y={y - r + 10} textAnchor="end">
          *
        </text>
      )}
      {(mark === 'E' || mark === 'S') && (
        <text className="gm-label" x={x - r + 3} y={y - r + 10}>
          {mark}
        </text>
      )}
      {step.kind === 'macro' && (
        <path
          className="gm-thin"
          d={`M${x - r} ${y - r + 6}H${x + r}M${x - r} ${y + r - 6}H${x + r}`}
        />
      )}
      {step.kind === 'enclosing' && (
        <path
          className="gm-thin"
          d={`M${x - r + 6} ${y - r}V${y + r}M${x + r - 6} ${y - r}V${y + r}`}
        />
      )}
      <text className="gm-step-number" x={x} y={baseline(y, STEP_FONT_SIZE)} textAnchor="middle">
        {step.number}
      </text>
      {label && (
        <text
          className="gm-label gm-muted"
          x={label.x}
          y={baseline(label.y, LABEL_FONT_SIZE)}
          textAnchor="end"
        >
          {step.label}
        </text>
      )}
    </g>
  );
});

export const TransitionView = memo(function TransitionView({
  transition,
  signals,
}: {
  transition: Transition;
  /** Simulation: the signals of the receptivity that are true or inputs (see ExprText). */
  signals?: string;
}) {
  const { t } = useTranslation();
  const { x, y } = transition.position;
  const hit = transitionHitRect(transition);
  const text = transitionTextAnchor(transition);
  return (
    <g data-el="transition" data-id={transition.id}>
      <rect className="gm-hit" x={hit.x} y={hit.y} width={hit.width} height={hit.height} />
      <rect
        className="gm-fill"
        x={x - TRANSITION_WIDTH / 2}
        y={y - TRANSITION_THICKNESS / 2}
        width={TRANSITION_WIDTH}
        height={TRANSITION_THICKNESS}
      />
      {transition.number !== undefined && (
        <text
          className="gm-text gm-muted"
          x={x - TRANSITION_WIDTH / 2 - 6}
          y={baseline(y, FONT_SIZE)}
          textAnchor="end"
        >
          ({transition.number})
        </text>
      )}
      {transition.receptivity.trim() ? (
        <ExprText source={transition.receptivity} x={text.x} y={text.y} signals={signals} />
      ) : (
        // Not written yet: a quiet placeholder (the Problems list still reports it).
        <text className="gm-text gm-muted" x={text.x} y={baseline(text.y, FONT_SIZE)}>
          ?<title>{t('canvas.emptyReceptivity')}</title>
        </text>
      )}
    </g>
  );
});

export const ActionView = memo(function ActionView({
  action,
  x,
  y,
  width,
  height,
  first,
  on,
  live,
  conditionSignals,
}: {
  action: Action;
  x: number;
  y: number;
  width: number;
  height: number;
  first: boolean;
  /** Simulation: the continuous action is being executed. */
  on?: boolean;
  /** Simulation: current value of the variable it writes. */
  live?: string;
  /** Simulation: the signals of its condition or event that are true or inputs (see ExprText). */
  conditionSignals?: string;
}) {
  const textX = x + ACTION_PAD + (action.kind === 'forcing' ? 3 : 0);
  const cy = y + height / 2;
  const decor = actionDecor(action, { x, y, width, height });
  return (
    <g data-el="action" data-id={action.id}>
      {first && <path className="gm-line" d={`M${x - ACTION_GAP} ${cy}H${x}`} />}
      <rect
        className={on ? 'gm-box gm-box-on' : 'gm-box'}
        x={x}
        y={y}
        width={width}
        height={height}
      />
      {on && <path className="gm-on-mark" d={`M${x + width - 13} ${y + 9}l3 3l6 -6`} />}
      {live !== undefined && (
        <text className="gm-label gm-live" x={x + width - 4} y={y + height + 11} textAnchor="end">
          = {live}
        </text>
      )}
      {action.kind === 'forcing' && (
        <rect className="gm-thin" x={x + 3} y={y + 3} width={width - 6} height={height - 6} />
      )}
      <text className="gm-text" x={textX} y={baseline(cy, FONT_SIZE)}>
        {action.text}
      </text>
      {decor.stem && <path className="gm-thin" d={decor.stem} />}
      {decor.mark && <path className="gm-fill" d={decor.mark} />}
      {decor.text && (
        <ExprText
          source={decor.text.source}
          x={decor.text.x}
          y={decor.text.y}
          anchor={decor.text.anchor}
          signals={conditionSignals}
        />
      )}
    </g>
  );
});

export const CommentView = memo(function CommentView({ comment }: { comment: Comment }) {
  const r = commentRect(comment);
  const lines = comment.text.split('\n');
  return (
    <g data-el="comment" data-id={comment.id}>
      <rect className="gm-comment-box" x={r.x} y={r.y} width={r.width} height={r.height} rx={2} />
      <text className="gm-text">
        {lines.map((line, i) => (
          <tspan key={i} x={r.x + 8} y={r.y + 6 + LINE_HEIGHT * i + LINE_HEIGHT * 0.75}>
            {line || ' '}
          </tspan>
        ))}
      </text>
    </g>
  );
});

export const LinkView = memo(function LinkView({
  linkKey,
  d,
  arrowX,
  arrowY,
}: {
  linkKey: string;
  d: string;
  arrowX?: number;
  arrowY?: number;
}) {
  return (
    <g data-el="link" data-key={linkKey}>
      <path className="gm-hit-line" d={d} />
      <path className="gm-line" d={d} />
      {arrowX !== undefined && arrowY !== undefined && (
        <path
          className="gm-fill"
          d={`M${arrowX} ${arrowY - 6}L${arrowX - 4.5} ${arrowY + 3}L${arrowX + 4.5} ${arrowY + 3}Z`}
        />
      )}
    </g>
  );
});

export const BarView = memo(function BarView({
  x1,
  x2,
  y,
  stem,
}: {
  x1: number;
  x2: number;
  y: number;
  stem: string;
}) {
  const h = DOUBLE_BAR_GAP / 2;
  return (
    <g>
      <path className="gm-line" d={stem} />
      <path className="gm-line" d={`M${x1} ${y - h}H${x2}M${x1} ${y + h}H${x2}`} />
    </g>
  );
});

export const StubView = memo(function StubView({ d }: { d: string }) {
  return <path className="gm-line" d={d} />;
});
