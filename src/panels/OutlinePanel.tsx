import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDownIcon, ChevronRightIcon } from '@/app/ui/icons';
import { cx } from '@/app/ui/primitives';
import { indexGrafcet } from '@/core/model/graph';
import type { Grafcet, Id } from '@/core/model/types';
import { editSelection, revealInGrafcet, setActiveGrafcet } from '@/editor/commands/edit';
import { useSim } from '@/editor/simulation/simStore';
import { useDoc } from '@/editor/store/document';
import { useUi } from '@/editor/store/uiStore';

interface Row {
  key: string;
  level: number;
  text: string;
  /** Element to select on the diagram, with its grafcet. */
  target: { gid: Id; id: Id | null };
  expandable: boolean;
  active?: boolean;
}

/** Steps in reading order: from the initial steps along the links, then any left over. */
function stepOrder(g: Grafcet): Id[] {
  const index = indexGrafcet(g);
  const byNumber = Object.values(g.steps).sort((a, b) => a.number - b.number);
  const seen = new Set<Id>();
  const queue = byNumber.filter((s) => s.kind === 'initial').map((s) => s.id);
  const out: Id[] = [];
  const visit = (id: Id) => {
    if (seen.has(id)) return;
    seen.add(id);
    out.push(id);
    for (const t of index.outgoing.get(id) ?? []) for (const n of t.to) queue.push(n);
  };
  while (queue.length) visit(queue.shift()!);
  for (const s of byNumber) visit(s.id);
  return out;
}

/**
 * The project as a tree (grafcets › steps › actions and transitions): an accessible alternative to
 * the diagram. Arrow keys move and fold (WAI-ARIA tree pattern), Enter shows the element on the
 * diagram, F2 edits it there.
 */
