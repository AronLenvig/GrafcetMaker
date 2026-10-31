// Diagram dimensions (grid 10). Positions are element centers unless noted.
export const GRID = 10;
export const STEP_SIZE = 40;
export const STEP_HALF = STEP_SIZE / 2;
export const INITIAL_INSET = 4;
export const TRANSITION_WIDTH = 24;
export const TRANSITION_THICKNESS = 3;
/** Step edge ↔ transition bar. */
export const STEP_TRANSITION_GAP = 40;
/** Step center ↔ transition center. */
export const ROW = STEP_HALF + STEP_TRANSITION_GAP;
/** Step center ↔ next step center in a sequence. */
export const PITCH = 2 * ROW;
export const ACTION_HEIGHT = 40;
export const ACTION_GAP = 20;
export const ACTION_PAD = 8;
export const ACTION_MIN_WIDTH = 60;
export const DOUBLE_BAR_GAP = 4;
/** Transition center ↔ AND double bar center. */
export const BAR_OFFSET = 20;
/** Step edge ↔ OR divergence/convergence line. */
export const OR_LINE_OFFSET = 10;
/** How far double bars extend beyond the outermost branch. */
export const BAR_OVERHANG = 10;
export const LOOP_DROP = 20;
export const LOOP_MARGIN = 30;
export const LOOP_LANE = 20;
export const STUB = 20;
/** Length of a jump arrow, from its transition (or into the step it leads to). */
export const JUMP_LENGTH = 30;

export const FONT_SIZE = 13;
export const STEP_FONT_SIZE = 14;
export const LABEL_FONT_SIZE = 11;
export const LINE_HEIGHT = 16;
/** Advance width of the bundled monospace font (JetBrains Mono), in em. */
export const CHAR_WIDTH_EM = 0.6;
