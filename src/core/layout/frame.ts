/**
 * The frame around a grafcet (IEC 60848 practice), shown on request in the editor and the exports:
 * a rectangle around everything the grafcet draws, its name at the bottom left and, for a
 * macro-step expansion or an enclosed grafcet, the step it belongs to at the top left.
 */
import type { Grafcet, Project } from '../model/types';
import { FONT_SIZE } from './constants';
import { stepReference, textWidth, type Rect } from './shapes';

/** What a frame says: the grafcet's identification and, at the top, the step it details. */
export interface FrameLabels {
  /** `M5` for the expansion of macro-step 5, `X4` for a grafcet enclosed by step 4. */
  topLeft?: string;
  /** The grafcet's name. */
  bottomLeft: string;
}

export interface FrameGeometry {
  rect: Rect;
  /** Labels, each starting at x and vertically centered on y (FONT_SIZE text). */
  texts: { text: string; x: number; y: number }[];
}

/** Room between the drawing and the frame, and the band a label takes inside it. */
const PAD = 20;
const LABEL_BAND = 24;
const LABEL_INSET = 8;

export function frameLabels(p: Pick<Project, 'grafcets'>, g: Grafcet): FrameLabels {
  if (g.kind !== 'partial')
    for (const other of Object.values(p.grafcets))
      for (const s of Object.values(other.steps))
        if (s.refGrafcetId === g.id) {
          if (g.kind === 'macroExpansion' && s.kind === 'macro')
            return { topLeft: stepReference(s), bottomLeft: g.name };
          if (g.kind === 'enclosed' && s.kind === 'enclosing')
            return { topLeft: `X${s.number}`, bottomLeft: g.name };
        }
  return { bottomLeft: g.name };
}

/** The frame around a drawing that covers `bounds`, with room for its labels. */
export function frameGeometry(bounds: Rect, labels: FrameLabels): FrameGeometry {
  const top = labels.topLeft ? LABEL_BAND : 0;
  const widest = Math.max(
    textWidth(labels.bottomLeft, FONT_SIZE),
    labels.topLeft ? textWidth(labels.topLeft, FONT_SIZE) : 0,
  );
  const rect = {
    x: bounds.x - PAD,
    y: bounds.y - PAD - top,
    width: Math.max(bounds.width + 2 * PAD, widest + 2 * LABEL_INSET),
    height: bounds.height + 2 * PAD + top + LABEL_BAND,
  };
  const texts = [
    ...(labels.topLeft
      ? [{ text: labels.topLeft, x: rect.x + LABEL_INSET, y: rect.y + LABEL_BAND / 2 }]
      : []),
    {
      text: labels.bottomLeft,
      x: rect.x + LABEL_INSET,
      y: rect.y + rect.height - LABEL_BAND / 2,
    },
  ];
  return { rect, texts };
}
