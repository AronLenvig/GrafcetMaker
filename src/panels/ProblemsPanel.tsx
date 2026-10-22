import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Issue, Severity } from '@/core/validation/types';
import { AlertIcon, ErrorIcon, InfoIcon } from '@/app/ui/icons';
import { Button, cx } from '@/app/ui/primitives';
import { useDoc } from '@/editor/store/document';
import {
  applyQuickFix,
  issueLocation,
  issueMessage,
  revealIssue,
} from '@/editor/validation/actions';
import { useProblems } from '@/editor/validation/problems';
import { tDynamic } from '@/i18n/dynamic';

const TONE: Record<Severity, string> = {
  error: 'text-danger',
  warning: 'text-warning',
  info: 'text-info',
};

/** Severity shown by shape and color (never color alone), with an accessible name. */
export function SeverityIcon({ severity, size = 15 }: { severity: Severity; size?: number }) {
  const { t } = useTranslation();
  const Icon = severity === 'error' ? ErrorIcon : severity === 'warning' ? AlertIcon : InfoIcon;
  return (
    <span
      role="img"
      aria-label={t(`problems.severity.${severity}`)}
      className={cx('inline-flex shrink-0', TONE[severity])}
    >
      <Icon size={size} />
    </span>
  );
}

export function QuickFixButton({ issue }: { issue: Issue }) {
  const { t } = useTranslation();
  if (!issue.quickFix) return null;
  const key = issue.ruleId === 'nonExclusiveOr' ? 'prioritize' : issue.quickFix.kind;
  return (
    <Button size="sm" onClick={() => applyQuickFix(issue.quickFix!)}>
      {tDynamic(t, `problems.fixes.${key}`, { ...issue.params, ...issue.quickFix })}
    </Button>
  );
}

function IssueRow({ issue }: { issue: Issue }) {
  const { t } = useTranslation();
  const project = useDoc((s) => s.project);
  return (
    <li className="flex items-start gap-2 border-b border-border px-2 py-1.5 hover:bg-surface-2">
      <button
        type="button"
        onClick={() => revealIssue(issue)}
        className="flex min-w-0 flex-1 items-start gap-2 text-left"
      >
        <SeverityIcon severity={issue.severity} />
        <span className="min-w-0">
          <span className="block">{issueMessage(t, issue)}</span>
          <span className="block truncate text-xs text-muted">
            {issueLocation(t, project, issue)}
            {issue.field && issue.params.source ? ` — ${issue.params.source}` : ''}
          </span>
        </span>
      </button>
      <QuickFixButton issue={issue} />
    </li>
  );
}

/** All validation problems, grouped by grafcet; click one to jump to it. */
export function ProblemsPanel() {
  const { t } = useTranslation();
  const issues = useProblems((s) => s.issues);
  const counts = useProblems((s) => s.counts);
  const order = useDoc((s) => s.project.grafcetOrder);
  const grafcets = useDoc((s) => s.project.grafcets);
  const [show, setShow] = useState<Record<Severity, boolean>>({
    error: true,
    warning: true,
    info: true,
  });

  const groups = useMemo(() => {
    const visible = issues.filter((i) => show[i.severity]);
    const map = new Map<string, Issue[]>();
    for (const i of visible) {
      const key = i.grafcetId ?? '';
      map.set(key, [...(map.get(key) ?? []), i]);
    }
    const keys = [...order.filter((id) => map.has(id)), ...(map.has('') ? [''] : [])];
    return keys.map((k) => ({
      key: k,
      title: k ? (grafcets[k]?.name ?? '') : t('problems.location.project'),
      issues: map.get(k)!,
    }));
  }, [issues, show, order, grafcets, t]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
        {(['error', 'warning', 'info'] as const).map((sev) => (
          <button
            key={sev}
            type="button"
            aria-pressed={show[sev]}
            onClick={() => setShow((s) => ({ ...s, [sev]: !s[sev] }))}
            className={cx(
              'flex h-7 items-center gap-1.5 rounded-md border px-2',
              show[sev]
                ? 'border-border bg-surface-2'
                : 'border-transparent text-muted line-through',
            )}
          >
            <SeverityIcon severity={sev} size={14} />
            {t(`problems.counts.${sev}`, { count: counts[sev] })}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {groups.length === 0 ? (
          <p className="p-4 text-muted">
            {issues.length ? t('problems.allHidden') : t('problems.none')}
          </p>
        ) : (
          groups.map((g) => (
            <section key={g.key} aria-label={g.title}>
              <h3 className="sticky top-0 z-10 bg-surface px-2 py-1 font-mono text-xs font-semibold text-muted">
                {g.title}
              </h3>
              <ul>
                {g.issues.map((i, n) => (
                  <IssueRow key={`${i.ruleId}:${i.elementIds.join(',')}:${n}`} issue={i} />
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
