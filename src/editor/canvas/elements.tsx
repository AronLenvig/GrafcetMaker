import { memo } from 'react';
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
  commentRect,
  stepLabelAnchor,
  transitionHitRect,
  transitionTextAnchor,
} from '@/core/layout/geometry';
import type { Action, Comment, Step, Transition } from '@/core/model/types';
import { ExprText } from './ExprText';
import { baseline } from './svg';

export const StepView = memo(function StepView({ step }: { step: Step }) {
  const { x, y } = step.position;
  const r = STEP_HALF;
  const label = step.label ? stepLabelAnchor(step) : null;
  return (
    <g data-el="step" data-id={step.id}>
      <rect className="gm-box" x={x - r} y={y - r} width={2 * r} height={2 * r} />
      {step.kind === 'initial' && (
        <rect
          className="gm-thin"
          x={x - r + INITIAL_INSET}
          y={y - r + INITIAL_INSET}
          width={2 * (r - INITIAL_INSET)}
          height={2 * (r - INITIAL_INSET)}
        />
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
}: {
  transition: Transition;
}) {
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
      <ExprText source={transition.receptivity} x={text.x} y={text.y} />
    </g>
  );
});

const ARROW = 5;

function QualifierArrow({ x, y, h, up }: { x: number; y: number; h: number; up: boolean }) {
  const ax = x + 8;
  const top = y + 8;
  const bottom = y + h - 8;
  const tip = up ? top : bottom;
  const dir = up ? 1 : -1;
  return (
    <g>
      <path className="gm-thin" d={`M${ax} ${bottom}V${top}`} />
      <path
        className="gm-fill"
        d={`M${ax} ${tip}L${ax - ARROW / 1.4} ${tip + dir * ARROW}L${ax + ARROW / 1.4} ${tip + dir * ARROW}Z`}
      />
    </g>
  );
}

export const ActionView = memo(function ActionView({
  action,
  x,
  y,
  width,
  height,
  first,
}: {
  action: Action;
  x: number;
  y: number;
  width: number;
  height: number;
  first: boolean;
}) {
  const stored = action.kind === 'storedOnActivation' || action.kind === 'storedOnDeactivation';
  const textX = x + ACTION_PAD + (stored ? 14 : action.kind === 'forcing' ? 3 : 0);
  const cy = y + height / 2;
  return (
    <g data-el="action" data-id={action.id}>
      {first && <path className="gm-line" d={`M${x - ACTION_GAP} ${cy}H${x}`} />}
      <rect className="gm-box" x={x} y={y} width={width} height={height} />
      {action.kind === 'forcing' && (
        <rect className="gm-thin" x={x + 3} y={y + 3} width={width - 6} height={height - 6} />
      )}
      {stored && (
        <QualifierArrow x={x} y={y} h={height} up={action.kind === 'storedOnActivation'} />
      )}
      <text className="gm-text" x={textX} y={baseline(cy, FONT_SIZE)}>
        {action.text}
      </text>
      {action.condition !== undefined && action.condition !== '' && (
        <g>
          <path className="gm-thin" d={`M${x + 12} ${y}V${y - 10}`} />
          <ExprText source={action.condition} x={x + 16} y={y - 9} />
        </g>
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
