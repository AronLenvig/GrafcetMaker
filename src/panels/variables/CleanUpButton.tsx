import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BroomIcon } from '@/app/ui/icons';
import { IconButton } from '@/app/ui/primitives';
import { unusedVariables } from '@/core/model/variables';
import { runCommand } from '@/editor/commands/registry';
import { useDoc } from '@/editor/store/document';
import { useUi } from '@/editor/store/uiStore';

/**
 * Removes the variables nothing uses (one undo step), shared by the side panel and the table.
 * Shows how many there are; disabled when there are none, and while simulating.
 */
export function CleanUpButton({ usage }: { usage: Map<string, number> }) {
  const { t } = useTranslation();
  const variables = useDoc((s) => s.project.variables);
  const scenarios = useDoc((s) => s.project.scenarios);
  const locked = useUi((s) => s.mode === 'simulate');
  const count = useMemo(
    () => unusedVariables({ variables, scenarios }, usage).length,
    [variables, scenarios, usage],
  );
  const label = count ? t('variables.removeUnused', { count }) : t('variables.noneUnused');
  return (
    <IconButton
      label={label}
      title={label}
      disabled={locked || !count}
      className="relative"
      onClick={() => runCommand('edit.removeUnusedVariables')}
    >
      <BroomIcon size={16} />
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-0.5 -right-0.5 min-w-4 rounded-full bg-surface-3 px-1 text-[10px] leading-4 text-text tabular-nums"
        >
          {count}
        </span>
      )}
    </IconButton>
  );
}
