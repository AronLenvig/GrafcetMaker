import { useTranslation } from 'react-i18next';
import { MoreIcon } from '@/app/ui/icons';
import { IconMenu, MenuItem, MenuSeparator } from '@/app/ui/primitives';
import { runCommand } from '@/editor/commands/registry';
import { useUi } from '@/editor/store/uiStore';

/**
 * Import / export of the variable table (CSV and Excel), shared by the side panel and the table.
 * Runs the File › Variables commands, which load the spreadsheet code on first use.
 */
export function VariablesFileMenu() {
  const { t } = useTranslation();
  const locked = useUi((s) => s.mode === 'simulate');
  return (
    <IconMenu label={t('variables.more')} icon={<MoreIcon size={16} />}>
      <MenuItem disabled={locked} onSelect={() => runCommand('file.importVariables')}>
        {t('commands.file.importVariables')}
      </MenuItem>
      <MenuSeparator />
      <MenuItem onSelect={() => runCommand('file.exportVariablesXlsx')}>
        {t('commands.file.exportVariablesXlsx')}
      </MenuItem>
      <MenuItem onSelect={() => runCommand('file.exportVariablesCsv')}>
        {t('commands.file.exportVariablesCsv')}
      </MenuItem>
    </IconMenu>
  );
}
