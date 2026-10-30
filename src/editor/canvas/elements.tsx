import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ACTION_GAP,
  ACTION_PAD,
  CHAR_WIDTH_EM,
  DOUBLE_BAR_GAP,
  FONT_SIZE,
  INITIAL_INSET,
  LABEL_FONT_SIZE,
  LINE_HEIGHT,
  STEP_FONT_SIZE,
  STEP_HALF,
  actionDecor,
  arrowPath,
  commentRect,
  stepLabelAnchor,
  transitionBar,
  transitionHitRect,
  transitionNumberAnchor,
  transitionTextAnchor,
  type JumpGeom,
} from '@/core/layout/geometry';
import type { Action, Comment, Step, Transition } from '@/core/model/types';
import type { EditField } from '../store/uiStore';
import { ExprText } from './ExprText';
import { baseline, pointsToPath } from './svg';

/**
 * `mark`: E / S for the entry and exit steps of a macro-step expansion; * for the steps an
 * enclosing step activates (drawn instead of the initial double square, as IEC 60848 does).
 */
export type StepMark = 'E' | 'S' | '*';

export const StepView = memo(function StepView({
  step,
  active,
  mark,
  editing,
}: {
  step: Step;
  /** Simulation: filled box plus a token dot, so activity never relies on color alone. */
  active?: boolean;
  mark?: StepMark;
  /** The field typed in place: the editor shows its text instead (also on the elements below). */
  editing?: EditField;
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
      {editing !== 'number' && (
        <text className="gm-step-number" x={x} y={baseline(y, STEP_FONT_SIZE)} textAnchor="middle">
          {step.number}
        </text>
      )}
      {label && editing !== 'label' && (
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
  values,
  editing,
}: {
  transition: Transition;
  /** Simulation: the signals of the receptivity that are true or inputs (see ExprText). */
  signals?: string;
  /** Simulation: the values of the numeric variables it reads (see ExprText). */
  values?: string;
  editing?: EditField;
}) {
  const { t } = useTranslation();
  const hit = transitionHitRect(transition);
  const bar = transitionBar(transition);
  const text = transitionTextAnchor(transition);
  const num = transitionNumberAnchor(transition);
  return (
    <g data-el="transition" data-id={transition.id}>
      {/* Behind the text: a click anywhere on the bar, number or receptivity selects it. */}
      <rect className="gm-hit" x={hit.x} y={hit.y} width={hit.width} height={hit.height} />
      <rect className="gm-fill" x={bar.x} y={bar.y} width={bar.width} height={bar.height} />
      {transition.number !== undefined && editing !== 'number' && (
        <text
          className="gm-text gm-muted"
          x={num.x}
          y={baseline(num.y, FONT_SIZE)}
          textAnchor="end"
        >
          ({transition.number})
        </text>
      )}
      {editing === 'receptivity' ? null : transition.receptivity.trim() ? (
        <ExprText
          source={transition.receptivity}
          x={text.x}
          y={text.y}
          signals={signals}
          values={values}
        />
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
  liveName,
  conditionSignals,
  conditionValues,
  editing,
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
  /** Simulation: the numeric variable it writes (lower case), whose value a click changes. */
  liveName?: string;
  /** Simulation: the signals of its condition or event that are true or inputs (see ExprText). */
  conditionSignals?: string;
  /** Simulation: the values of the numeric variables its condition reads (see ExprText). */
  conditionValues?: string;
  editing?: EditField;
}) {
  const { t } = useTranslation();
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
        <text
          className={liveName ? 'gm-label gm-live gm-live-edit' : 'gm-label gm-live'}
          x={x + width - 4}
          y={y + height + 11}
          textAnchor="end"
          data-value={liveName}
          data-x={
            liveName
              ? x + width - 4 - (([...live].length + 2) * LABEL_FONT_SIZE * CHAR_WIDTH_EM) / 2
              : undefined
          }
          data-y={liveName ? y + height + 7 : undefined}
        >
          {liveName && (
            <title>{t('simulation.editValue', { name: action.text.split(':=')[0]!.trim() })}</title>
          )}
          = {live}
        </text>
      )}
      {action.kind === 'forcing' && (
        <rect className="gm-thin" x={x + 3} y={y + 3} width={width - 6} height={height - 6} />
      )}
      {editing !== 'text' && (
        <text className="gm-text" x={textX} y={baseline(cy, FONT_SIZE)}>
          {action.text}
        </text>
      )}
      {decor.stem && <path className="gm-thin" d={decor.stem} />}
      {decor.mark && <path className="gm-fill" d={decor.mark} />}
      {decor.text && editing !== 'condition' && (
        <ExprText
          source={decor.text.source}
          x={decor.text.x}
          y={decor.text.y}
          anchor={decor.text.anchor}
          signals={conditionSignals}
          values={conditionValues}
        />
      )}
    </g>
  );
});

export const CommentView = memo(function CommentView({
  comment,
  editing,
}: {
  comment: Comment;
  editing?: EditField;
}) {
  const r = commentRect(comment);
  const lines = comment.text.split('\n');
  return (
    <g data-el="comment" data-id={comment.id}>
      <rect className="gm-comment-box" x={r.x} y={r.y} width={r.width} height={r.height} rx={2} />
      <text className="gm-text" visibility={editing ? 'hidden' : undefined}>
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
  arrow,
}: {
  linkKey: string;
  d: string;
  /** Path of its direction arrow (loops, links of right-to-left transitions). */
  arrow?: string;
}) {
  return (
    <g data-el="link" data-key={linkKey}>
      <path className="gm-hit-line" d={d} />
      <path className="gm-line" d={d} />
      {arrow && <path className="gm-fill" d={arrow} />}
    </g>
  );
});

/** An AND double bar with the stem to its transition: selected, moved and deleted as one. */
export const BarView = memo(function BarView({
  barKey,
  x1,
  x2,
  y,
  stem,
}: {
  barKey: string;
  x1: number;
  x2: number;
  y: number;
  stem: string;
}) {
  const h = DOUBLE_BAR_GAP / 2;
  return (
    <g data-el="bar" data-key={barKey}>
      <path className="gm-hit-line" d={`${stem}M${x1} ${y}H${x2}`} />
      <path className="gm-line" d={stem} />
      <path className="gm-line" d={`M${x1} ${y - h}H${x2}M${x1} ${y + h}H${x2}`} />
    </g>
  );
});

export const StubView = memo(function StubView({ d }: { d: string }) {
  return <path className="gm-line" d={d} />;
});

/**
 * A jump: the arrow under a transition marked with the step it leads to (part of the transition:
 * a click selects it, a double-click edits the step), or the arrow into a step reached only by
 * jumps, marked with the steps they come from.
 */
export const JumpView = memo(function JumpView({
  jump,
  editing,
}: {
  jump: JumpGeom;
  /** The step of the jump is being typed: the editor shows it instead. */
  editing?: boolean;
}) {
  const { t } = useTranslation();
  const d = pointsToPath(jump.points);
  const { label } = jump;
  return (
    <g
      data-el={jump.side === 'from' ? 'transition' : 'step'}
      data-id={jump.elementId}
      data-field={jump.side === 'from' ? 'jump' : undefined}
    >
      {label && (
        <title>
          {jump.side === 'from'
            ? t('canvas.jumpTo', { step: label.text })
            : t('canvas.jumpFrom', { steps: label.text })}
        </title>
      )}
      <path className="gm-hit-line" d={d} />
      <path className="gm-line" d={d} />
      <path className="gm-fill" d={arrowPath(jump.arrow, jump.arrow.dir)} />
      {label && !editing && (
        <text
          className="gm-text"
          x={label.x}
          y={baseline(label.y, FONT_SIZE)}
          textAnchor={label.anchor}
        >
          {label.text}
        </text>
      )}
    </g>
  );
});