export function OutlinePanel() {
  const { t } = useTranslation();
  const project = useDoc((s) => s.project);
  const activeGid = useUi((s) => s.activeGrafcetId);
  const selection = useUi((s) => s.selection);
  const simActive = useSim((s) => (s.on && s.snapshot ? (s.shown ?? s.snapshot.active) : null));
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [cursor, setCursor] = useState<string | null>(null);

  const rows = useMemo(() => {
    const active = new Set(simActive ?? []);
    const out: Row[] = [];
    for (const gid of project.grafcetOrder) {
      const g = project.grafcets[gid];
      if (!g) continue;
      const gKey = `g:${gid}`;
      out.push({
        key: gKey,
        level: 1,
        text: t('outline.grafcet', { name: g.name, count: Object.keys(g.steps).length }),
        target: { gid, id: null },
        expandable: true,
      });
      if (collapsed.has(gKey)) continue;
      const index = indexGrafcet(g);
      const num = (id: Id) => g.steps[id]?.number ?? '?';
      for (const sid of stepOrder(g)) {
        const s = g.steps[sid]!;
        const sKey = `s:${sid}`;
        const actions = index.actions.get(sid) ?? [];
        const outs = index.outgoing.get(sid) ?? [];
        out.push({
          key: sKey,
          level: 2,
          text: [
            t('outline.step', { n: s.number }),
            s.kind !== 'normal' ? t(`outline.kinds.${s.kind}`) : '',
            s.label ?? '',
          ]
            .filter(Boolean)
            .join(' · '),
          target: { gid, id: sid },
          expandable: actions.length + outs.length > 0,
          active: active.has(sid),
        });
        if (collapsed.has(sKey)) continue;
        for (const a of actions)
          out.push({
            key: `a:${a.id}`,
            level: 3,
            text: `${t(`actionKinds.${a.kind}`)}: ${a.text}${a.condition ? ` (${t('outline.if', { condition: a.condition })})` : ''}`,
            target: { gid, id: a.id },
            expandable: false,
          });
        for (const tr of outs)
          out.push({
            key: `t:${tr.id}`,
            level: 3,
            text: t('outline.transition', {
              to: tr.to.map(num).join(', ') || '–',
              receptivity: tr.receptivity || '–',
            }),
            target: { gid, id: tr.id },
            expandable: false,
          });
      }
      // Unattached actions and source transitions (no step above) are listed under their grafcet.
      for (const a of Object.values(g.actions).filter((x) => x.stepId === null))
        out.push({
          key: `a:${a.id}`,
          level: 2,
          text: t('outline.unattached', { text: a.text || '–' }),
          target: { gid, id: a.id },
          expandable: false,
        });
      for (const tr of Object.values(g.transitions).filter((x) => !x.from.length))
        out.push({
          key: `t:${tr.id}`,
          level: 2,
          text: t('outline.source', { to: tr.to.map(num).join(', '), receptivity: tr.receptivity }),
          target: { gid, id: tr.id },
          expandable: false,
        });
    }
    return out;
  }, [project, collapsed, simActive, t]);

  const current =
    rows.find((r) => r.key === cursor) ?? rows.find((r) => r.target.gid === activeGid) ?? rows[0];
  const focusRow = (r: Row | undefined) => {
    if (!r) return;
    setCursor(r.key);
    document.getElementById(`outline-${r.key}`)?.focus();
  };
  const toggle = (key: string, open?: boolean) =>
    setCollapsed((c) => {
      const next = new Set(c);
      if (open ?? next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const show = (r: Row) => {
    if (r.target.id) revealInGrafcet(r.target.gid, [r.target.id]);
    else setActiveGrafcet(r.target.gid);
  };

  const onKeyDown = (e: React.KeyboardEvent, r: Row, i: number) => {
    const parent = () => {
      for (let j = i - 1; j >= 0; j--) if (rows[j]!.level < r.level) return rows[j];
      return undefined;
    };
    switch (e.key) {
      case 'ArrowDown':
        focusRow(rows[i + 1]);
        break;
      case 'ArrowUp':
        focusRow(rows[i - 1]);
        break;
      case 'Home':
        focusRow(rows[0]);
        break;
      case 'End':
        focusRow(rows[rows.length - 1]);
        break;
      case 'ArrowRight':
        if (r.expandable && collapsed.has(r.key)) toggle(r.key, true);
        else if (r.expandable) focusRow(rows[i + 1]);
        break;
      case 'ArrowLeft':
        if (r.expandable && !collapsed.has(r.key)) toggle(r.key, false);
        else focusRow(parent());
        break;
      case 'Enter':
      case ' ':
        show(r);
        break;
      case 'F2':
        if (!r.target.id) return;
        show(r);
        requestAnimationFrame(editSelection);
        break;
      default:
        return;
    }
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="h-full overflow-y-auto py-1">
      <p className="px-3 pt-2 pb-1 text-xs text-muted">{t('outline.hint')}</p>
      <ul role="tree" aria-label={t('outline.label')} className="flex flex-col">
        {rows.map((r, i) => {
          const selected = !!r.target.id && r.target.gid === activeGid && !!selection[r.target.id];
          const open = r.expandable && !collapsed.has(r.key);
          return (
            <li
              key={r.key}
              id={`outline-${r.key}`}
              role="treeitem"
              aria-level={r.level}
              aria-expanded={r.expandable ? open : undefined}
              aria-selected={selected}
              tabIndex={r === current ? 0 : -1}
              onFocus={() => setCursor(r.key)}
              onClick={() => {
                setCursor(r.key);
                show(r);
              }}
              onKeyDown={(e) => onKeyDown(e, r, i)}
              className={cx(
                'flex cursor-default items-center gap-1.5 py-1 pr-2 outline-none focus-visible:bg-accent-soft focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset',
                selected ? 'bg-accent-soft' : 'hover:bg-surface-2',
                r.level === 1 && 'font-semibold',
              )}
              style={{ paddingLeft: 8 + (r.level - 1) * 16 }}
            >
              <span
                aria-hidden="true"
                onClick={(e) => {
                  if (!r.expandable) return;
                  e.stopPropagation();
                  toggle(r.key);
                }}
                className="flex w-4 justify-center text-muted"
              >
                {r.expandable &&
                  (open ? <ChevronDownIcon size={13} /> : <ChevronRightIcon size={13} />)}
              </span>
              <span className={cx('min-w-0 truncate', r.level === 3 && 'font-mono text-xs')}>
                {r.text}
              </span>
              {r.active && (
                <span className="ml-auto shrink-0 rounded bg-success-soft px-1.5 text-[10px] font-semibold text-success">
                  {t('outline.active')}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
