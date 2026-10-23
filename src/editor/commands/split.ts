/** Split view: two grafcets on screen at once; the focused pane is the active grafcet. */
import i18next from 'i18next';
import { toast } from '@/app/toasts';
import type { Id } from '@/core/model/types';
import { getProject } from '../store/document';
import { useUi, type SplitView } from '../store/uiStore';
import { fitToContent } from '../canvas/viewport';
import { setActiveGrafcet } from './edit';

/** After the panes are laid out (sizes measured), fit each grafcet into its pane. */
function fitPanes(): void {
  requestAnimationFrame(() => {
    const split = useUi.getState().split;
    if (split) for (const gid of split.panes) fitToContent(gid);
  });
}

/** Opens a second pane next to (columns) or below (rows) the canvas, or changes the orientation. */
export function openSplit(orientation: SplitView['orientation'], gid?: Id): void {
  const { split, activeGrafcetId: active } = useUi.getState();
  if (!active) return;
  if (split && !gid) {
    useUi.setState({ split: { ...split, orientation } });
    fitPanes();
    return;
  }
  const order = getProject().grafcetOrder;
  // By default the next grafcet in tab order.
  const other =
    gid && gid !== active
      ? gid
      : (order
          .slice(order.indexOf(active) + 1)
          .concat(order)
          .find((g) => g !== active) ?? null);
  if (!other) {
    toast(i18next.t('split.needTwo'), 'info', 5000);
    return;
  }
  useUi.setState({ split: { panes: [active, other], focus: 0, orientation } });
  fitPanes();
}

export function closeSplit(): void {
  const active = useUi.getState().activeGrafcetId;
  useUi.setState({ split: null });
  if (active) requestAnimationFrame(() => fitToContent(active));
}

/** Makes a pane's grafcet the active one. */
export function focusPane(pane: 0 | 1): void {
  const split = useUi.getState().split;
  if (!split || split.focus === pane) return;
  useUi.setState({ split: { ...split, focus: pane } });
  setActiveGrafcet(split.panes[pane]);
}

export function focusOtherPane(): void {
  const split = useUi.getState().split;
  if (split) focusPane(split.focus === 0 ? 1 : 0);
}

/** Shows another grafcet in a pane; choosing the other pane's grafcet swaps the two. */
export function setPaneGrafcet(pane: 0 | 1, gid: Id): void {
  const split = useUi.getState().split;
  if (!split) return;
  const panes: [Id, Id] = [...split.panes];
  if (panes[1 - pane] === gid) [panes[0], panes[1]] = [panes[1], panes[0]];
  else panes[pane] = gid;
  useUi.setState({ split: { ...split, panes } });
  setActiveGrafcet(panes[split.focus]);
  fitPanes();
}

export function swapPanes(): void {
  const split = useUi.getState().split;
  if (!split) return;
  useUi.setState({
    split: { ...split, panes: [split.panes[1], split.panes[0]], focus: split.focus === 0 ? 1 : 0 },
  });
}
