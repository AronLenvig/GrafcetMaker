import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { setInput, useSim } from '../simulation/simStore';
import { getProject } from '../store/document';
import type { Viewport } from '../store/uiStore';
import { useInteraction } from './interactionStore';

type ValueEdit = NonNullable<ReturnType<typeof useInteraction.getState>['valueEdit']>;

function ValueField({ edit, viewport }: { edit: ValueEdit; viewport: Viewport }) {
  const { t } = useTranslation();
  const variable = Object.values(getProject().variables).find(
    (v) => v.name.toLowerCase() === edit.name,
  );
  const current = useSim.getState().snapshot?.values[edit.name];
  const [draft, setDraft] = useState(typeof current === 'number' ? String(current) : '');
  const done = useRef(false);
  const close = () => {
    done.current = true;
    if (useInteraction.getState().valueEdit === edit) useInteraction.setState({ valueEdit: null });
  };
  if (!variable) return null;
  const commit = () => {
    if (done.current) return;
    const n = Number(draft.trim());
    if (draft.trim() && Number.isFinite(n) && n !== current)
      void setInput(edit.name, variable.type === 'INT' ? Math.trunc(n) : n);
    close();
  };
  const back = (e: React.KeyboardEvent<HTMLInputElement>) =>
    e.currentTarget.closest<HTMLElement>('[data-canvas]')?.focus({ preventScroll: true });
  return (
    <input
      type="number"
      autoFocus
      value={draft}
      step={variable.type === 'REAL' ? 0.1 : variable.type === 'TIME' ? 100 : 1}
      aria-label={t('simulation.numeric', { name: variable.name, type: variable.type })}
      title={variable.type === 'TIME' ? 'ms' : undefined}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={(e) => e.currentTarget.select()}
      onBlur={commit}
      onKeyDown={(e) => {
        // Not the canvas's or the app's shortcuts (Escape would stop the simulation).
        e.stopPropagation();
        if (e.key === 'Enter') {
          commit();
          back(e);
        } else if (e.key === 'Escape') {
          close();
          back(e);
        }
      }}
      className="gm-input gm-input-sm gm-input-mono absolute z-10 w-24 -translate-x-1/2 -translate-y-1/2 text-right"
      style={{
        left: (edit.at.x - viewport.x) * viewport.zoom,
        top: (edit.at.y - viewport.y) * viewport.zoom,
      }}
    />
  );
}

/** Simulation: a numeric variable's value typed in place over the value shown on the diagram. */
export function SimValueEditor({ viewport }: { viewport: Viewport }) {
  const edit = useInteraction((s) => s.valueEdit);
  const on = useSim((s) => s.on);
  // Closed with the simulation it belongs to.
  useEffect(() => {
    if (!on) useInteraction.setState({ valueEdit: null });
  }, [on]);
  if (!edit || !on) return null;
  return (
    <ValueField key={`${edit.name}:${edit.at.x}:${edit.at.y}`} edit={edit} viewport={viewport} />
  );
}
